import { json } from "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import { google } from "googleapis";
import consola from "consola";

const MAX_TESTERS = 100;

let sheetsClient: ReturnType<typeof google.sheets> | null = null;

function getSheetsClient() {
  if (!sheetsClient) {
    const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    if (!serviceAccountKey) {
      throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY is not configured");
    }

    const serviceAccountAuth = new google.auth.GoogleAuth({
      credentials: JSON.parse(serviceAccountKey),
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
