import { type ReactNode, useRef, useState, useEffect, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { ExtensionContext } from "@/contexts/extension";
import consola from "consola";
import { getOwnedStatus, writeOwnedStatusToDb } from "@/utils/ownedOffersDb";

const EXTENSION_ID = "komddphicdeokllfmcndcaeiegglbgok";
const isClient = typeof window !== "undefined" && typeof window.chrome !== "undefined";

type IdNamespace = { id: string; namespace: string };
type OwnedStatusMap = Record<string, boolean | undefined>;

export type ExtensionContextType = {
  ids: IdNamespace[];
  addId: (id: string, namespace: string) => void;
  removeId: (id: string, namespace: string) => void;
  clearIds: () => void;
  isOwned: (id: string, namespace: string) => boolean;
  ownedStatus: OwnedStatusMap;
};

function getKey(id: string, namespace: string) {
  return `${id}:${namespace}`;
}

export function ExtensionProvider({ children }: { children: ReactNode }) {
  // SSR fallback: no-op context
  if (!isClient) {
    return (
      <ExtensionContext.Provider
        value={
          {
            ids: [],
            addId: () => {},
            removeId: () => {},
            clearIds: () => {},
            isOwned: () => false,
            ownedStatus: {},
          } as ExtensionContextType
        }
      >
        {children}
      </ExtensionContext.Provider>
    );
  }

  // Client-side state
  const [ids, setIds] = useState<IdNamespace[]>([]);
  const ownedStatusRef = useRef<OwnedStatusMap>({});
  const [ownedStatus, setOwnedStatus] = useState<OwnedStatusMap>({});
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Add/remove/clear ID helpers
  const addId = useCallback((id: string, namespace: string) => {
    consola.verbose("addId", id, namespace);
    setIds((prev) => {
      if (prev.some((item) => item.id === id && item.namespace === namespace)) return prev;
      return [...prev, { id, namespace }];
    });
  }, []);

  const removeId = useCallback((id: string, namespace: string) => {
    consola.verbose("removeId", id, namespace);
    setIds((prev) => prev.filter((item) => !(item.id === id && item.namespace === namespace)));
  }, []);

  const clearIds = useCallback(() => {
    setIds([]);
  }, []);

  // TanStack mutation for batch fetching
  const mutation = useMutation({
    mutationFn: async (ids: IdNamespace[]) => {
      const keys = ids.map(({ id, namespace }) => getKey(id, namespace));
      const cached = await getOwnedStatus(keys);
      const missing = ids.filter(
        ({ id, namespace }) => cached[getKey(id, namespace)] === undefined,
      );
      const fetched: OwnedStatusMap = {};
      if (missing.length > 0) {
        await new Promise<void>((resolve, reject) => {
          const chrome = window.chrome as typeof chrome;
          if (chrome) {
            consola.verbose("sending message to extension", missing);
            chrome.runtime.sendMessage(
              EXTENSION_ID,
              { action: "getOwnedOffers", payload: { offers: missing } },
              (response: { ownedOffers: { id: string; namespace: string }[] }) => {
                if (chrome.runtime.lastError) {
                  consola.error("getOwnedOffers", chrome.runtime.lastError);
                  reject(chrome.runtime.lastError);
                } else {
                  consola.info("received response from extension", response);
                  const ownedOffers = response.ownedOffers.map((offer) =>
                    getKey(offer.id, offer.namespace),
                  );
                  const allKeys = missing.map(({ id, namespace }) => getKey(id, namespace));
                  for (const key of allKeys) {
                    fetched[key] = ownedOffers.includes(key);
                  }
                  resolve();
                }
              },
            );
          } else {
            resolve();
          }
        });
        // Only pass defined values
        const filteredFetched = Object.fromEntries(
          Object.entries(fetched).filter(([, v]) => v !== undefined),
        ) as Record<string, boolean>;
        await writeOwnedStatusToDb(filteredFetched);
      }
      // Merge cached and fetched
      return { ...cached, ...fetched };
    },
    onSuccess: (data) => {
      ownedStatusRef.current = { ...ownedStatusRef.current, ...data };
      setOwnedStatus({ ...ownedStatusRef.current });
      // Persist merged owned status to DB
      const filtered = Object.fromEntries(
        Object.entries(ownedStatusRef.current).filter(([, v]) => v !== undefined),
      ) as Record<string, boolean>;
      writeOwnedStatusToDb(filtered);
    },
  });

  // Debounce batch fetch when ids change
  useEffect(() => {
    if (ids.length === 0) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      mutation.mutate(ids);
    }, 100);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [ids, mutation.mutate]);

  // isOwned helper (always returns boolean)
  const isOwned = useCallback(
    (id: string, namespace: string) => {
      return !!ownedStatus[getKey(id, namespace)];
    },
    [ownedStatus],
  );

  return (
    <ExtensionContext.Provider
      value={
        {
          ids,
          addId,
          removeId,
          clearIds,
          isOwned,
          ownedStatus,
        } as ExtensionContextType
      }
    >
      {children}
    </ExtensionContext.Provider>
  );
}
