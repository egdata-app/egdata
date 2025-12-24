import { createServerFileRoute } from "@tanstack/react-start/server";

export const ServerRoute = createServerFileRoute("/api/logout").methods({
  GET: async () => {
    const headers = new Headers({
      Location: "https://api.egdata.app/auth/logout",
    });

    return new Response(null, {
      status: 302,
      headers,
    });
  },
});
