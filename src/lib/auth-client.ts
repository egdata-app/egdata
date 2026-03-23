import { createAuthClient } from "better-auth/client";
import { genericOAuthClient } from "better-auth/client/plugins";
import { sentinelClient } from "@better-auth/infra/client";

export const authClient = createAuthClient({
  plugins: [genericOAuthClient(), sentinelClient()],
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // Cache duration in seconds
    },
  },
});
