import type { EpicToken } from "@/types/epic";
import { createFileRoute } from "@tanstack/react-router";
import consola from "consola";
import { importPKCS8, SignJWT } from "jose";
import crypto from "node:crypto";
import { readFile } from "node:fs/promises";

export const Route = createFileRoute("/api/auth/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const state = url.searchParams.get("state");
        const code = url.searchParams.get("code");

        if (!state || !code) {
          return new Response(null, {
            headers: new Headers({
              // Location: 'https://egdata.app/?error=invalid_request',
              Location: import.meta.env.PROD ? "https://egdata.app/" : "http://localhost:3000/",
            }),
            status: 302,
          });
        }

        const response = await fetch("https://api.egdata.app/auth/v2/validate-state", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ state: url.searchParams.get("state") }),
        });

        if (!response.ok) {
          console.error("Failed to validate state", response.status, await response.json());

          return new Response(null, {
            headers: new Headers({
              // Location: 'https://egdata.app/?error=invalid_state',
              Location: import.meta.env.PROD ? "https://egdata.app/" : "http://localhost:3000/",
            }),
            status: 302,
          });
        }

        let ClientID: string | undefined;
        let ClientSecret: string | undefined;

        if (request.cloudflare) {
          ClientID = request.cloudflare.env.EPIC_CLIENT_ID;
          ClientSecret = request.cloudflare.env.EPIC_CLIENT_SECRET;
        } else {
          ClientID = process.env.EPIC_CLIENT_ID;
          ClientSecret = process.env.EPIC_CLIENT_SECRET;
        }

        const tokenRes = await fetch("https://api.epicgames.dev/epic/oauth/v2/token", {
          headers: {
            Authorization: `Basic ${Buffer.from(`${ClientID}:${ClientSecret}`).toString("base64")}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          method: "POST",
          body: new URLSearchParams({
            grant_type: "authorization_code",
            code,
            redirect_uri: process.env.EPIC_REDIRECT_URI as string,
          }),
        });

        const token = (await tokenRes.json()) as EpicToken;

        const id = crypto.randomUUID().replaceAll("-", "").toUpperCase();

        let privateKeyPem: string;

        if (request.cloudflare) {
          privateKeyPem = request.cloudflare.env.JWT_SIGNING_KEY;
        } else {
          privateKeyPem =
            process.env.JWT_SIGNING_KEY ??
            (await readFile(
              (process.env.JWT_SIGNING_CERT as string) || import.meta.env.JWT_SIGNING_CERT,
              "utf-8",
            ));
        }

        // Import the private key (PEM format) for signing
        const privateKey = await importPKCS8(privateKeyPem, "RS256");

        const t = await new SignJWT({
          ...token,
          jti: id,
        })
          .setProtectedHeader({ alg: "RS256" })
          .setIssuedAt()
          .setExpirationTime("365d")
          .sign(privateKey);

        consola.info("JWT Token:", t);

        const persistResponse = await fetch("https://api.egdata.app/auth/v2/persist", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${t}`,
          },
        });

        if (!persistResponse.ok) {
          console.error("Failed to persist tokens", await persistResponse.json());
          return new Response(null, {
            headers: new Headers({
              Location: import.meta.env.PROD ? "https://egdata.app/" : "http://localhost:3000/",
            }),
            status: 302,
          });
        }

        // Redirect to the home page with the JWT token
        return new Response(null, {
          headers: new Headers({
            Location: import.meta.env.PROD ? "https://egdata.app/" : "http://localhost:3000/",
            "Set-Cookie": `EGDATA_AUTH=${t}; Path=/; Secure; SameSite=Lax; Max-Age=31536000; domain=${
              import.meta.env.PROD ? "egdata.app" : "localhost"
            }`,
          }),
          status: 302,
        });
      },
    },
  },
});
