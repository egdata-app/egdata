import { openDB } from "idb";

const DB_NAME = "owned-offers-db";
const STORE_NAME = "offers";

const FALSE_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes
const TRUE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

type OfferCacheValue = { value: boolean; timestamp: number };

export async function getDb() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      db.createObjectStore(STORE_NAME);
    },
  });
}

export async function getOwnedStatus(keys: string[]) {
  const db = await getDb();
  const tx = db.transaction(STORE_NAME, "readonly");
  const store = tx.objectStore(STORE_NAME);
  const results: Record<string, boolean | undefined> = {};
  const now = Date.now();
  await Promise.all(
    keys.map(async (key) => {
      const entry = (await store.get(key)) as OfferCacheValue | boolean | undefined;
      if (entry && typeof entry === "object" && "value" in entry && "timestamp" in entry) {
        const expiry = entry.value ? TRUE_EXPIRY_MS : FALSE_EXPIRY_MS;
        if (now - entry.timestamp < expiry) {
          results[key] = entry.value;
        } else {
          results[key] = undefined;
          await db.delete(STORE_NAME, key);
        }
      } else if (entry !== undefined) {
        results[key] = undefined;
        await db.delete(STORE_NAME, key);
      } else {
        results[key] = undefined;
      }
    }),
  );
  return results;
}

export async function writeOwnedStatusToDb(statusMap: Record<string, boolean>) {
  const db = await getDb();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  const now = Date.now();
  await Promise.all(
    Object.entries(statusMap).map(([key, value]) => store.put({ value, timestamp: now }, key)),
  );
  await tx.done;
}
