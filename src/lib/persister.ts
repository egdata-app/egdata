import { get, set, del } from "idb-keyval";
import type { Persister, PersistedClient } from "@tanstack/react-query-persist-client";

/**
 * Creates an IndexedDB persister for TanStack Query using idb-keyval.
 * This is the recommended approach for performance and reliability.
 */
export function createIndexedDBPersister(idbKey: string = "reactQuery"): Persister {
  return {
    persistClient: async (client: PersistedClient) => {
      await set(idbKey, client);
    },
    restoreClient: async () => {
      return await get<PersistedClient>(idbKey);
    },
    removeClient: async () => {
      await del(idbKey);
    },
  };
}
