import type { EpicToken } from "@/types/epic";
import { createServerFn } from "@tanstack/react-start";
import { readFile } from "node:fs/promises";
import { SignJWT, importPKCS8 } from "jose";

export const getCookie = createServerFn({ method: "GET" })
  .inputValidator((name: string) => name)
  .handler(async (ctx) => {
    const { getCookie: _getCookie } = await import("@tanstack/react-start/server");
    const cookie = _getCookie(ctx.data);

    if (!cookie) {
      return null;
    }

    return cookie;
  });

export const saveAuthCookie = createServerFn({ method: "GET" })
  .inputValidator((stringifiedValue: string) => stringifiedValue)
  .handler(async (ctx) => {
    const { setCookie: _setCookie } = await import("@tanstack/react-start/server");
    const { getRequest } = await import("@tanstack/react-start/server");

    const { name, value } = JSON.parse(ctx.data) as {
      name: string;
      value: EpicToken;
    };

    const req = getRequest();

    let privateKeyPem: string;

    if (req.cloudflare) {
      privateKeyPem = req.cloudflare.env.JWT_SIGNING_KEY;
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

    const token = await new SignJWT(value)
      .setProtectedHeader({ alg: "RS256" })
      .setIssuedAt()
      .setExpirationTime("365d")
      .sign(privateKey);

    _setCookie(name, token, {
      httpOnly: false,
      secure: import.meta.env.PROD,
      sameSite: "lax",
      path: "/",
      domain: import.meta.env.PROD ? "egdata.app" : "localhost",
      expires: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    });

    return token;
  });
