import { createFileRoute } from "@tanstack/react-router";
import { captureMessage } from "@/lib/pulse-telemetry";

export const Route = createFileRoute("/api/auth/login")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const response = await fetch("https://api.egdata.app/auth/v2/save-state", {
          method: "POST",
        });

        if (!response.ok) {
          const errorBody = await response.json();
          console.error("Failed to save state", response.status, errorBody);
          captureMessage("Failed to save auth state", {
            attributes: {
              "http.response.status_code": response.status,
            },
            source: "api.auth.login.save-state",
          });
          throw new Error("Failed to save state");
        }

        const { state } = await response.json();

        let clientId: string;
        let redirectUri: string;

        if (request.cloudflare) {
          clientId = request.cloudflare.env.EPIC_CLIENT_ID as string;
          redirectUri = request.cloudflare.env.EPIC_REDIRECT_URI as string;
        } else {
          clientId = process.env.EPIC_CLIENT_ID ?? "";
          redirectUri = process.env.EPIC_REDIRECT_URI ?? "";
        }

        const epicUrl = new URL("https://www.epicgames.com/id/authorize");
        epicUrl.searchParams.set("client_id", clientId);
        epicUrl.searchParams.set("response_type", "code");
        epicUrl.searchParams.set("scope", "basic_profile");
        epicUrl.searchParams.set("redirect_uri", redirectUri);
        epicUrl.searchParams.set("state", state);

        const headers = new Headers({
          Location: epicUrl.toString(),
        });

        return new Response(null, {
          status: 302,
          headers,
        });
      },
    },
  },
});
