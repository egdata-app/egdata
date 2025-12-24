import type { QueryClient, DehydratedState, QueryKey } from "@tanstack/react-query";

// Helper function to generate a stable hash for the query key
function stableHash(queryKey: QueryKey): string {
  if (Array.isArray(queryKey)) {
    return JSON.stringify(
      queryKey.map((item) =>
        typeof item === "object" && item !== null ? sortObjectKeys(item) : item,
      ),
    );
  }
  return JSON.stringify(
    typeof queryKey === "object" && queryKey !== null ? sortObjectKeys(queryKey) : queryKey,
  );
}

// Recursive function to sort object keys
// biome-ignore lint/suspicious/noExplicitAny: it needs to be any
function sortObjectKeys(obj: Record<string, any>): Record<string, any> {
  return Object.keys(obj)
    .sort()
    .reduce(
      (result, key) => {
        result[key] =
          typeof obj[key] === "object" && obj[key] !== null ? sortObjectKeys(obj[key]) : obj[key];
        return result;
      },
      // biome-ignore lint/suspicious/noExplicitAny: it needs to be any
      {} as Record<string, any>,
    );
}

export function getFetchedQuery<T>(
  queryClient: QueryClient,
  state: DehydratedState,
  queryKey: QueryKey,
): T | null {
  const query = queryClient.getQueryData<T>(queryKey);
  if (query) return query;

  const queryKeyHash = stableHash(queryKey);
  const dehydratedQuery = state.queries.find((query) => query.queryHash === queryKeyHash);
  if (!dehydratedQuery) {
    return null;
  }

  return dehydratedQuery.state.data as T;
}
