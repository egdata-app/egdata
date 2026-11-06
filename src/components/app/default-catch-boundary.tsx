import {
  ErrorComponent,
  type ErrorComponentProps,
  Link,
  rootRouteId,
  useMatch,
  useRouter,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { captureError } from "@/lib/pulse-telemetry";
import { isProofOfWorkRecoveryError } from "@/lib/pow/errors";
import { useTranslation } from "@/lib/paraglide-react";
import { Button } from "../ui/button";

export function DefaultCatchBoundary({ error }: ErrorComponentProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const isRecoveryError = isProofOfWorkRecoveryError(error);
  const isRoot = useMatch({
    strict: false,
    select: (state) => state.id === rootRouteId,
  });

  useEffect(() => {
    console.error(error);
    captureError(error, {
      source: "router.catch-boundary",
    });
  }, [error]);

  return (
    <div className="min-w-0 flex-1 p-4 flex flex-col items-center justify-center gap-6">
      {isRecoveryError ? (
        <div role="alert" className="max-w-md text-center">
          <h1 className="font-display text-lg font-semibold">{t("pow.failure.title")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("pow.failure.description")}</p>
        </div>
      ) : (
        <ErrorComponent error={error} />
      )}
      <div className="flex gap-2 items-center flex-wrap">
        <Button
          onClick={() => {
            router.invalidate();
          }}
          className="px-2 py-1 bg-muted rounded text-foreground uppercase font-extrabold"
        >
          {t("pow.failure.retry")}
        </Button>
        {isRoot ? (
          <Link
            to="/{-$locale}"
            className={"px-2 py-1 bg-muted rounded text-foreground uppercase font-extrabold"}
          >
            Home
          </Link>
        ) : (
          <Link
            to="/{-$locale}"
            className={"px-2 py-1 bg-muted rounded text-foreground uppercase font-extrabold"}
            onClick={(e) => {
              e.preventDefault();
              window.history.back();
            }}
          >
            Go Back
          </Link>
        )}
      </div>
    </div>
  );
}
