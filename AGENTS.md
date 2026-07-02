# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project Overview

egdata.app is an Epic Games Store database and analytics platform built with React 19 and TanStack Start. It tracks game prices, discounts, giveaways, and provides detailed game information including sales history, file lists, and build information.

## Localization Guidelines

EGDATA uses Epic Games Store terminology in a technical, catalog-data sense. Do not translate these terms as generic store or consumer words when they refer to Epic's domain model.

### Epic Games Store Terms

- **Offer**: An EGS catalog offer: the purchasable or claimable store entity, usually a pairing of a catalog/audience item and a price, which can be zero. In Spanish, use `oferta` or `oferta de catalogo` when ambiguity matters. Do not use `articulo` for Offer. Avoid using `oferta` for generic sales events if it would conflict with catalog offers; use `rebaja`, `descuento`, or `promocion` for sales/deals.
- **Item**: The catalog/audience item behind an offer and entitlement. In Spanish, prefer `item de catalogo` on first mention and `item` afterward. Avoid `elemento` unless the UI is intentionally generic and not referring to the EGS catalog object.
- **Asset**: Ambiguous in Epic terminology. For storefront images/videos, translate as `recurso multimedia` or `asset multimedia`. For EGDATA technical `Asset` records that include fields like `artifactId`, `platform`, download size, or install size, use `asset` or `recurso de distribucion`; do not imply it is only an image or video.
- **Artifact**: A downloadable/playable content unit, such as a game client, DLC, or mod editor. It is linked to binaries/builds and should not be confused with Asset. In Spanish, use `artefacto` or preserve `artifact` in highly technical contexts.
- **Namespace**: Preserve as `Namespace` in UI labels and technical text. It is an Epic identifier closely related to sandbox/catalog context. Avoid literal translations such as `espacio de nombres`.
- **Sandbox**: Preserve as `Sandbox`, or use `entorno sandbox` in explanatory Spanish text. Do not translate literally.
- **Build**: A specific uploaded/indexed build or manifest version for an artifact. In Spanish UI copy, use `compilacion`. Keep field names such as `BuildVersion`, `buildVersion`, manifest hashes, and API identifiers untranslated. Avoid translating Build as just `version`.

When adding or updating locale files under `src/locales/`, preserve placeholders exactly, keep technical field names untranslated, and choose translations that distinguish catalog objects (`Offer`, `Item`, `Asset`, `Artifact`) from consumer-facing concepts (deals, discounts, media, game versions).

## Development Commands

```bash
pnpm dev                 # Start dev server on localhost:3000 (TZ=UTC)
pnpm build              # Build app (service worker + main app)
pnpm start              # Run production server
pnpm format             # Format code with oxfmt
pnpm lint               # Lint and fix with oxlint
pnpm test:e2e           # Run Playwright E2E tests
pnpm test:e2e:ui        # Run E2E tests with UI
pnpm test:e2e:headed    # Run E2E tests in headed mode
```

**Requirements:** Node 22.16.0, pnpm 10.18.0

## Architecture

### Tech Stack
- **Framework:** TanStack React Start (Rsbuild-based meta-framework with SSR)
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
- `lib/` - Utilities including `http-client.ts` (Axios wrapper), `auth.ts` (Better Auth setup), `i18n.ts` (i18next instance), `supported-locales.ts` (32 Epic locales)
- `types/` - TypeScript type definitions for domain objects, including `i18n.d.ts` (i18next type augmentation)
- `hooks/` - Custom React hooks for context access and utilities
- `locales/` - Translation JSON files per locale (`en-US/translation.json`, `es-ES/translation.json`)
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

### Internationalization (i18n)

The app uses `react-i18next` + `i18next` for internationalization with 32 Epic Games Store locales. Only `en-US` (source) and `es-ES` have full translations; all other locales fall back to `en-US`.

**Core files:**
- `src/lib/i18n.ts` - i18next instance with `initImmediate: false` (synchronous init for SSR) and `nonExplicitSupportedLngs: true` (resolves `de-DE` → `de`)
- `src/lib/supported-locales.ts` - 32 Epic canonical locales, `isRTL()`, `getLocaleName()`, `isSupportedLocale()`, `DEFAULT_LOCALE = "en-US"`
- `src/locales/en-US/translation.json` - Source-of-truth translations (928 keys)
- `src/locales/es-ES/translation.json` - Spanish pilot translations (same 928 keys)
- `src/types/i18n.d.ts` - Type augmentation for type-safe `t()` keys based on en-US resources
- `src/providers/locale.tsx` - Bridges `LocaleProvider` state to `i18n.changeLanguage()`
- `rsbuild.config.ts` - `i18next` and `react-i18next` in `ssr.output.autoExternal.exclude` (critical: must be bundled, not externalized)

**Usage in components:**
```typescript
import { useTranslation } from "react-i18next";

function MyComponent() {
  const { t } = useTranslation();
  return <h1>{t("home.sections.giveawayStats")}</h1>;
}
```

**Usage in `head()` functions (server-side):**
```typescript
import i18n from "@/lib/i18n";

head() {
  return {
    meta: [{ title: i18n.t("search.meta.title") }],
  };
}
```

**Translation key conventions:** Use dot-separated namespace paths (e.g., `offerDetail.table.seller`, `search.filters`, `freebies.headings.current`). Interpolation uses `{{variableName}}` format (e.g., `t("offerDetail.hero.offeredBy", { seller: offer.seller.name })`). Pluralization uses `_one` / `_other` suffixes.

**Adding new strings:** Add the key to both `src/locales/en-US/translation.json` and `src/locales/es-ES/translation.json`, then use `t("namespace.key")` in the component. The type augmentation in `src/types/i18n.d.ts` will automatically provide type safety.

**Updating one translation:** Prefer `node scripts/add-translation.mjs <locale> <dot.key> "<localized string>"` for single-key additions or updates. It refuses keys that do not exist in `en-US`, rejects duplicate-key JSON files, preserves placeholders and inline tags, and writes valid formatted JSON. Use `pnpm locales:validate` for full locale structure checks when the locale is expected to be complete.

## Code Style

- **Linter:** oxlint (oxc project)
- **Formatter:** oxfmt (oxc project)
- **Ignored files:** `node_modules`, `routeTree.gen.ts`

## Testing

E2E tests use Playwright and are located in `tests/e2e/`. Tests run against localhost:3000 with the dev server auto-started.
