/**
 * GraphQL requests reach the tests in two shapes:
 *
 * - `POST /graphql` with a JSON body holding `query` and `variables`
 * - `GET /graphql?...` with a persisted query hash, `operationName` and
 *   `variables` in the query string
 *
 * The fixtures match on the operation, so this normalizes both transports into
 * the same payload shape. `query` is only present for non-persisted requests.
 */

/**
 * Playwright globs only match the URL as a whole, so a trailing `**` is needed
 * for persisted GET requests whose query string follows `/graphql`.
 */
export const GRAPHQL_ROUTE_PATTERN = "**/graphql**";

function parseJson(value) {
  if (!value) return null;

  const text = typeof value === "string" ? value : value.toString("utf8");

  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export function readGraphQLPayload(url, body) {
  const payload = parseJson(body);

  if (payload) {
    return payload;
  }

  if (url.pathname !== "/graphql") {
    return null;
  }

  const query = url.searchParams.get("query");
  const extensions = url.searchParams.get("extensions");

  if (!query && !extensions) {
    return null;
  }

  return {
    query: query ?? undefined,
    operationName: url.searchParams.get("operationName") ?? undefined,
    variables: parseJson(url.searchParams.get("variables")) ?? {},
    extensions: parseJson(extensions) ?? undefined,
  };
}
