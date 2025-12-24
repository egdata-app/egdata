// Cloudflare Workers types for Request
interface CloudflareEnv {
  EGDATA_KV?: KVNamespace;
  [key: string]: unknown;
}

interface CloudflareContext {
  env: CloudflareEnv;
  waitUntil: (promise: Promise<unknown>) => void;
  passThroughOnException: () => void;
}

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: Gtag.Gtag;
    umami?: {
      track: (event: string, data?: Record<string, unknown>) => void;
    };
  }

  interface Request {
    cloudflare?: CloudflareContext;
  }
}

export {};
