import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/logout")({
  server: {
    handlers: {
      GET: async () => {
        const headers = new Headers({
          Location: "https://api.egdata.app/auth/logout",
        });

        return new Response(null, {
          status: 302,
          headers,
        });
      },
    },
  },
});
