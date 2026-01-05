import { json } from "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import { google } from "googleapis";
import consola from "consola";
import { readFileSync } from "node:fs";

const MAX_TESTERS = 100;

let sheetsClient: ReturnType<typeof google.sheets> | null = null;

function parseServiceAccountKey(): object {
  const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH;
  if (!keyPath) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY_PATH is not configured");
  }

  try {
    const fileContent = readFileSync(keyPath, "utf-8");
    return JSON.parse(fileContent);
  } catch (error) {
    consola.error("Failed to read service account key from file:", error);
    throw new Error("Failed to read or parse service account key file");
  }
}

function getSheetsClient() {
  if (!sheetsClient) {
    const credentials = parseServiceAccountKey();

    const serviceAccountAuth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });

    sheetsClient = google.sheets({
      version: "v4",
      auth: serviceAccountAuth,
    });
  }
  return sheetsClient;
}

async function getRegisteredCount(): Promise<number> {
  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEETS_BETA_REGISTRATIONS_ID;

  if (!spreadsheetId) {
    return 0;
  }

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "'API Registrations'!B:B",
    });

    const emails = response.data.values?.flat() || [];
    // Subtract 1 for the header row if it exists
    const count = emails.filter((e) => typeof e === "string" && e.includes("@")).length;
    return count;
  } catch (error) {
    consola.error("Error getting registered count:", error);
    return 0;
  }
}

export const Route = createFileRoute("/api/android-beta/status")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const registered = await getRegisteredCount();
          const remaining = Math.max(0, MAX_TESTERS - registered);

          return json({
            registered,
            remaining,
            maxTesters: MAX_TESTERS,
            isFull: remaining === 0,
          });
        } catch (error) {
          consola.error("Status error:", error);
          return json(
            { registered: 0, remaining: MAX_TESTERS, maxTesters: MAX_TESTERS, isFull: false },
            { status: 500 },
          );
        }
      },
    },
  },
});
