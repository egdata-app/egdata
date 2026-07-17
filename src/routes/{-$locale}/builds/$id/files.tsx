import { SandboxDataSurface } from "@/components/app/sandbox-layout";
import {
  BuildHistoryExplorer,
  buildHealthBadgeClass,
} from "@/components/app/build-history-explorer";
import { BuildFilesTree } from "@/components/app/build-files-tree";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { calculateSize } from "@/lib/calculate-size";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/paraglide-react";
import {
  buildComparisonQueryOptions,
  buildFileTreeQueryOptions,
  buildHistoryQueryOptions,
  buildQueryOptions,
} from "@/queries/build-details";
import type { BuildFileChangeStatus } from "@/types/builds";
import type { DehydratedState } from "@tanstack/react-query";
import { dehydrate, HydrationBoundary, keepPreviousData, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangleIcon, ChevronLeftIcon, ChevronRightIcon, SearchIcon } from "lucide-react";
import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type BuildFilesSearch = {
  view: "changes" | "all";
  compare?: string;
  status?: string;
  q?: string;
  extension?: string;
  path?: string;
  page: number;
};

function normalizeSearch(search: Record<string, unknown>): BuildFilesSearch {
  const pageValue =
    typeof search.page === "number" ? search.page : Number.parseInt(String(search.page ?? "1"), 10);
  return {
    view: search.view === "all" ? "all" : "changes",
    compare: typeof search.compare === "string" && search.compare ? search.compare : undefined,
    status: typeof search.status === "string" && search.status ? search.status : undefined,
    q: typeof search.q === "string" && search.q ? search.q : undefined,
    extension:
      typeof search.extension === "string" && search.extension ? search.extension : undefined,
    path: typeof search.path === "string" && search.path ? search.path : undefined,
    page: Number.isFinite(pageValue) && pageValue > 0 ? pageValue : 1,
  };
}

export const Route = createFileRoute("/{-$locale}/builds/$id/files")({
  validateSearch: normalizeSearch,
  component: () => {
    const { dehydratedState, id } = Route.useLoaderData() as {
      dehydratedState: DehydratedState;
      id: string;
    };
    return (
      <HydrationBoundary state={dehydratedState}>
        <FilesPage key={id} />
      </HydrationBoundary>
    );
  },
  loaderDeps: ({ search }) => search,
  loader: async ({ params, context, deps }) => {
    const { id } = params;
    await Promise.allSettled([
      context.queryClient.ensureQueryData(buildHistoryQueryOptions(id)),
      context.queryClient.ensureQueryData(buildQueryOptions(id)),
    ]);
    if (deps.view === "all") {
      await Promise.allSettled([
        context.queryClient.ensureQueryData(
          buildFileTreeQueryOptions(id, { path: deps.path, page: deps.page, limit: 100 }),
        ),
      ]);
    } else if (deps.compare) {
      await Promise.allSettled([
        context.queryClient.ensureQueryData(
          buildComparisonQueryOptions(id, deps.compare, {
            page: deps.page,
            q: deps.q,
            extension: deps.extension,
            status: deps.status,
          }),
        ),
      ]);
    }
    return { id, dehydratedState: dehydrate(context.queryClient) };
  },
});

function signedSize(value: number | null | undefined) {
  if (value === null || value === undefined) return "N/A";
  if (value === 0) return "0 Bytes";
  return `${value > 0 ? "+" : "−"}${calculateSize(Math.abs(value))}`;
}

function statusBadge(status: BuildFileChangeStatus) {
  const variants = {
    added: "default",
    modified: "secondary",
    removed: "destructive",
    unchanged: "outline",
  } as const;
  return variants[status];
}

