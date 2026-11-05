import { httpClient } from "@/lib/http-client";
import { Kind, print, type DocumentNode } from "graphql";

/**
 * GraphQL transport for the egdata API.
 *
 * Documents are sent as Automatic Persisted Queries (APQ) over HTTP GET so a
 * CDN can cache them per query hash and variables instead of per POST body.
 * The first request for a document is answered with `PERSISTED_QUERY_NOT_FOUND`,
 * which is then registered with a POST carrying the full document. Everything
 * falls back to a plain POST when the server - or the environment - cannot
 * handle persisted GET requests.
 */

type GraphQLVariables = Record<string, unknown>;

export type GraphQLResponseError = {
  message?: string;
  path?: ReadonlyArray<string | number>;
  extensions?: {
    code?: string;
    [key: string]: unknown;
  };
};

type GraphQLResponse<TData> = {
  data?: TData | null;
  errors?: GraphQLResponseError[];
};

type PreparedDocument = {
  query: string;
  sha256Hash: string;
  operationName?: string;
};

export type GraphQLRequestOptions = {
  signal?: AbortSignal;
  /**
   * Always use POST. Mutations and authenticated reads must not be served from
   * a shared cache, so they opt out of the GET/APQ path.
   */
  preferPost?: boolean;
};

const GRAPHQL_ENDPOINT = "/graphql";
const PERSISTED_QUERY_VERSION = 1;
/** Browsers and proxies cap request line length; longer GETs fall back to POST. */
const MAX_GET_URL_LENGTH = 6_000;
const GET_HEADERS = { "apollo-require-preflight": "true" };
const JSON_HEADERS = { "content-type": "application/json" };

const PERSISTED_QUERY_NOT_FOUND = "PERSISTED_QUERY_NOT_FOUND";
const PERSISTED_QUERY_NOT_SUPPORTED = "PERSISTED_QUERY_NOT_SUPPORTED";

export class GraphQLRequestError extends Error {
  readonly errors: GraphQLResponseError[];

  constructor(errors: GraphQLResponseError[]) {
    const message = errors
      .map((error) => error.message)
      .filter(Boolean)
      .join("\n");

    super(message || "GraphQL request failed");
    this.name = "GraphQLRequestError";
    this.errors = errors;
  }
}

const preparedDocuments = new WeakMap<DocumentNode, Promise<PreparedDocument>>();

// Both flags are per-process heuristics: once the server rejects GET requests
// or persisted queries we stop paying for the failed round trip.
let getRequestsSupported = true;
let persistedQueriesSupported = true;

export async function graphqlRequest<TData, TVariables extends GraphQLVariables = GraphQLVariables>(
  document: DocumentNode,
  variables?: TVariables,
  options: GraphQLRequestOptions = {},
): Promise<TData> {
  const prepared = options.preferPost ? null : await prepareDocument(document).catch(() => null);

  if (prepared && getRequestsSupported && persistedQueriesSupported) {
    const params = buildGetParams(prepared, variables);

    if (estimateUrlLength(params) <= MAX_GET_URL_LENGTH) {
      const attempt = await attemptGet<TData>(params, options.signal);

      if (attempt.kind === "data") {
        return attempt.data;
      }

      if (attempt.kind === "not-found") {
        return registerPersistedQuery<TData>(prepared, variables, options.signal);
      }
    }
  }

  return executePost<TData>(
    prepared?.query ?? print(document),
    prepared,
    variables,
    options.signal,
  );
}

async function attemptGet<TData>(
  params: Record<string, string>,
  signal?: AbortSignal,
): Promise<{ kind: "data"; data: TData } | { kind: "not-found" } | { kind: "unsupported" }> {
  let response: GraphQLResponse<TData>;

  try {
    response = await httpClient.get<GraphQLResponse<TData>>(GRAPHQL_ENDPOINT, {
      params,
      headers: GET_HEADERS,
      signal,
    });
  } catch (error) {
    const failure = classifyGetFailure(error);

    if (failure === "method") {
      getRequestsSupported = false;
      return { kind: "unsupported" };
    }

    if (failure === "persisted-query") {
      persistedQueriesSupported = false;
      return { kind: "unsupported" };
    }

    throw error;
  }

  if (hasErrorCode(response, PERSISTED_QUERY_NOT_SUPPORTED)) {
    persistedQueriesSupported = false;
    return { kind: "unsupported" };
  }

  if (hasErrorCode(response, PERSISTED_QUERY_NOT_FOUND)) {
    return { kind: "not-found" };
  }

  return { kind: "data", data: unwrapResponse(response) };
}

