import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { calculateSize } from "@/lib/calculate-size";
import type { TFunction } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/paraglide-react";
import { buildComparisonQueryOptions, buildFileTreeQueryOptions } from "@/queries/build-details";
import type { BuildFileChangeStatus, BuildFileTreeFileNode } from "@/types/builds";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  FileIcon,
  FolderIcon,
} from "lucide-react";
import { useMemo, useState } from "react";

const PAGE_SIZE = 100;
const ALL_FILE_STATUSES = "added,modified,removed,unchanged";

interface BuildFilesTreeProps {
  id: string;
  baseline?: string;
  path?: string;
  page: number;
  onNavigate: (path: string | undefined, page: number) => void;
}

function statusVariant(status: BuildFileChangeStatus) {
  const variants = {
    added: "default",
    modified: "secondary",
    removed: "destructive",
    unchanged: "outline",
  } as const;
  return variants[status];
}

function localizedSize(value: number | null | undefined, t: TFunction) {
  if (value === null || value === undefined) return t("builds.files.details.notAvailable");
  if (value === 0) return t("builds.files.details.zeroBytes");
  return calculateSize(value);
}

function signedSize(value: number | null | undefined, t: TFunction) {
  if (value === null || value === undefined) return t("builds.files.details.notAvailable");
  if (value === 0) return t("builds.files.details.zeroBytes");
  return `${value > 0 ? "+" : "−"}${calculateSize(Math.abs(value))}`;
}

