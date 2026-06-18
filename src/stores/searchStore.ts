import { Store } from "@tanstack/react-store";
import { offerTypeValues } from "@/lib/offers-dictionary";
import { z } from "zod";

export const formSchema = z.object({
  title: z.string().optional(),
  tags: z
    .preprocess((v) => (v == null || Array.isArray(v) ? v : [String(v)]), z.array(z.string()))
    .optional(),
  developerDisplayName: z
    .string()
    .nullish()
    .catch(undefined)
    .transform((v) => v ?? undefined),
  publisherDisplayName: z
    .string()
    .nullish()
    .catch(undefined)
    .transform((v) => v ?? undefined),
  offerType: z.enum(offerTypeValues).optional(),
  onSale: z.boolean().optional(),
  isCodeRedemptionOnly: z.boolean().optional(),
  excludeBlockchain: z.boolean().optional(),
  pastGiveaways: z.boolean().optional(),
  seller: z.string().optional(),
  price: z
    .object({
      min: z.number(),
      max: z.number(),
    })
    .optional(),
  sortBy: z
    .enum([
      "releaseDate",
      "lastModifiedDate",
      "effectiveDate",
      "creationDate",
      "viewableDate",
      "pcReleaseDate",
      "upcoming",
      "price",
      "discount",
      "discountPercent",
      "giveawayDate",
    ])
    .optional(),
  sortDir: z.enum(["asc", "desc"]).optional(),
  page: z.number().optional(),
  limit: z.number().optional(),
  isLowestPrice: z.boolean().optional(),
  isLowestPriceEver: z.boolean().optional(),
});

export type SearchState = z.infer<typeof formSchema>;

export const DEFAULT_LIMIT = 28;

// Default search state
const defaultState: SearchState = {
  page: 1,
  limit: DEFAULT_LIMIT,
  developerDisplayName: undefined,
  publisherDisplayName: undefined,
};

// Create the default store instance
export const searchStore = new Store<SearchState>(defaultState);

// SearchStoreManager class to manage multiple store instances
export class SearchStoreManager {
  private stores = new Map<string, Store<SearchState>>();

  // Create or get a store instance for a specific page/context
  getStore(contextId: string, initialState?: Partial<SearchState>): Store<SearchState> {
    if (!this.stores.has(contextId)) {
      const initialStoreState = {
        ...defaultState,
        ...initialState,
      };
      this.stores.set(contextId, new Store<SearchState>(initialStoreState));
    }
    const store = this.stores.get(contextId);
    if (!store) {
      throw new Error(`Failed to create store for context: ${contextId}`);
    }
    return store;
  }

  // Remove a store instance (cleanup)
  removeStore(contextId: string): void {
    this.stores.delete(contextId);
  }

  // Get all active store IDs
  getActiveStoreIds(): string[] {
    return Array.from(this.stores.keys());
  }

  // Clear all stores
  clearAll(): void {
    this.stores.clear();
  }
}

// Global instance of the manager
export const searchStoreManager = new SearchStoreManager();

// Helper function to get a store for a specific context
export function getSearchStore(contextId?: string, initialState?: Partial<SearchState>) {
  if (!contextId) {
    return searchStore; // Return default store for backward compatibility
  }
  return searchStoreManager.getStore(contextId, initialState);
}
