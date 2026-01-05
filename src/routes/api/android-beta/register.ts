import { json } from "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import { OAuth2Client } from "google-auth-library";
import { google } from "googleapis";
import consola from "consola";

interface RegisterRequest {
  idToken: string;
}

interface GoogleTokenPayload {
  email: string;
  email_verified: boolean;
  sub: string;
  name?: string;
}

let oAuth2Client: OAuth2Client | null = null;
let sheetsClient: ReturnType<typeof google.sheets> | null = null;

function getOAuth2Client() {
  if (!oAuth2Client) {
    oAuth2Client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  }
  return oAuth2Client;
}

function parseServiceAccountKey(): object {
  const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountKey) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY is not configured");
  }

  try {
    // Try parsing as plain JSON first
    return JSON.parse(serviceAccountKey);
  } catch {
    // If that fails, try base64 decoding
    try {
      const decoded = Buffer.from(serviceAccountKey, "base64").toString("utf-8");
      return JSON.parse(decoded);
    } catch {
      throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY is not valid JSON or base64-encoded JSON");
    }
  }
}

function getSheetsClient() {
  if (!sheetsClient) {
    const credentials = parseServiceAccountKey();

    const serviceAccountAuth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    sheetsClient = google.sheets({
      version: "v4",
      auth: serviceAccountAuth,
    });
  }
  return sheetsClient;
}

async function verifyGoogleToken(idToken: string): Promise<GoogleTokenPayload> {
  const client = getOAuth2Client();

  const ticket = await client.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();
  if (!payload || !payload.email) {
    throw new Error("Invalid token payload");
  }

  if (!payload.email_verified) {
    throw new Error("Email not verified");
  }

  return {
    email: payload.email,
    email_verified: payload.email_verified,
    sub: payload.sub,
    name: payload.name,
  };
}

async function checkIfAlreadyRegistered(email: string): Promise<boolean> {
  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEETS_BETA_REGISTRATIONS_ID;

  if (!spreadsheetId) {
    return false;
  }

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "'API Registrations'!B:B",
    });

    const emails = response.data.values?.flat() || [];
    return emails.some(
      (e) => typeof e === "string" && e.toLowerCase() === email.toLowerCase(),
    );
  } catch (error) {
    consola.error("Error checking existing registrations:", error);
    return false;
  }
}

async function addToGoogleSheets(data: {
  email: string;
  timestamp: string;
}): Promise<void> {
  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEETS_BETA_REGISTRATIONS_ID;

  if (!spreadsheetId) {
    throw new Error("GOOGLE_SHEETS_BETA_REGISTRATIONS_ID is not configured");
  }

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: "'API Registrations'!A:B",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[data.timestamp, data.email]],
    },
  });
}

export const Route = createFileRoute("/api/android-beta/register")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as RegisterRequest;

          if (!body.idToken) {
            return json({ message: "ID token is required" }, { status: 400 });
          }

          // 1. Verify the Google ID token
          let tokenPayload: GoogleTokenPayload;
          try {
            tokenPayload = await verifyGoogleToken(body.idToken);
          } catch (error) {
            consola.error("Token verification failed:", error);
            return json({ message: "Invalid Google token" }, { status: 401 });
          }

          // 2. Check if already registered
          const alreadyRegistered = await checkIfAlreadyRegistered(
            tokenPayload.email,
          );
          if (alreadyRegistered) {
            return json(
              {
                message: "Already registered",
                email: tokenPayload.email,
              },
              { status: 409 },
            );
          }

          // 3. Add to Google Sheets
          const timestamp = new Date().toISOString();
          await addToGoogleSheets({
            email: tokenPayload.email,
            timestamp,
          });

          return json({
            message: "Successfully registered for beta",
            email: tokenPayload.email,
          });
        } catch (error) {
          consola.error("Registration error:", error);
          return json(
            {
              message:
                error instanceof Error ? error.message : "Registration failed",
            },
            { status: 500 },
          );
        }
      },
    },
  },
});