function FilesPage() {
  const { t } = useTranslation();
  const { id } = Route.useLoaderData() as { dehydratedState: DehydratedState; id: string };
  const { locale } = Route.useParams();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { data: build } = useQuery(buildQueryOptions(id));
  const { data: history } = useQuery(buildHistoryQueryOptions(id));
  const baseline = search.compare ?? history?.previousComparableBuildId ?? undefined;
  const [query, setQuery] = useState(search.q ?? "");
  const [extension, setExtension] = useState(search.extension ?? "");

  useEffect(() => {
    if (search.view === "changes" && !search.compare && history?.previousComparableBuildId) {
      navigate({
        search: (previous) => ({
          ...previous,
          compare: history.previousComparableBuildId ?? undefined,
        }),
        replace: true,
        resetScroll: false,
      });
    }
  }, [history?.previousComparableBuildId, navigate, search.compare, search.view]);

  const updateSearch = useCallback(
    (updates: Partial<BuildFilesSearch>, replace = false) =>
      navigate({
        search: (previous) => normalizeSearch({ ...previous, ...updates }),
        replace,
        resetScroll: false,
      }),
    [navigate],
  );

  const submitFilters = (event: FormEvent) => {
    event.preventDefault();
    updateSearch({ q: query || undefined, extension: extension || undefined, page: 1 });
  };

  const statuses = useMemo(
    () =>
      (search.status ?? "added,modified,removed")
        .split(",")
        .filter(Boolean) as BuildFileChangeStatus[],
    [search.status],
  );

  return (
    <main className="flex h-full w-full flex-col gap-5 px-4" data-testid="build-comparison">
      <BuildHistoryExplorer
        builds={history?.data ?? []}
        currentId={id}
        baselineId={baseline}
        onSelectCurrent={(buildId) =>
          navigate({
            to: "/{-$locale}/builds/$id/files",
            params: { locale, id: buildId },
            search: { view: search.view, compare: baseline, page: 1 },
          })
        }
        onSelectBaseline={(compare) =>
          updateSearch(search.view === "changes" ? { compare, page: 1 } : { compare })
        }
        onSwap={() => {
          if (!baseline) return;
          navigate({
            to: "/{-$locale}/builds/$id/files",
            params: { locale, id: baseline },
            search: { view: search.view, compare: id, page: 1 },
          });
        }}
      />

      <div
        className="flex flex-wrap items-center gap-2 rounded-lg border border-border/60 bg-card/30 p-2"
        role="group"
        aria-label={t("builds.comparison.changes")}
      >
        <Button
          variant={search.view === "changes" ? "default" : "outline"}
          size="sm"
          aria-pressed={search.view === "changes"}
          onClick={() => updateSearch({ view: "changes", path: undefined, page: 1 })}
        >
          {t("builds.comparison.changes")}
        </Button>
        <Button
          variant={search.view === "all" ? "default" : "outline"}
          size="sm"
          aria-pressed={search.view === "all"}
          onClick={() =>
            updateSearch({
              view: "all",
              status: undefined,
              q: undefined,
              extension: undefined,
              path: undefined,
              page: 1,
            })
          }
        >
          {t("builds.comparison.allFiles")}
        </Button>
      </div>

      {search.view === "all" ? (
        <SandboxDataSurface title={t("builds.files.title")}>
          <BuildFilesTree
            id={id}
            baseline={baseline}
            path={search.path}
            page={search.page}
            onNavigate={(path, page) => updateSearch({ path, page })}
          />
        </SandboxDataSurface>
      ) : !baseline ? (
        <Alert data-testid="build-diff-empty">
          <AlertTriangleIcon />
          <AlertTitle>{t("builds.comparison.noPrevious")}</AlertTitle>
          <AlertDescription>{t("builds.comparison.noPreviousDescription")}</AlertDescription>
        </Alert>
      ) : build?.manifest.status !== "verified" &&
        build?.manifest.status !== "legacy_unverified" ? (
        <Alert variant="destructive" data-testid="build-diff-error">
          <AlertTriangleIcon />
          <AlertTitle>{t("builds.comparison.unavailable")}</AlertTitle>
          <AlertDescription>{t("builds.comparison.unavailableDescription")}</AlertDescription>
        </Alert>
      ) : (
        <ComparisonView
          id={id}
          baseline={baseline}
          search={search}
          query={query}
          extension={extension}
          setQuery={setQuery}
          setExtension={setExtension}
          submitFilters={submitFilters}
          statuses={statuses}
          updateSearch={updateSearch}
        />
      )}
    </main>
  );
}

