import { saveAuthCookie } from "@/lib/cookies";
import { captureError, captureMessage } from "@/lib/pulse-telemetry";
import type { EpicToken } from "@/types/epic";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";

export const validateState = createServerFn({ method: "GET" })
  .inputValidator((state: string) => state)
  .handler(async (ctx) => {
    const response = await fetch("https://api.egdata.app/auth/v2/validate-state", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ state: ctx.data }),
    });

    if (response.ok) {
      return (await response.json())?.valid || false;
    }

    const errorBody = await response.json();
    console.error("Failed to validate state", response.status, errorBody);
    captureMessage("Failed to validate auth state", {
      attributes: {
        "http.response.status_code": response.status,
      },
      source: "auth.callback.validate-state",
    });
    return false;
  });

export const getTokens = createServerFn({ method: "GET" })
  .inputValidator((code: string) => code)
  .handler(async (ctx) => {
    const { getRequest } = await import("@/lib/start-server");
    const req = getRequest();

    let ClientID: string | undefined;
    let ClientSecret: string | undefined;

    if (req.cloudflare) {
      ClientID = req.cloudflare.env.EPIC_CLIENT_ID as string;
      ClientSecret = req.cloudflare.env.EPIC_CLIENT_SECRET as string;
    } else {
      ClientID = process.env.EPIC_CLIENT_ID;
      ClientSecret = process.env.EPIC_CLIENT_SECRET;
    }

    const response = await fetch("https://api.epicgames.dev/epic/oauth/v2/token", {
      headers: {
        Authorization: `Basic ${Buffer.from(`${ClientID}:${ClientSecret}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      method: "POST",
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: ctx.data,
        redirect_uri: process.env.EPIC_REDIRECT_URI as string,
      }),
    });

    if (response.ok) {
      const data = (await response.json()) as EpicToken;
      return data;
    }

    const errorBody = await response.json();
    console.error(response.status, errorBody);
    captureMessage("Failed to exchange Epic auth code", {
      attributes: {
        "http.response.status_code": response.status,
      },
      source: "auth.callback.get-tokens",
    });
    throw new Error("Failed to get token");
  });

export const Route = createFileRoute("/auth/callback")({
  component: () => {
    const { t } = useTranslation();
    return <div>{t("auth.callback.placeholder")}</div>;
  },

  beforeLoad: async ({ location }) => {
    let crypto: Crypto;

    if (import.meta.env.SSR) {
      // @ts-expect-error
      crypto = await import("node:crypto");
    } else {
      crypto = window.crypto;
    }

    const searchParams = new URLSearchParams(location.searchStr);
    const code = searchParams.get("code");
    const state = searchParams.get("state");

    if (!code || !state) {
      throw redirect({
        to: "/",
        search: { error: "invalid_request" },
      });
    }

    const stateValid = await validateState({ data: state });

    if (!stateValid) {
      throw redirect({
        to: "/",
        search: { error: "invalid_state" },
      });
    }

    const tokens = await getTokens({ data: code }).catch((error) => {
      console.error(error);
      captureError(error, {
        source: "auth.callback.tokens",
      });
      throw redirect({
        to: "/",
        search: { error: "invalid_request" },
      });
    });

    const id = crypto.randomUUID().replaceAll("-", "").toUpperCase();

    const token = await saveAuthCookie({
      data: JSON.stringify({
        name: "EGDATA_AUTH",
        value: {
          ...tokens,
          jti: id,
        },
      }),
    });

    const persistResponse = await fetch("https://api.egdata.app/auth/v2/persist", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!persistResponse.ok) {
      const errorBody = await persistResponse.json();
      console.error("Failed to persist tokens", errorBody);
      captureMessage("Failed to persist auth tokens", {
        attributes: {
          "http.response.status_code": persistResponse.status,
        },
        source: "auth.callback.persist",
      });
      throw redirect({
        to: "/",
        search: { error: "persist_error" },
      });
    }

    throw redirect({
      to: "/",
    });
  },
});
