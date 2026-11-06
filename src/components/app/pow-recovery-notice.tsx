import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { Loader2, RotateCcw, ShieldCheck, X } from "lucide-react";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/paraglide-react";
import {
  clearRecoveryFailure,
  getRecoveryEventServerSnapshot,
  getRecoveryEventSnapshot,
  subscribeToRecoveryEvents,
} from "@/lib/pow/recovery-events";

/**
 * Subtle, non-blocking status for on-demand proof-of-work recovery. Existing
 * page data stays mounted; only this small notice changes.
 */
export function ProofOfWorkRecoveryNotice() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const router = useRouter();
  const state = useSyncExternalStore(
    subscribeToRecoveryEvents,
    getRecoveryEventSnapshot,
    getRecoveryEventServerSnapshot,
  );

  if (state.active > 0) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="fixed bottom-4 right-4 z-[60] flex max-w-sm items-center gap-3 rounded-lg border border-border/60 bg-background/95 px-4 py-3 text-sm shadow-lg backdrop-blur"
      >
        <Loader2 className="size-4 shrink-0 animate-spin text-primary" aria-hidden="true" />
        <div className="min-w-0">
          <p className="font-medium leading-tight">{t("pow.recovery.title")}</p>
          <p className="text-xs text-muted-foreground">{t("pow.recovery.description")}</p>
        </div>
      </div>
    );
  }

  if (state.failureId === 0) {
    return null;
  }

  return (
    <div
      role="alert"
      className="fixed bottom-4 right-4 z-[60] flex max-w-sm flex-col gap-3 rounded-lg border border-border/60 bg-background/95 px-4 py-3 text-sm shadow-lg backdrop-blur"
    >
      <div className="flex items-start gap-3">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
        <div className="min-w-0">
          <p className="font-medium leading-tight">{t("pow.failure.title")}</p>
          <p className="text-xs text-muted-foreground">{t("pow.failure.description")}</p>
        </div>
        <button
          type="button"
          className="ml-auto rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
          aria-label={t("pow.failure.dismiss")}
          onClick={() => clearRecoveryFailure()}
        >
          <X className="size-3.5" aria-hidden="true" />
        </button>
      </div>
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            clearRecoveryFailure();
            void queryClient.invalidateQueries();
            void router.invalidate();
          }}
        >
          <RotateCcw className="size-4" />
          {t("pow.failure.retry")}
        </Button>
      </div>
    </div>
  );
}