export function BuildFilesTree({ id, baseline, path, page, onNavigate }: BuildFilesTreeProps) {
  const { t } = useTranslation();
  const selectionContext = `${id}:${path ?? ""}:${page}`;
  const [selection, setSelection] = useState<{
    context: string;
    file: BuildFileTreeFileNode;
  }>();
  const selectedFile = selection?.context === selectionContext ? selection.file : undefined;
  const treeQuery = useQuery(buildFileTreeQueryOptions(id, { path, page, limit: PAGE_SIZE }));
  const comparisonQuery = useQuery({
    ...buildComparisonQueryOptions(id, baseline ?? "", {
      page: 1,
      q: selectedFile?.path,
      status: ALL_FILE_STATUSES,
    }),
    enabled: Boolean(selectedFile && baseline),
  });

  const breadcrumbs = useMemo(() => {
    const segments = (path ?? "").split("/").filter(Boolean);
    return segments.map((name, index) => ({
      name,
      path: segments.slice(0, index + 1).join("/"),
    }));
  }, [path]);

  const comparison = comparisonQuery.data;
  const selectedChange = comparison?.changes.find((change) => change.path === selectedFile?.path);
  const totalPages = treeQuery.data
    ? Math.max(1, Math.ceil(treeQuery.data.total / treeQuery.data.limit))
    : 1;

  return (
    <div className="flex flex-col gap-4" data-testid="build-files-tree">
      {treeQuery.data?.manifestStatus && treeQuery.data.manifestStatus !== "verified" && (
        <Alert data-testid="build-tree-manifest-warning">
          <AlertTriangleIcon />
          <AlertTitle>{t("builds.comparison.rawWarning")}</AlertTitle>
          <AlertDescription>{t("builds.comparison.unavailableDescription")}</AlertDescription>
        </Alert>
      )}

      <nav
        aria-label={t("builds.files.breadcrumb")}
        className="flex min-w-0 flex-wrap items-center gap-1 text-sm"
        data-testid="build-tree-breadcrumbs"
      >
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 px-2"
          aria-current={!path ? "page" : undefined}
          onClick={() => onNavigate(undefined, 1)}
        >
          {t("builds.files.root")}
        </Button>
        {breadcrumbs.map((crumb, index) => (
          <span key={crumb.path} className="inline-flex min-w-0 items-center gap-1">
            <ChevronRightIcon className="size-3.5 shrink-0 text-muted-foreground" />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 max-w-64 truncate px-2 font-mono text-xs"
              aria-current={index === breadcrumbs.length - 1 ? "page" : undefined}
              onClick={() => onNavigate(crumb.path, 1)}
            >
              {crumb.name}
            </Button>
          </span>
        ))}
      </nav>

      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)]">
        <div className="min-w-0">
          {treeQuery.isError ? (
            <Alert variant="destructive" data-testid="build-tree-error">
              <AlertTriangleIcon />
              <AlertTitle>{t("builds.files.error")}</AlertTitle>
              <AlertDescription>{t("builds.files.errorDescription")}</AlertDescription>
            </Alert>
          ) : treeQuery.isPending ? (
            <div
              className="py-12 text-center text-sm text-muted-foreground"
              data-testid="build-tree-loading"
            >
              {t("builds.files.loading")}
            </div>
          ) : (
            <div className="overflow-hidden rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("builds.files.columns.name")}</TableHead>
                    <TableHead className="w-32 text-right">
                      {t("builds.files.columns.size")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {treeQuery.data.nodes.length ? (
                    treeQuery.data.nodes.map((node) => {
                      const selected = node.type === "file" && selectedFile?.path === node.path;
                      return (
                        <TableRow
                          key={`${node.type}:${node.path}`}
                          data-state={selected ? "selected" : undefined}
                          data-node-type={node.type}
                          data-node-path={node.path}
                        >
                          <TableCell className="min-w-0">
                            <Button
                              type="button"
                              variant="ghost"
                              className="h-auto min-w-0 max-w-full justify-start gap-2 px-1 py-1.5 font-normal"
                              aria-label={
                                node.type === "directory"
                                  ? t("builds.files.openFolder", { name: node.name })
                                  : t("builds.files.selectFile", { name: node.name })
                              }
                              aria-pressed={node.type === "file" ? selected : undefined}
                              onClick={() =>
                                node.type === "directory"
                                  ? onNavigate(node.path, 1)
                                  : setSelection({ context: selectionContext, file: node })
                              }
                            >
                              {node.type === "directory" ? (
                                <FolderIcon className="size-4 shrink-0 text-amber-500" />
                              ) : (
                                <FileIcon className="size-4 shrink-0 text-muted-foreground" />
                              )}
                              <span className="truncate font-mono text-xs">{node.name}</span>
                            </Button>
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs text-muted-foreground">
                            {localizedSize(
                              node.type === "directory" ? node.totalSize : node.file.fileSize,
                              t,
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={2}
                        className="h-24 text-center"
                        data-testid="build-tree-empty"
                      >
                        {t("builds.files.empty")}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {treeQuery.data && (
            <div className="mt-4 flex items-center justify-end gap-2 text-sm">
              <span className="mr-2 text-muted-foreground">
                {t("builds.comparison.page", { page, total: totalPages })}
              </span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={page <= 1}
                onClick={() => onNavigate(path, page - 1)}
              >
                <ChevronLeftIcon />
                <span className="sr-only">{t("builds.comparison.previousPage")}</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={page >= totalPages}
                onClick={() => onNavigate(path, page + 1)}
              >
                <ChevronRightIcon />
                <span className="sr-only">{t("builds.comparison.nextPage")}</span>
              </Button>
            </div>
          )}
        </div>

        <aside
          className="min-w-0 lg:sticky lg:top-4 lg:self-start"
          data-testid="build-file-details"
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("builds.files.details.title")}</CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedFile ? (
                <p className="text-sm text-muted-foreground">{t("builds.files.details.prompt")}</p>
              ) : (
                <div className="space-y-5">
                  <div className="min-w-0">
                    <p className="break-all font-mono text-sm font-medium">{selectedFile.path}</p>
                    {selectedChange && (
                      <Badge variant={statusVariant(selectedChange.status)} className="mt-2">
                        {t(`builds.comparison.status.${selectedChange.status}`)}
                      </Badge>
                    )}
                  </div>

                  <dl className="space-y-3 text-sm">
                    <Detail
                      label={t("builds.files.details.currentHash")}
                      value={selectedFile.file.fileHash}
                      mono
                    />
                    <Detail
                      label={t("builds.files.details.currentSize")}
                      value={localizedSize(selectedFile.file.fileSize, t)}
                    />
                    <Detail
                      label={t("builds.files.details.mimeType")}
                      value={selectedFile.file.mimeType || t("builds.files.details.notAvailable")}
                    />
                    <Detail
                      label={t("builds.files.details.installTags")}
                      value={
                        selectedFile.file.installTags.length
                          ? selectedFile.file.installTags.join(", ")
                          : t("builds.files.details.notAvailable")
                      }
                    />
                    <Detail
                      label={t("builds.files.details.symlinkTarget")}
                      value={
                        selectedFile.file.symlinkTarget || t("builds.files.details.notAvailable")
                      }
                      mono={Boolean(selectedFile.file.symlinkTarget)}
                    />
                    <Detail
                      label={t("builds.files.details.flags")}
                      value={String(selectedFile.file.fileMetaFlags)}
                    />
                  </dl>

                  {!baseline ? (
                    <p
                      className="text-sm text-muted-foreground"
                      data-testid="build-file-no-baseline"
                    >
                      {t("builds.files.details.noBaseline")}
                    </p>
                  ) : comparisonQuery.isPending ? (
                    <p className="text-sm text-muted-foreground">
                      {t("builds.files.details.comparing")}
                    </p>
                  ) : comparisonQuery.isError || !selectedChange ? (
                    <Alert variant="destructive" data-testid="build-file-comparison-error">
                      <AlertTriangleIcon />
                      <AlertTitle>{t("builds.files.details.comparisonUnavailable")}</AlertTitle>
                    </Alert>
                  ) : (
                    <div className="border-t pt-4" data-testid="build-file-comparison">
                      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {t("builds.comparison.compareAgainst")}: {comparison?.base.buildVersion}
                      </p>
                      <dl className="space-y-3 text-sm">
                        <Detail
                          label={t("builds.files.details.baselineHash")}
                          value={
                            selectedChange.before?.fileHash ??
                            t("builds.files.details.notAvailable")
                          }
                          mono={Boolean(selectedChange.before?.fileHash)}
                        />
                        <Detail
                          label={t("builds.files.details.baselineSize")}
                          value={localizedSize(selectedChange.before?.fileSize, t)}
                        />
                        <Detail
                          label={t("builds.files.details.sizeDelta")}
                          value={signedSize(selectedChange.sizeDeltaBytes, t)}
                          className={cn(
                            selectedChange.sizeDeltaBytes > 0 && "text-emerald-600",
                            selectedChange.sizeDeltaBytes < 0 && "text-red-600",
                          )}
                        />
                      </dl>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function Detail({
  label,
  value,
  mono = false,
  className,
}: {
  label: string;
  value: string;
  mono?: boolean;
  className?: string;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={cn("mt-1 break-all", mono && "font-mono text-xs", className)}>{value}</dd>
    </div>
  );
}
