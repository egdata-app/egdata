import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import consola from "consola";
import { google } from "googleapis";

type SheetsClient = ReturnType<typeof google.sheets>;

const clientsByScope = new Map<string, SheetsClient>();

export function parseServiceAccountKey(): object {
  const inline = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_JSON;
  if (inline) {
    try {
      return JSON.parse(inline);
    } catch (error) {
      consola.error("Failed to parse GOOGLE_SERVICE_ACCOUNT_KEY_JSON:", error);
      throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY_JSON is not valid JSON");
    }
  }

  const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH;
  if (!keyPath) {
    throw new Error(
      "Neither GOOGLE_SERVICE_ACCOUNT_KEY_JSON nor GOOGLE_SERVICE_ACCOUNT_KEY_PATH is configured",
    );
  }

  let stat;
  try {
    stat = statSync(keyPath);
  } catch (error) {
    consola.error("Failed to stat service account key path:", error);
    throw new Error(`Service account key path is not accessible: ${keyPath}`);
  }

  let resolvedFile = keyPath;
  if (stat.isDirectory()) {
    const candidates = ["service-account.json", "key.json", "credentials.json"];
    let found: string | undefined;
    for (const name of candidates) {
      const candidate = path.join(keyPath, name);
      try {
        if (statSync(candidate).isFile()) {
          found = candidate;
          break;
        }
      } catch {
        // not present, keep looking
      }
    }
    if (!found) {
      try {
        const firstJson = readdirSync(keyPath).find((f) => f.toLowerCase().endsWith(".json"));
        if (firstJson) {
          found = path.join(keyPath, firstJson);
        }
      } catch (error) {
        consola.error("Failed to enumerate service account key directory:", error);
      }
    }
    if (!found) {
      throw new Error(
        `Expected a JSON file at ${keyPath}, got a directory with no recognizable key file`,
      );
    }
    resolvedFile = found;
  } else if (!stat.isFile()) {
    throw new Error(`Service account key path is neither a file nor a directory: ${keyPath}`);
  }

  try {
    return JSON.parse(readFileSync(resolvedFile, "utf-8"));
  } catch (error) {
    consola.error("Failed to read service account key from file:", error);
    throw new Error(`Failed to read or parse service account key file: ${resolvedFile}`);
  }
}

export function getSheetsClient(scope: string): SheetsClient {
  const existing = clientsByScope.get(scope);
  if (existing) return existing;

  const credentials = parseServiceAccountKey();
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: [scope],
  });
  const client = google.sheets({ version: "v4", auth });
  clientsByScope.set(scope, client);
  return client;
}
