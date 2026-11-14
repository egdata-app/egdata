import { createFileRoute } from "@tanstack/react-router";
import { json } from "@tanstack/react-start";
import { mintWebEphemeralTokenFromRequest } from "@/lib/ephemeral-key.server";

export const Route = createFileRoute("/api/web-token")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const secFetchSite = request.headers.get("sec-fetch-site")?.toLowerCase();
        if (secFetchSite === "cross-site") {
          return json(
            { error: "Forbidden: cross-site requests are not allowed" },
            {
              status: 403,
              headers: {
                "Cache-Control": "private, no-store, max-age=0",
              },
            },
          );
        }

        const minted = mintWebEphemeralTokenFromRequest(request.headers);

        return json(
          {
            token: minted.token,
            expiresAt: minted.expiresAt,
          },
          {
            headers: {
              "Cache-Control": "private, no-store, max-age=0",
            },
          },
        );
      },
    },
  },
});
