import { createAuthClient } from "better-auth/client";
import { sentinelClient } from "@better-auth/infra/client";

export const authClient = createAuthClient({
  plugins: [sentinelClient()],
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // Cache duration in seconds
    },
  },
});