async function registerPersistedQuery<TData>(
  prepared: PreparedDocument,
  variables: GraphQLVariables | undefined,
  signal?: AbortSignal,
): Promise<TData> {
  const response = await httpClient.post<GraphQLResponse<TData>>(
    GRAPHQL_ENDPOINT,
    {
      query: prepared.query,
      ...(prepared.operationName ? { operationName: prepared.operationName } : {}),
      variables: variables ?? {},
      extensions: {
        persistedQuery: {
          version: PERSISTED_QUERY_VERSION,
          sha256Hash: prepared.sha256Hash,
        },
      },
    },
    { headers: JSON_HEADERS, signal },
  );

  return unwrapResponse(response);
}

async function executePost<TData>(
  query: string,
  prepared: PreparedDocument | null,
  variables: GraphQLVariables | undefined,
  signal?: AbortSignal,
): Promise<TData> {
  const response = await httpClient.post<GraphQLResponse<TData>>(
    GRAPHQL_ENDPOINT,
    {
      query,
      ...(prepared?.operationName ? { operationName: prepared.operationName } : {}),
      variables: variables ?? {},
    },
    { headers: JSON_HEADERS, signal },
  );

  return unwrapResponse(response);
}

function unwrapResponse<TData>(response: GraphQLResponse<TData>): TData {
  if (response.errors?.length) {
    throw new GraphQLRequestError(response.errors);
  }

  if (response.data == null) {
    throw new GraphQLRequestError([{ message: "GraphQL response did not include any data" }]);
  }

  return response.data;
}

function hasErrorCode(response: GraphQLResponse<unknown>, code: string): boolean {
  return response.errors?.some((error) => error.extensions?.code === code) ?? false;
}

/**
 * Tells apart HTTP failures that mean "stop using GET/APQ" from real errors.
 */
function classifyGetFailure(error: unknown): "method" | "persisted-query" | null {
  const status = (error as { status?: number }).status;

  if (status === 405 || status === 431 || status === 501) {
    return "method";
  }

  if (status !== 400) {
    return null;
  }

  const body = (error as { response?: GraphQLResponse<unknown> }).response;
  const message = body?.errors?.[0]?.message ?? "";

  if (/cross-site request forgery|preflight/i.test(message)) {
    return "method";
  }

  if (/must provide (a )?query/i.test(message)) {
    return "persisted-query";
  }

  return null;
}

function buildGetParams(
  prepared: PreparedDocument,
  variables: GraphQLVariables | undefined,
): Record<string, string> {
  const params: Record<string, string> = {
    variables: JSON.stringify(variables ?? {}),
    extensions: JSON.stringify({
      persistedQuery: {
        version: PERSISTED_QUERY_VERSION,
        sha256Hash: prepared.sha256Hash,
      },
    }),
  };

  if (prepared.operationName) {
    params.operationName = prepared.operationName;
  }

  return params;
}

function estimateUrlLength(params: Record<string, string>): number {
  return GRAPHQL_ENDPOINT.length + 1 + new URLSearchParams(params).toString().length;
}

function prepareDocument(document: DocumentNode): Promise<PreparedDocument> {
  const cached = preparedDocuments.get(document);
  if (cached) {
    return cached;
  }

  const prepared = createPreparedDocument(document);
  preparedDocuments.set(document, prepared);

  return prepared;
}

async function createPreparedDocument(document: DocumentNode): Promise<PreparedDocument> {
  const query = print(document);

  return {
    query,
    sha256Hash: await sha256Hex(query),
    operationName: getOperationName(document),
  };
}

function getOperationName(document: DocumentNode): string | undefined {
  for (const definition of document.definitions) {
    if (definition.kind === Kind.OPERATION_DEFINITION) {
      return definition.name?.value;
    }
  }

  return undefined;
}

async function sha256Hex(value: string): Promise<string> {
  const subtle = globalThis.crypto?.subtle;

  if (!subtle) {
    throw new Error("SHA-256 hashing is unavailable in this environment");
  }

  const digest = await subtle.digest("SHA-256", new TextEncoder().encode(value));

  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
