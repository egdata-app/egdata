# EGDATA Design System

EGDATA uses a dark Epic Games Store-inspired interface: near-black canvas, layered launcher panels, compact data density, image-led cards, and clear blue interaction states.

## Foundations

- Use `src/styles.css` as the source of truth for color, radius, elevation, focus, overlay, status, chart, and rarity tokens.
- App screens may use layout utilities freely. Visual decisions for colors, borders, shadows, radius, overlays, and motion should come from tokens or shared components.
- Primary interaction uses `interactive`; status colors use `success`, `warning`, `danger`, and `info`; achievement rarity colors use `bronze`, `silver`, `gold`, and `platinum`.
- Use named utilities for repeated visual behavior: `egd-panel`, `egd-panel-raised`, `egd-overlay`, `egd-focus-ring`, `egd-image-overlay`, `egd-hero-scrim`, `egd-fade-to-canvas`, `egd-brand-wash`, and `egd-donor-*`.

## Components

- React Aria primitives in `src/components/aria` own interaction states, focus rings, overlays, fields, tables, tabs, menus, toasts, and dialogs.
- App-level patterns in `src/components/app/design-system.tsx` own repeated page structure: `PageShell`, `PageHeader`, `DataPanel`, `MetricTile`, `MediaCard`, `DataTableShell`, `FilterRail`, `Toolbar`, `EmptyState`, and `ActionMenu`.
- Prefer composing those patterns before adding local card/header/filter/table wrappers in route files.

## Exceptions

- SVG icon internals may keep literal fill values.
- Recharts selector literals inside the chart wrapper may keep required `stroke='#ccc'` and `stroke='#fff'` selectors.
- Favicon/theme metadata may keep external platform colors.

## QA

- Run `pnpm audit:design` before review.
- Check homepage, search, offer detail, profile, performance/date-range, downloads, collections, sales, freebies, and data-table pages at desktop and mobile widths.
- Verify hover, pressed, selected, focus-visible, disabled, dialog/sheet, tooltip, hover-card, toast, carousel, and keyboard states.
