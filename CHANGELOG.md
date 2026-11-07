# Changelog

## Unreleased

- Handle API tarpits marked by HTTP 204 and `X-Egdata-Mitigation: tarpit` as typed recoverable errors before REST/GraphQL parsing. Show localized wait-and-retry notices without automatic query retries or PoW handshakes; preserve ordinary 204 responses and existing challenge recovery.
