import { json } from "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import consola from "consola";
import { URLSearchParams } from "node:url";

export const Route = createFileRoute("/api/token")({
  server: {
    handlers: {
      GET: () => {
        return json({ message: 'Hello "/api/token"!' });
      },
      POST: async ({ request }) => {
        const body = await request.formData();

        const ClientID = process.env.EPIC_CLIENT_ID;
        const ClientSecret = process.env.EPIC_CLIENT_SECRET;

        const grantType = body.get("grant_type");
        const code = body.get("code");
        const codeVerifier = body.get("code_verifier");
        const redirectURI = body.get("redirect_uri");
        const clientID = body.get("client_id");
        const clientSecret = body.get("client_secret");

        if (!grantType || !code || !redirectURI || !clientID || !clientSecret) {
          consola.error("Invalid request", {
            grantType,
            code,
            codeVerifier,
            redirectURI,
            clientID,
            clientSecret,
          });

          return json(
            { message: "Invalid request" },
            {
              status: 400,
            }
          );
        }

        const searchParams = new URLSearchParams();

        searchParams.append("code", code.toString());
        searchParams.append("grant_type", grantType.toString());

        const response = await fetch(
          "https://api.epicgames.dev/epic/oauth/v2/token",
          {
            headers: {
              Authorization: `Basic ${Buffer.from(
                `${ClientID}:${ClientSecret}`
              ).toString("base64")}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            method: "POST",
            body: searchParams,
          }
        );

        if (!response.ok) {
          console.error(
            "Failed to save state",
            response.status,
            await response.json()
          );
          throw new Error("Failed to save state");
        }

        return json(await response.json());
      },
    },
  },
});
