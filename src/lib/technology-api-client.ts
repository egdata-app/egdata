import { z } from "zod";
import { technologyResponseSchema, type TechnologyResponse } from "@/types/technology-profile";

const DEFAULT_TECHNOLOGY_API_ENDPOINT = "https://technologies-api.egdata.app";

const apiErrorSchema = z
  .object({
    error: z.string(),
  })
  .passthrough();

export class TechnologyApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string) {
    super(`Technology API request failed with status ${status}: ${code}`);
    this.name = "TechnologyApiError";
    this.status = status;
    this.code = code;
  }
}

export function getTechnologyApiEndpoint(): string {
  const endpoint = import.meta.env.SSR
    ? (process.env.TECHNOLOGY_API_ENDPOINT ?? DEFAULT_TECHNOLOGY_API_ENDPOINT)
    : (import.meta.env.VITE_TECHNOLOGY_API_ENDPOINT ?? DEFAULT_TECHNOLOGY_API_ENDPOINT);
  return endpoint.replace(/\/$/u, "");
}

export async function getTechnologyProfile(
  id: string,
  signal?: AbortSignal,
): Promise<TechnologyResponse> {
  const headers = new Headers({ Accept: "application/json" });
  if (import.meta.env.SSR) headers.set("User-Agent", "egdata-web-client/1.0.0");

  const response = await fetch(
    `${getTechnologyApiEndpoint()}/v1/technologies/${encodeURIComponent(id)}`,
    {
      method: "GET",
      headers,
      credentials: "omit",
      signal,
    },
  );

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new TechnologyApiError(response.status, "invalid_response");
  }

  const parsedResponse = technologyResponseSchema.safeParse(payload);
  if (parsedResponse.success) {
    const statusMatches =
      ((parsedResponse.data.status === "ready" || parsedResponse.data.status === "unresolved") &&
        response.status === 200) ||
      (parsedResponse.data.status === "pending" && response.status === 202) ||
      (parsedResponse.data.status === "failed" && response.status === 503);

    if (!statusMatches) throw new TechnologyApiError(response.status, "invalid_status_contract");
    return parsedResponse.data;
  }

  const parsedError = apiErrorSchema.safeParse(payload);
  throw new TechnologyApiError(
    response.status,
    parsedError.success ? parsedError.data.error : "invalid_response",
  );
}
