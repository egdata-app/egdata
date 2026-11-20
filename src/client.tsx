import { StrictMode, startTransition } from "react";
import { hydrateRoot } from "react-dom/client";
import { StartClient } from "@tanstack/react-start/client";
import { ensureLocaleCatalog } from "@/lib/i18n";

/**
 * The SSR document carries the resolved locale in <html lang> and modulepreloads
 * that locale's catalog chunk. Load it before hydrating so the first client
 * render matches the server markup; otherwise non-English pages would hydrate
 * with English strings (or key names) and flash/patch the DOM on every arrival.
 */
function resolveServerLocale(): string | undefined {
  const lang = document.documentElement.lang?.trim();

  return lang || undefined;
}

async function loadInitialCatalog(): Promise<void> {
  const locale = resolveServerLocale();

  try {
    await ensureLocaleCatalog(locale);
    return;
  } catch (error) {
    console.error("[i18n] failed to load the locale catalog, retrying once", error);
  }

  try {
    await ensureLocaleCatalog(locale);
  } catch (error) {
    // A dead page is worse than untranslated copy: hydrate anyway and let the
    // locale provider retry the load on mount.
    console.error("[i18n] locale catalog unavailable, hydrating without translations", error);
  }
}

void loadInitialCatalog().then(() => {
  startTransition(() => {
    hydrateRoot(
      document,
      <StrictMode>
        <StartClient />
      </StrictMode>,
    );
  });
});
