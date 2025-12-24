import { createAuthClient } from "better-auth/client";
import { genericOAuthClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [genericOAuthClient()],
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // Cache duration in seconds
    },
  },
});
