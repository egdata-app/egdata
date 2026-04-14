import { isServer, QueryClient } from "@tanstack/react-query";
import { persistQueryClient } from "@tanstack/react-query-persist-client";
import { createIndexedDBPersister } from "./persister";

let browserQueryClient: QueryClient | undefined = undefined;

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // With SSR, we usually want to set some default staleTime
        // above 0 to avoid refetching immediately on the client
        staleTime: 60 * 1000,
        gcTime: 1000 * 60 * 60 * 24, // Keep in cache for 24 hours
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
