import { createServerFileRoute } from "@tanstack/react-start/server";

export const ServerRoute = createServerFileRoute("/api/auth/login").methods({
  GET: async ({ request }) => {
    const response = await fetch("https://api.egdata.app/auth/v2/save-state", {
      method: "POST",
    });

    if (!response.ok) {
      console.error("Failed to save state", response.status, await response.json());
      throw new Error("Failed to save state");
    }

    const { state } = await response.json();

    let clientId: string;
    let redirectUri: string;

    if (request.cloudflare) {
      clientId = request.cloudflare.env.EPIC_CLIENT_ID;
      redirectUri = request.cloudflare.env.EPIC_REDIRECT_URI;
    } else {
      clientId = import.meta.env.EPIC_CLIENT_ID ?? process.env.EPIC_CLIENT_ID;
      redirectUri = import.meta.env.EPIC_REDIRECT_URI ?? process.env.EPIC_REDIRECT_URI;
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
});
