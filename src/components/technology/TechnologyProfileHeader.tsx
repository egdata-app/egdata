import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Clock3, ExternalLink, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocale } from "@/hooks/use-locale";
import { TechnologyApiError } from "@/lib/technology-api-client";
import { useTranslation } from "@/lib/paraglide-react";
import { technologyProfileQueryOptions } from "@/queries/technology-profile";
import type { TechnologyCategory } from "@/types/technology-profile";

const POLLING_LIMIT_MS = 2 * 60 * 1_000;

export function formatTechnologyKey(id: string): string {
  const formatted = id
    .replace(/([a-z0-9])([A-Z])/gu, "$1 $2")
    .replace(/[_.-]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
  return formatted || id;
}

function StatusCard({
  title,
  description,
  pending = false,
}: {
  title: string;
  description: string;
  pending?: boolean;
}) {
  const Icon = pending ? Clock3 : AlertCircle;
  return (
    <section
      className="rounded-lg border border-border/60 bg-card/50 p-5 md:p-6"
      aria-live="polite"
      aria-busy={pending}
    >
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <div className="min-w-0 space-y-2">
          <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
          <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">{description}</p>
          {pending && <Skeleton className="h-3 w-48" />}
        </div>
      </div>
    </section>
  );
}

export function TechnologyProfileHeader({ id }: { id: string }) {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const pollStartedAt = useRef(Date.now());
  const fallbackName = formatTechnologyKey(id);

  useEffect(() => {
    pollStartedAt.current = Date.now();
  }, [id]);

  const query = useQuery({
    ...technologyProfileQueryOptions(id),
    refetchInterval: (currentQuery) => {
      const data = currentQuery.state.data;
      if (data?.status !== "pending") return false;
      if (Date.now() - pollStartedAt.current >= POLLING_LIMIT_MS) return false;
      return data.retryAfterMs;
    },
    refetchIntervalInBackground: false,
  });

  if (query.isPending || query.data?.status === "pending") {
    return (
      <StatusCard
        pending
        title={t("technologies.pendingTitle", { name: fallbackName })}
        description={t("technologies.pendingDescription")}
      />
    );
  }

  if (query.isError) {
    const notFound = query.error instanceof TechnologyApiError && query.error.status === 404;
    return (
      <StatusCard
        title={notFound ? t("technologies.notFoundTitle") : t("technologies.serviceTitle")}
        description={
          notFound ? t("technologies.notFoundDescription") : t("technologies.serviceDescription")
        }
      />
    );
  }

  if (query.data.status === "failed") {
    return (
      <StatusCard
        title={t("technologies.serviceTitle")}
        description={t("technologies.serviceDescription")}
      />
    );
  }

  if (query.data.status === "unresolved") {
    const reason: Record<typeof query.data.reason, string> = {
      ambiguous: t("technologies.unresolved.ambiguous"),
      unknown: t("technologies.unresolved.unknown"),
      insufficient_sources: t("technologies.unresolved.insufficientSources"),
    };
    return (
      <StatusCard
        title={t("technologies.unresolvedTitle", { name: fallbackName })}
        description={reason[query.data.reason]}
      />
    );
  }

  const { logo, profile, sources } = query.data;
  const categories: Record<TechnologyCategory, string> = {
    engine: t("technologies.categories.engine"),
    graphics: t("technologies.categories.graphics"),
    audio: t("technologies.categories.audio"),
    physics: t("technologies.categories.physics"),
    networking: t("technologies.categories.networking"),
    anti_cheat: t("technologies.categories.anti_cheat"),
    runtime: t("technologies.categories.runtime"),
    framework: t("technologies.categories.framework"),
    middleware: t("technologies.categories.middleware"),
    platform_service: t("technologies.categories.platform_service"),
    tooling: t("technologies.categories.tooling"),
    file_format: t("technologies.categories.file_format"),
    other: t("technologies.categories.other"),
  };
  const generatedDate = new Intl.DateTimeFormat(locale ?? "en-US", {
    dateStyle: "medium",
  }).format(new Date(query.data.generatedAt));

  return (
    <section className="rounded-lg border border-border/60 bg-card/50 p-5 md:p-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col items-start justify-between gap-3 md:flex-row md:gap-6">
          <div className="flex min-w-0 items-start gap-4">
            {logo && (
              <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/60 bg-muted/40 p-2 sm:size-20">
                <img
                  src={logo.url}
                  alt={t("technologies.logoAlt", { name: profile.displayName })}
                  width={80}
                  height={80}
                  loading="eager"
                  decoding="async"
                  className="size-full object-contain"
                />
              </div>
            )}
            <div className="min-w-0 space-y-3">
              <h1 lang="en" className="font-display text-3xl font-bold tracking-tight md:text-4xl">
                {profile.displayName}
              </h1>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{categories[profile.category]}</Badge>
                {profile.vendor && (
                  <Badge lang="en" variant="outline">
                    {profile.vendor}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          {profile.officialUrl && (
            <a
              href={profile.officialUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {t("technologies.official")}
              <ExternalLink className="size-3.5" aria-hidden="true" />
              <span className="sr-only">({t("technologies.externalLink")})</span>
            </a>
          )}
        </div>

        <p lang="en" className="max-w-4xl text-sm leading-7 text-foreground/90 md:text-base">
          {profile.summary}
        </p>

        {profile.aliases.length > 0 && (
          <p lang="en" className="font-mono text-xs text-muted-foreground">
            {profile.aliases.join(" · ")}
          </p>
        )}

        <div className="border-t border-border/50 pt-4">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("technologies.sources")}
          </h2>
          <ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
            {sources.map((source) => (
              <li key={source.url}>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span lang="en">{source.title}</span>
                  <ExternalLink className="size-3" aria-hidden="true" />
                  <span className="sr-only">({t("technologies.externalLink")})</span>
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Sparkles className="size-3.5" aria-hidden="true" />
            {t("technologies.aiDisclosure")}
          </span>
          <time dateTime={query.data.generatedAt}>
            {t("technologies.generatedOn", { date: generatedDate })}
          </time>
          {query.data.stale && <span>{t("technologies.stale")}</span>}
        </div>
      </div>
    </section>
  );
}
