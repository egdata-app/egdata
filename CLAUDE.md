# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

egdata.app is an Epic Games Store database and analytics platform built with React 19 and TanStack Start. It tracks game prices, discounts, giveaways, and provides detailed game information including sales history, file lists, and build information.

## Development Commands

```bash
pnpm dev                 # Start dev server on localhost:3000 (TZ=UTC)
pnpm build              # Build app (service worker + main app)
pnpm start              # Run production server
pnpm format             # Format code with Biome
pnpm lint               # Lint and fix with Biome
pnpm test:e2e           # Run Playwright E2E tests
pnpm test:e2e:ui        # Run E2E tests with UI
pnpm test:e2e:headed    # Run E2E tests in headed mode
```

**Requirements:** Node 22.16.0, pnpm 10.18.0

## Architecture

### Tech Stack
- **Framework:** TanStack React Start (Vite-based meta-framework with SSR)
- **Routing:** TanStack Router with file-based routing
- **Data Fetching:** TanStack React Query with SSR prefetching
- **Styling:** Tailwind CSS 4 + shadcn/ui components (Radix UI primitives)
- **Auth:** Better Auth with Epic Games OAuth 2.0
- **Database:** PostgreSQL (Neon) for auth, Turso (LibSQL) for app data

### Source Structure (`src/`)

- `routes/` - File-based routing. Dynamic segments use `$paramName` convention (e.g., `offers/$id.tsx`)
- `components/` - React components, with `ui/` containing shadcn/ui primitives
- `providers/` - React Context providers (global search, country, locale, preferences)
- `queries/` - TanStack Query option factories for API data fetching
- `lib/` - Utilities including `http-client.ts` (Axios wrapper), `auth.ts` (Better Auth setup)
- `types/` - TypeScript type definitions for domain objects
- `hooks/` - Custom React hooks for context access and utilities
- `routeTree.gen.ts` - Auto-generated route tree (do not edit manually)

### Key Patterns

**Route Loaders:** Routes prefetch data server-side using loaders with React Query:
```typescript
export const Route = createFileRoute('/offers/$id')({
  loader: async ({ params, context }) => {
    await context.queryClient.ensureQueryData(offerQueryOptions(params.id));
  },
});
```

**Query Options Pattern:** Queries are defined as factory functions in `src/queries/`:
```typescript
export const offerQueryOptions = (id: string) => ({
  queryKey: ['offer', id],
  queryFn: () => httpClient.get(`/offers/${id}`),
  staleTime: 60_000,
});
```

**Path Alias:** Use `@/*` to import from `src/*` (configured in tsconfig.json)

### API Client

The HTTP client (`src/lib/http-client.ts`) is an Axios wrapper with retry logic. API requests go to the egdata.app backend API.

## Code Style

- **Formatter/Linter:** Biome with single quotes, space indentation
- **Ignored files:** `node_modules`, `routeTree.gen.ts`

## Testing

E2E tests use Playwright and are located in `tests/e2e/`. Tests run against localhost:3000 with the dev server auto-started.
