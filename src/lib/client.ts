import { isServer, QueryClient } from "@tanstack/react-query";
import { persistQueryClient } from "@tanstack/react-query-persist-client";
import { createIndexedDBPersister } from "./persister";

// Convert stray promise rejections into explicit logs so they can be GC'd.
// Without this, Node retains references to rejection reasons (including axios
// error objects with full response bodies) until process exit, driving OOM.
if (isServer && typeof process !== "undefined" && !(process as unknown as { __egdataHandlersInstalled?: boolean }).__egdataHandlersInstalled) {
  (process as unknown as { __egdataHandlersInstalled: boolean }).__egdataHandlersInstalled = true;
  process.on("unhandledRejection", (reason) => {
    const status = (reason as { status?: number } | null)?.status;
    console.error(`[unhandledRejection] status=${status ?? "n/a"}`, reason);
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // With SSR, we usually want to set some default staleTime
        // above 0 to avoid refetching immediately on the client
        staleTime: 60 * 1000,
        // SSR query clients are throwaway per request — short gcTime keeps
        // erroring/aborted entries from piling up under upstream flakiness.
        gcTime: isServer ? 60 * 1000 : 1000 * 60 * 60 * 24,
      },
    },
  });
}

function getQueryClient() {
  if (isServer) {
    // Server: always make a new query client
    return makeQueryClient();
  }

  // Browser: make a new query client if we don't already have one
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();

    // Initialize persistence
    const persister = createIndexedDBPersister();
    persistQueryClient({
      queryClient: browserQueryClient,
      persister,
      maxAge: 1000 * 60 * 60 * 24, // 24 hours
    });
  }
  return browserQueryClient;
}

export { getQueryClient };
