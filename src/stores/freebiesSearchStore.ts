import { Store } from '@tanstack/react-store';
import { type TypeOf, z } from 'zod';

export const DEFAULT_LIMIT = 25;

export const defaultFreebiesSearchState = {
  limit: DEFAULT_LIMIT,
  page: 1,
};

export const freebiesFormSchema = z.object({
  query: z.string().optional(),
  offerType: z.string().optional(),
  sortBy: z.string().optional(),
  sortDir: z.enum(['asc', 'desc']).optional(),
  year: z.number().optional(),
  page: z.number().default(1).optional(),
  limit: z.number().default(DEFAULT_LIMIT).optional(),
});

export const freebiesSearchStore = new Store<TypeOf<typeof freebiesFormSchema>>(
  defaultFreebiesSearchState,
);
