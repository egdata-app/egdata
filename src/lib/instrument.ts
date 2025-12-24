import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";

Sentry.init({
  dsn: "https://d78eba5d1514649ef28ccb35742c18e1@o4506558481498112.ingest.us.sentry.io/4508783297626112",
  integrations: [nodeProfilingIntegration()],
  // Tracing
  tracesSampleRate: 1.0, //  Capture 100% of the transactions
});
