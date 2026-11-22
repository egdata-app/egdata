import {
  type ErrorComponentProps,
  Link,
  rootRouteId,
  useMatch,
  useRouter,
} from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  ChevronDown,
  Copy,
  ExternalLink,
  Home,
  RotateCcw,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DiscordIcon } from "@/components/icons/discord";
import { Badge } from "@/components/ui/badge";
import { Button, LinkButton } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useTranslation } from "@/lib/i18n";
import { isAbuseTarpitError, isProofOfWorkRecoveryError } from "@/lib/pow/errors";
import { captureError } from "@/lib/pulse-telemetry";
import { resolveStackTrace } from "@/lib/resolve-stack-trace";

const GITHUB_NEW_ISSUE_URL = "https://github.com/nachoaldamav/egdata/issues/new";

function extractErrorInfo(error: unknown): { name: string; message: string; stack?: string } {
  if (error instanceof Error) {
    return {
      name: error.name || "Error",
      message: error.message || "Unknown error",
      stack: error.stack,
    };
  }

  if (typeof error === "string") {
    return { name: "Error", message: error };
  }

  try {
    return { name: "Error", message: JSON.stringify(error) };
  } catch {
    return { name: "Error", message: String(error) };
  }
}

export function DefaultCatchBoundary({ error }: ErrorComponentProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const isTarpit = isAbuseTarpitError(error);
  const isRecoveryError = isProofOfWorkRecoveryError(error) || isTarpit;
  const isRoot = useMatch({
    strict: false,
    select: (state) => state.id === rootRouteId,
  });

  const errorInfo = useMemo(() => extractErrorInfo(error), [error]);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [resolvedStack, setResolvedStack] = useState<string | null>(null);
  const [isSourceMapped, setIsSourceMapped] = useState(false);
  const [isResolvingStack, setIsResolvingStack] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    console.error(error);
    captureError(error, {
      source: "router.catch-boundary",
    });
  }, [error]);

  useEffect(() => {
    setResolvedStack(null);
    setIsSourceMapped(false);
    setIsResolvingStack(false);
  }, [errorInfo.stack]);

  const ensureResolvedStack = useCallback(async (): Promise<string | undefined> => {
    if (!errorInfo.stack) return undefined;
    if (resolvedStack !== null) return resolvedStack;

    setIsResolvingStack(true);
    try {
      const result = await resolveStackTrace(errorInfo.stack);
      setResolvedStack(result.stack);
      setIsSourceMapped(result.resolvedCount > 0);
      return result.stack;
    } finally {
      setIsResolvingStack(false);
    }
  }, [errorInfo.stack, resolvedStack]);

  const handleToggleDetails = (expanded: boolean) => {
    setDetailsOpen(expanded);
    if (expanded && errorInfo.stack && resolvedStack === null && !isResolvingStack) {
      void ensureResolvedStack();
    }
  };

  const buildReportText = async () => {
    const stack = await ensureResolvedStack();
    const url = typeof window !== "undefined" ? window.location.href : "unknown";
    const timestamp = new Date().toISOString();

    return [
      `Error: ${errorInfo.name}: ${errorInfo.message}`,
      `URL: ${url}`,
      `Time: ${timestamp}`,
      stack ? `\nStack:\n${stack}` : "",
    ]
      .filter(Boolean)
      .join("\n");
  };

  const handleCopyDetails = async () => {
    const report = await buildReportText();
    try {
      await navigator.clipboard.writeText(report);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API may be unavailable in restricted contexts
    }
  };

  const githubIssueHref = useMemo(() => {
    const title = `[Bug] ${errorInfo.name}: ${errorInfo.message}`.slice(0, 120);
    const url = typeof window !== "undefined" ? window.location.href : "";
    const stackSnippet = (resolvedStack ?? errorInfo.stack ?? "").slice(0, 1500);
    const body = [
      "### What happened?",
      "",
      `Encountered \`${errorInfo.name}: ${errorInfo.message}\``,
      url ? `\n**Page:** ${url}` : "",
      stackSnippet ? `\n\`\`\`\n${stackSnippet}\n\`\`\`` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const params = new URLSearchParams({ title, body });
    return `${GITHUB_NEW_ISSUE_URL}?${params.toString()}`;
  }, [errorInfo.message, errorInfo.name, errorInfo.stack, resolvedStack]);

  if (isRecoveryError) {
    return (
      <div className="min-w-0 flex-1 p-4 flex flex-col items-center justify-center gap-6">
        <div role="alert" className="max-w-md text-center">
          <h1 className="font-display text-lg font-semibold">
            {t(isTarpit ? "pow.tarpit.title" : "pow.failure.title")}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t(isTarpit ? "pow.tarpit.description" : "pow.failure.description")}
          </p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <Button
            onPress={() => {
              router.invalidate();
            }}
          >
            <RotateCcw className="size-3.5" />
            {t("pow.failure.retry")}
          </Button>
          {isRoot ? (
            <Link
              to="/{-$locale}"
              className="inline-flex h-7 items-center gap-1 rounded-md border border-border px-2 text-xs font-medium hover:bg-input/50"
            >
              <Home className="size-3.5" />
              {t("errorBoundary.home")}
            </Link>
          ) : (
            <Button
              variant="outline"
              onPress={() => {
                window.history.back();
              }}
            >
              <ArrowLeft className="size-3.5" />
              {t("errorBoundary.goBack")}
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-w-0 flex-1 p-4 md:p-8 flex items-center justify-center">
      <Card role="alert" className="w-full max-w-2xl border-destructive/30">
        <CardHeader className="gap-2">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-destructive/15 text-destructive">
              <AlertTriangle className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="font-display text-lg">{t("errorBoundary.title")}</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t("errorBoundary.description")}
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="rounded-lg border border-destructive/25 bg-destructive/5 px-3.5 py-2.5">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="destructive" className="font-mono text-[11px]">
                {errorInfo.name}
              </Badge>
              <span className="text-sm font-medium text-foreground break-words">
                {errorInfo.message}
              </span>
            </div>
          </div>

          <Collapsible isExpanded={detailsOpen} onExpandedChange={handleToggleDetails}>
            <div className="rounded-lg border border-border bg-muted/30">
              <CollapsibleTrigger className="flex w-full items-center justify-between px-3.5 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                <span className="flex items-center gap-2">
                  <span>{t("errorBoundary.technicalDetails")}</span>
                  {isSourceMapped && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      {t("errorBoundary.sourceMapped")}
                    </Badge>
                  )}
                  {isResolvingStack && (
                    <span className="text-[11px] text-muted-foreground">
                      {t("errorBoundary.resolvingSourceMaps")}
                    </span>
                  )}
                </span>
                <ChevronDown
                  className={`size-4 transition-transform duration-150 ${
                    detailsOpen ? "rotate-180" : ""
                  }`}
                />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="border-t border-border p-3">
                  <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-all font-mono text-[11px] leading-relaxed text-muted-foreground">
                    {resolvedStack ?? errorInfo.stack ?? t("errorBoundary.noStack")}
                  </pre>
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        </CardContent>

        <CardFooter className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onPress={() => {
                router.invalidate();
              }}
            >
              <RotateCcw className="size-3.5" />
              {t("errorBoundary.retry")}
            </Button>

            {isRoot ? (
              <Link
                to="/{-$locale}"
                className="inline-flex h-7 items-center gap-1 rounded-md border border-border px-2 text-xs font-medium hover:bg-input/50"
              >
                <Home className="size-3.5" />
                {t("errorBoundary.home")}
              </Link>
            ) : (
              <Button
                variant="outline"
                onPress={() => {
                  window.history.back();
                }}
              >
                <ArrowLeft className="size-3.5" />
                {t("errorBoundary.goBack")}
              </Button>
            )}

            <Button variant="outline" onPress={() => void handleCopyDetails()}>
              {copied ? (
                <Check className="size-3.5 text-emerald-500" />
              ) : (
                <Copy className="size-3.5" />
              )}
              {copied ? t("errorBoundary.copied") : t("errorBoundary.copyDetails")}
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              className="bg-indigo-500/15 text-indigo-300 hover:bg-indigo-500/25 border border-indigo-500/30"
              onPress={() => {
                window.open("/api/discord", "_blank", "noopener,noreferrer");
              }}
            >
              <DiscordIcon className="size-3.5 fill-current" />
              {t("errorBoundary.discord")}
            </Button>

            <LinkButton
              href={githubIssueHref}
              target="_blank"
              rel="noopener noreferrer"
              variant="ghost"
            >
              <ExternalLink className="size-3.5" />
              {t("errorBoundary.reportGithub")}
            </LinkButton>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
