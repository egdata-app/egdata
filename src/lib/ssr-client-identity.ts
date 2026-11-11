import { createIsomorphicFn } from "@tanstack/react-start";

/** Read inside each API call, never when constructing the shared HTTP client. */
export const readSsrClientIdentity = createIsomorphicFn()
  .server(async (): Promise<Record<string, string>> => {
    const { getRequestHeaders } = await import("./start-server.ts");
    const { cloudflareClientIdentity } = await import("./ssr-client-identity.server.ts");
    try {
      return cloudflareClientIdentity(getRequestHeaders());
    } catch {
      // Background work has no visitor context and retains anonymous limits.
      return {};
    }
  })
  .client(async (): Promise<Record<string, string>> => ({}));
