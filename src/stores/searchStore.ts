import { Store } from '@tanstack/react-store';
import { type TypeOf, z } from 'zod';

export const DEFAULT_LIMIT = 28;

export const defaultSearchState = {
  limit: DEFAULT_LIMIT,
  page: 1,
};

export const formSchema = z.object({
  title: z.string().optional(),
  offerType: z
    .enum([
      'IN_GAME_PURCHASE',
      'BASE_GAME',
      'EXPERIENCE',
      'UNLOCKABLE',
      'ADD_ON',
      'Bundle',
      'CONSUMABLE',
      'WALLET',
      'OTHERS',
      'DEMO',
      'DLC',
      'VIRTUAL_CURRENCY',
      'BUNDLE',
      'DIGITAL_EXTRA',
      'EDITION',
      'SUBSCRIPTION',
    ])
    .optional(),
  tags: z.string().array().optional(),
  customAttributes: z.string().array().optional(),
  seller: z.string().optional(),
  sortBy: z
    .enum([
      'releaseDate',
      'lastModifiedDate',
      'effectiveDate',
      'creationDate',
      'viewableDate',
      'pcReleaseDate',
      'upcoming',
      'priceAsc',
      'priceDesc',
      'price',
      'discount',
      'discountPercent',
    ])
    .optional(),
  sortDir: z.enum(['asc', 'desc']).optional(),
  limit: z.number().optional(),
  page: z.number().default(1).optional(),
  refundType: z.string().optional(),
  isCodeRedemptionOnly: z.boolean().optional(),
  excludeBlockchain: z.boolean().optional(),
  price: z
    .object({
      min: z.number().optional(),
      max: z.number().optional(),
    })
    .optional(),
  onSale: z.boolean().optional(),
  categories: z.string().array().optional(),
  developerDisplayName: z.string().optional(),
  publisherDisplayName: z.string().optional(),
  pastGiveaways: z.boolean().optional(),
});

export const searchStore = new Store<TypeOf<typeof formSchema>>(
  defaultSearchState,
);
