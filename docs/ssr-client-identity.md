# SSR API rate-limit identity

The production website receives public requests through Cloudflare. SSR calls
the API over the private Docker network using `API_ENDPOINT`.

For each API call, the HTTP client reads the current TanStack request context
and forwards a single valid `CF-Connecting-IP`. Cloudflare overwrites that header
on the public website ingress. Do not expose an alternate public website ingress
that accepts caller-provided Cloudflare headers as trusted identity.

`X-Forwarded-For` and `X-Real-IP` are not accepted as identity fallbacks. Missing
or malformed identity keeps the API's anonymous fallback; it never bypasses a
limiter. Background work without a visitor retains the same fallback.

Visitor identity is request-scoped, never stored in shared Axios defaults. It
is sent only to the configured API origin and removed on external redirects.
Cookies, authorization and API privilege headers are not copied from the page
request.

This changes no API quotas or exemptions. SSR calls count against the visitor's
existing limits, including the general and GraphQL limits. Browser calls keep
their existing transport and Cloudflare-provided identity.

Validation: `pnpm test:unit`, `pnpm typecheck`, and `pnpm build`. Regression tests
cover concurrent visitors, malformed and forged identities, background work,
browser requests, and external destinations/redirects.