type UpdateSearch = (updates: Partial<BuildFilesSearch>, replace?: boolean) => void;

function ComparisonView({
  id,
  baseline,
  search,
  query,
  extension,
  setQuery,
  setExtension,
  submitFilters,
  statuses,
  updateSearch,
}: {
  id: string;
  baseline: string;
  search: BuildFilesSearch;
  query: string;
  extension: string;
  setQuery: (value: string) => void;
  setExtension: (value: string) => void;
  submitFilters: (event: FormEvent) => void;
  statuses: BuildFileChangeStatus[];
  updateSearch: UpdateSearch;
}) {
  const { t } = useTranslation();
  const comparisonQuery = useQuery({
    ...buildComparisonQueryOptions(id, baseline, {
      page: search.page,
      q: search.q,
      extension: search.extension,
      status: search.status,
    }),
    placeholderData: keepPreviousData,
  });
  const comparison = comparisonQuery.data;
  if (comparisonQuery.isError) {
    return (
      <Alert variant="destructive" data-testid="build-diff-error">
        <AlertTriangleIcon />
        <AlertTitle>{t("builds.comparison.error")}</AlertTitle>
        <AlertDescription>{t("builds.comparison.errorDescription")}</AlertDescription>
      </Alert>
    );
  }
  if (!comparison)
    return (
      <div data-testid="build-diff-loading" className="py-8 text-sm text-muted-foreground">
        {t("builds.comparison.loading")}
      </div>
    );

  const summaryCards = [
    ["added", comparison.summary.files.added],
    ["modified", comparison.summary.files.modified],
    ["removed", comparison.summary.files.removed],
  ] as const;
  const totalPages = Math.max(1, Math.ceil(comparison.total / comparison.limit));

  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-3 rounded-lg border border-border/60 bg-card/30 p-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t("builds.comparison.summary")}
          </p>
          <h2 className="mt-1 truncate text-lg font-semibold">{comparison.target.buildVersion}</h2>
          <p className="mt-1 truncate text-sm text-muted-foreground">
            {t("builds.comparison.compareAgainst")}: {comparison.base.buildVersion}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge
            variant="outline"
            className={buildHealthBadgeClass(comparison.target.manifest.status)}
          >
            {t(`builds.health.${comparison.target.manifest.status}`)}
          </Badge>
          {comparison.comparisonScope === "cross_stream" && (
            <Badge variant="outline">{t("builds.comparison.crossStream")}</Badge>
          )}
        </div>
      </section>
      {comparison.comparisonScope === "cross_stream" && (
        <Alert>
          <AlertTriangleIcon />
          <AlertTitle>{t("builds.comparison.crossStream")}</AlertTitle>
        </Alert>
      )}
      {comparison.warnings.includes("LEGACY_UNVERIFIED_SNAPSHOT") && (
        <Alert
          className="border-amber-500/40 bg-amber-500/5 text-amber-100 [&>svg]:text-amber-300"
          data-testid="build-diff-legacy-warning"
        >
          <AlertTriangleIcon />
          <AlertTitle>{t("builds.comparison.rawWarning")}</AlertTitle>
          <AlertDescription>{t("builds.comparison.unavailableDescription")}</AlertDescription>
        </Alert>
      )}
      <section
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
        data-testid="build-diff-summary"
        aria-label={t("builds.comparison.summary")}
      >
        {summaryCards.map(([status, count]) => (
          <Card key={status}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">
                {t(`builds.comparison.status.${status}`)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{count.toLocaleString()}</p>
            </CardContent>
          </Card>
        ))}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              {t("builds.comparison.installedDelta")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">
              {signedSize(comparison.summary.installedSizeBytes.delta)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("builds.comparison.fullDownloadDelta")}:{" "}
              {signedSize(comparison.summary.fullDownloadSizeBytes.delta)}
            </p>
          </CardContent>
        </Card>
      </section>

      <SandboxDataSurface
        title={t("builds.comparison.changedFiles")}
        description={t("builds.comparison.downloadDisclaimer")}
        badge={`${comparison.summary.files.unchanged.toLocaleString()} ${t("builds.comparison.unchanged")}`}
      >
        <form className="flex flex-col gap-2 md:flex-row" onSubmit={submitFilters}>
          <label className="relative flex-1">
            <span className="sr-only">{t("builds.comparison.search")}</span>
            <SearchIcon className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("builds.comparison.searchPlaceholder")}
              className="pl-9"
            />
          </label>
          <Input
            value={extension}
            onChange={(event) => setExtension(event.target.value)}
            placeholder={t("builds.comparison.extensionPlaceholder")}
            className="md:w-44"
          />
          <Button type="submit" variant="outline">
            {t("builds.comparison.apply")}
          </Button>
        </form>
        <ToggleGroup
          type="multiple"
          value={statuses}
          onValueChange={(values) =>
            values.length && updateSearch({ status: values.join(","), page: 1 })
          }
          variant="outline"
          className="flex-wrap justify-start"
        >
          {(["added", "modified", "removed", "unchanged"] as const).map((status) => (
            <ToggleGroupItem
              key={status}
              value={status}
              aria-label={t(`builds.comparison.status.${status}`)}
            >
              {t(`builds.comparison.status.${status}`)}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        <div className="w-full overflow-x-auto rounded-md border" data-testid="build-diff-table">
          <Table className="min-w-[900px]">
            <TableHeader>
              <TableRow>
                <TableHead>{t("builds.comparison.columns.status")}</TableHead>
                <TableHead>{t("builds.comparison.columns.path")}</TableHead>
                <TableHead>{t("builds.comparison.columns.size")}</TableHead>
                <TableHead>{t("builds.comparison.columns.delta")}</TableHead>
                <TableHead>{t("builds.comparison.columns.hash")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {comparison.changes.length ? (
                comparison.changes.map((change) => (
                  <TableRow
                    key={`${change.status}:${change.path}`}
                    data-file-path={change.path}
                    data-change-kind={change.status}
                  >
                    <TableCell>
                      <Badge variant={statusBadge(change.status)}>
                        {t(`builds.comparison.status.${change.status}`)}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[420px] break-all font-mono text-xs">
                      {change.path}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {calculateSize(change.before?.fileSize)} →{" "}
                      {calculateSize(change.after?.fileSize)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "font-mono text-xs",
                        change.sizeDeltaBytes > 0 && "text-emerald-600",
                        change.sizeDeltaBytes < 0 && "text-red-600",
                      )}
                    >
                      {signedSize(change.sizeDeltaBytes)}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {change.before?.fileHash ? `${change.before.fileHash.slice(0, 8)}…` : "—"} →{" "}
                      {change.after?.fileHash ? `${change.after.fileHash.slice(0, 8)}…` : "—"}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="h-24 text-center"
                    data-testid="build-diff-empty"
                  >
                    {t("builds.comparison.empty")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-end gap-2 text-sm">
          <span className="mr-2 text-muted-foreground">
            {t("builds.comparison.page", { page: search.page, total: totalPages })}
          </span>
          <Button
            variant="outline"
            size="icon"
            disabled={search.page <= 1}
            onClick={() => updateSearch({ page: search.page - 1 })}
          >
            <ChevronLeftIcon />
            <span className="sr-only">{t("builds.comparison.previousPage")}</span>
          </Button>
          <Button
            variant="outline"
            size="icon"
            disabled={search.page >= totalPages}
            onClick={() => updateSearch({ page: search.page + 1 })}
          >
            <ChevronRightIcon />
            <span className="sr-only">{t("builds.comparison.nextPage")}</span>
          </Button>
        </div>
      </SandboxDataSurface>
    </div>
  );
}
