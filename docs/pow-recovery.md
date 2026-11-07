# On-demand proof-of-work recovery

The frontend API client can complete the `SESSION_CHALLENGE_REQUIRED` flow when the
backend asks for it. It never performs a startup handshake, proactive token
refresh or background proof-of-work; ordinary traffic only makes the requests it
already made.

## Flow

1. `HttpFetch` (`src/lib/http-client.ts`) sends the original request with
   credentials through Axios. If the HTTP-200 body is exactly
   `{ "error": { "code": "SESSION_CHALLENGE_REQUIRED", ... } }`, the body is
   never returned to REST callers or GraphQL parsing.
2. The browser-only `SessionRecoveryCoordinator` (`src/lib/pow/session-recovery.ts`)
   POSTs `{}` to `/auth/challenge`, resolved against the configured API origin.
3. A dedicated module Web Worker (`src/lib/pow/worker.ts`) searches for a nonce.
   The main thread re-verifies the returned proof before submitting it, and the
   worker is terminated on completion, timeout, failure or cancellation.
4. The proof is submitted to the same endpoint with credentials. A successful
   token response bumps the in-memory session generation. At most one replacement
   challenge is handled, within the overall recovery deadline.
5. The original request is replayed exactly once with its original URL, query,
   method, headers, body and signal. A second challenge becomes a typed
   `ProofOfWorkRecoveryError`, which query retries treat as terminal.

Concurrent challenged requests share one in-flight handshake. A late challenge
response from a request that began before the current session was established
reuses that session instead of starting another solve. Sessions are renewed only
when the backend asks.

## Boundaries

- Only the exact `error.code` envelope triggers recovery. Empty responses,
  truncated JSON, GraphQL errors, 429s, slow requests and the high-risk empty
  page/list response do not.
- Replayable bodies are cloned before the first send. Streams and other
  non-replayable bodies fail with a typed recoverable error instead of being
  replayed.
- The handshake uses raw `fetch` with `credentials: "include"`, so it cannot
  recurse through the Axios challenge interceptor. The response's
  `challengeUrl` is informational and is never followed.
- Tokens and proof material are not persisted or logged. The HttpOnly
  `__Host-egdata-session` cookie is not read by JavaScript.
- The browser coordinator is per tab. It is not created during SSR and no
  recovery promise or session state is shared between server-rendered users.

## SSR limitation

A server-rendered request cannot spawn the browser worker or use the browser's
cookie jar. If the backend returns the challenge envelope during SSR, the client
throws `ProofOfWorkRecoveryError` with reason `ssr-unsupported` instead of
returning or caching the envelope. The page should surface its normal recoverable
error state and retry after hydration. SSR does not start a handshake, so it
cannot accidentally share one user's recovery state with another.

## Tests

Unit coverage lives in `tests/unit/pow-*.test.ts` and uses mocked challenge
responses and an Axios adapter; no production traffic is generated. It covers
proofs at 16-bit and 20-bit difficulty, shared handshakes, late-generation reuse,
replacement challenges, expiry, worker failure/cancellation, exact request
replay, bounded 400/503/429 handling, empty/high-risk responses, cache isolation
and the SSR path.

## High-risk tarpits

HTTP 204 with `X-Egdata-Mitigation: tarpit` is intercepted before REST/GraphQL
parsing, including after the one allowed PoW replay. It throws `AbuseTarpitError`
in browser and SSR, never starts a handshake and is excluded from query retries.
The browser shows a localized temporary-limit notice with manual retry; router
errors use the same message. Failed queries do not cache empty successful data.
Unmarked 204s (for example successful deletion) retain their existing behavior.
Deploy this frontend before the backend switches from its legacy 200 tarpit.
