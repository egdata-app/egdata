import { json } from "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import consola from "consola";
import { getSheetsClient } from "@/lib/google-sheets";

const MAX_TESTERS = 100;
const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets.readonly";

async function getRegisteredCount(): Promise<number> {
  const sheets = getSheetsClient(SHEETS_SCOPE);
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
