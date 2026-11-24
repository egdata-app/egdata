import { dehydrate, HydrationBoundary, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { SandboxPageHeader } from "@/components/app/sandbox-layout";
import { SandboxOfferCard, SandboxQueryState } from "@/components/app/sandbox-catalog";
import { Link } from "@/components/app/localized-link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCountry } from "@/hooks/use-country";
import { useLocale } from "@/hooks/use-locale";
import {
  sandboxCatalogGroups,
  updateSandboxCatalogSearch,
  validateSandboxCatalogSearch,
  type SandboxCatalogSearch,
} from "@/lib/sandbox-catalog";
import { sandboxCatalogQueryOptions } from "@/queries/sandbox-catalog";
import { offerTypeValues } from "@/lib/offers-dictionary";
import { getQueryClient } from "@/lib/client";
import { getFetchedQuery } from "@/lib/get-fetched-query";
import { generateSandboxMeta } from "@/lib/generate-sandbox-meta";
import { cn } from "@/lib/utils";
import {
  sandboxBaseGameQueryOptions,
  sandboxQueryOptions,
  type SandboxBaseGame,
  type SandboxIdentity,
} from "@/queries/sandbox";
import { ChevronDown, LayoutGrid, List, RefreshCw, Search, StoreIcon } from "lucide-react";
import { useTranslation } from "@/lib/paraglide-react";
import i18n from "@/lib/i18n";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

export const Route = createFileRoute("/{-$locale}/sandboxes/$id/offers")({
  validateSearch: validateSandboxCatalogSearch,
  loaderDeps: ({ search }) => search,
  loader: async ({ context, params, deps }) => {
    await context.queryClient.prefetchQuery(
      sandboxCatalogQueryOptions(params.id, deps, context.country || "US"),
    );
    return {
      id: params.id,
      country: context.country,
      dehydratedState: dehydrate(context.queryClient),
    };
  },
  component: () => (
    <HydrationBoundary state={Route.useLoaderData().dehydratedState}>
      <SandboxOffersPage />
    </HydrationBoundary>
  ),
  head: (ctx) => {
    const { params } = ctx;
    const queryClient = getQueryClient();

    if (!ctx.loaderData) {
      return {
        meta: [
          {
            title: i18n.t("sandboxes.notFoundTitle"),
            description: i18n.t("sandboxes.notFoundDescription"),
          },
        ],
      };
    }

    const { id } = params;

    const sandbox = getFetchedQuery<SandboxIdentity>(
      queryClient,
      ctx.loaderData?.dehydratedState,
      sandboxQueryOptions(id).queryKey,
    );
    const offer = getFetchedQuery<SandboxBaseGame>(
      queryClient,
      ctx.loaderData?.dehydratedState,
      sandboxBaseGameQueryOptions(id, ctx.loaderData?.country).queryKey,
    );

    if (!sandbox)
      return {
        meta: [
          {
            title: i18n.t("sandboxes.notFoundTitle"),
            description: i18n.t("sandboxes.notFoundDescription"),
          },
        ],
      };

    return {
      meta: generateSandboxMeta(sandbox, offer, i18n.t("sandboxes.metaOffersTitle")),
    };
  },
});

const subscribeHydration = () => () => {};

function SandboxOffersPage() {
  const hydrated = useSyncExternalStore(
    subscribeHydration,
    () => true,
    () => false,
  );
  const { t } = useTranslation();
  const { id } = Route.useParams();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { country } = useCountry();
  const { locale } = useLocale();
  const [draft, setDraft] = useState(search.q);

  useEffect(() => setDraft(search.q), [search.q]);

  const update = useCallback(
    (patch: Partial<SandboxCatalogSearch>, replace = false) =>
      void navigate({
        search: (previous) => updateSandboxCatalogSearch(previous, patch),
        replace,
        resetScroll: false,
      }),
    [navigate],
  );

  useEffect(() => {
    if (draft === search.q) return;
    const timer = setTimeout(() => update({ q: draft }, true), 300);
    return () => clearTimeout(timer);
  }, [draft, search.q, update]);

  const query = useQuery(sandboxCatalogQueryOptions(id, search, country || "US"));
  const total = query.data?.count ?? null;
  const pages = total !== null ? Math.max(1, Math.ceil(total / search.pageSize)) : null;
  const canGoNext = query.data?.hasMore ?? (pages !== null && search.page < pages);

  useEffect(() => {
    if (!query.isSuccess || query.isPlaceholderData) return;
    if (query.data.page !== search.page) {
      update({ page: query.data.page }, true);
      return;
    }
    if (pages !== null && !query.data.hasMore && search.page > pages) {
      update({ page: pages }, true);
    }
  }, [
    query.isSuccess,
    query.isPlaceholderData,
    query.data?.page,
    query.data?.hasMore,
    search.page,
    pages,
    update,
  ]);

  const filtered = Boolean(search.q || search.types || search.group !== "all");
  const reset = () => {
    setDraft("");
    update({ q: "", group: "all" });
  };

  const selectClass =
    "h-10 rounded-full border border-white/10 bg-card/80 px-4 text-sm text-foreground transition-colors duration-150 hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";

  return (
    <fieldset disabled={!hydrated} className="min-w-0 space-y-6">
      <SandboxPageHeader
        icon={StoreIcon}
        eyebrow={t("sandboxes.offersEyebrow")}
        title={t("sandboxes.offersTitle")}
        description={t("sandboxCatalog.description")}
      >
        <div
          className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-card/80 p-1 shadow-sm"
          aria-label={t("sandboxes.offersTitle")}
        >
          <Button
            size="sm"
            variant={search.view === "cards" ? "default" : "ghost"}
            aria-pressed={search.view === "cards"}
            className={cn(
              "h-8 rounded-md px-3 text-xs font-medium",
              search.view !== "cards" && "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => update({ view: "cards" })}
          >
            <LayoutGrid className="size-3.5" />
            {t("sandboxCatalog.cards")}
          </Button>
          <Button
            size="sm"
            variant={search.view === "table" ? "default" : "ghost"}
            aria-pressed={search.view === "table"}
            className={cn(
              "h-8 rounded-md px-3 text-xs font-medium",
              search.view !== "table" && "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => update({ view: "table" })}
          >
            <List className="size-3.5" />
            {t("sandboxCatalog.table")}
          </Button>
        </div>
      </SandboxPageHeader>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-52 flex-1">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute start-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              className="h-10 rounded-full border-white/10 bg-card/80 ps-10 pe-4 text-sm shadow-sm transition-colors duration-150 hover:border-primary/60 focus-visible:border-primary"
              type="search"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              aria-label={t("sandboxCatalog.search")}
              placeholder={t("sandboxCatalog.search")}
            />
          </div>
          <select
            className={selectClass}
            aria-label={t("sandboxCatalog.group")}
            value={search.group}
            onChange={(event) =>
              update({ group: event.target.value as SandboxCatalogSearch["group"] })
            }
          >
            <option value="all">{t("sandboxCatalog.allOffers")}</option>
            {sandboxCatalogGroups.map((group) => (
              <option key={group.id} value={group.id}>
                {t(`sandboxCatalog.groups.${group.id}`)}
              </option>
            ))}
          </select>
          {filtered && (
            <Button
              variant="ghost"
              size="sm"
              className="rounded-full text-muted-foreground hover:text-foreground"
              onClick={reset}
            >
              {t("sandboxCatalog.reset")}
            </Button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => update({ group: "all" })}
            aria-pressed={search.group === "all" && !search.types}
            className={cn(
              "inline-flex cursor-pointer items-center whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              search.group === "all" && !search.types
                ? "border-primary/60 bg-primary/15 text-primary"
                : "border-border/60 bg-card/40 text-muted-foreground hover:border-primary/60 hover:text-foreground",
            )}
          >
            {t("sandboxCatalog.allOffers")}
          </button>
          {sandboxCatalogGroups.map((group) => {
            const isSelected = search.group === group.id;
            return (
              <button
                key={group.id}
                type="button"
                onClick={() => update({ group: group.id })}
                aria-pressed={isSelected}
                className={cn(
                  "inline-flex cursor-pointer items-center whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  isSelected
                    ? "border-primary/60 bg-primary/15 text-primary"
                    : "border-border/60 bg-card/40 text-muted-foreground hover:border-primary/60 hover:text-foreground",
                )}
              >
                {t(`sandboxCatalog.groups.${group.id}`)}
              </button>
            );
          })}
        </div>
      </div>

      {search.view === "table" && (
        <details
          className="group rounded-xl border border-white/10 bg-card/60 p-4 transition-colors duration-150"
          open={Boolean(search.types)}
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-medium text-foreground transition-colors hover:text-primary">
            <span>{t("sandboxCatalog.rawTypes")}</span>
            <ChevronDown
              aria-hidden="true"
              className="size-4 text-muted-foreground transition-transform duration-200 group-open:rotate-180"
            />
          </summary>
          <div className="mt-3 flex flex-wrap gap-2 border-t border-border/40 pt-3">
            {[...new Set([...offerTypeValues, ...search.types.split(",").filter(Boolean)])].map(
              (type) => {
                const checked = search.types.split(",").includes(type);
                return (
                  <label
                    key={type}
                    className={cn(
                      "inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition-colors duration-150",
                      checked
                        ? "border-primary/60 bg-primary/15 text-primary"
                        : "border-border/60 bg-background/50 text-muted-foreground hover:border-primary/50 hover:text-foreground",
                    )}
                  >
                    <input
                      type="checkbox"
                      className="accent-primary"
                      checked={checked}
                      onChange={(event) => {
                        const types = new Set(search.types.split(",").filter(Boolean));
                        if (event.target.checked) types.add(type);
                        else types.delete(type);
                        update({ types: [...types].join(",") });
                      }}
                    />
                    <span>{type}</span>
                  </label>
                );
              },
            )}
          </div>
        </details>
      )}

      <div
        className="flex min-h-6 items-center justify-between text-xs text-muted-foreground"
        role="status"
        aria-live="polite"
      >
        <span className="font-medium tabular-nums">
          {query.data && total !== null
            ? t("sandboxCatalog.results", {
                count: total,
              })
            : ""}
        </span>
        {query.isFetching && !query.isPending && (
          <span className="inline-flex items-center gap-1.5">
            <RefreshCw className="size-3 animate-spin" />
            {t("sandboxCatalog.refreshing")}
          </span>
        )}
      </div>

      {query.isPending ? (
        <SandboxQueryState loading variant={search.view === "cards" ? "cards" : "rows"} />
      ) : query.isError ? (
        <SandboxQueryState error retry={() => void query.refetch()} />
      ) : !query.data.elements.length ? (
        <SandboxQueryState empty={!filtered} reset={filtered ? reset : undefined} />
      ) : (
        <div
          aria-busy={query.isFetching}
          className={cn("transition-opacity duration-150", query.isPlaceholderData && "opacity-60")}
        >
          {search.view === "cards" ? (
            <div className="grid grid-cols-1 gap-5 min-[420px]:grid-cols-2 lg:grid-cols-4">
              {query.data.elements.map((offer) => (
                <SandboxOfferCard key={offer.id} offer={offer} />
              ))}
            </div>
          ) : (
            <div
              className="overflow-x-auto rounded-xl border border-white/10 bg-card/40"
              tabIndex={0}
              role="region"
              aria-label={t("sandboxCatalog.table")}
            >
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead>
                  <tr className="border-b border-border/50">
                    {["id", "title", "type", "prePurchase", "seller", "modified"].map((column) => (
                      <th
                        key={column}
                        className="h-10 px-4 text-xs font-medium text-muted-foreground"
                      >
                        {t(`sandboxCatalog.columns.${column}`)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {query.data.elements.map((offer) => (
                    <tr
                      key={offer.id}
                      className="border-b border-border/30 last:border-b-0 transition-colors duration-150 hover:bg-card/80"
                    >
                      <td className="px-4 py-3">
                        <Link
                          to="/{-$locale}/offers/$id"
                          params={{ id: offer.id }}
                          className="font-mono text-xs text-primary underline-offset-4 hover:underline"
                        >
                          {offer.id}
                        </Link>
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground">
                        <Link
                          to="/{-$locale}/offers/$id"
                          params={{ id: offer.id }}
                          className="transition-colors hover:text-primary"
                        >
                          {offer.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {offer.offerType || t("sandboxCatalog.unknownType")}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {offer.prePurchase ? t("sandboxCatalog.columns.prePurchase") : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {offer.seller?.id ? (
                          <Link
                            to="/{-$locale}/sellers/$id"
                            params={{ id: offer.seller.id }}
                            className="font-medium text-foreground/90 transition-colors hover:text-primary"
                          >
                            {offer.seller.name}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">{offer.seller?.name || "—"}</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs tabular-nums text-muted-foreground">
                        {offer.lastModifiedDate &&
                        Number.isFinite(Date.parse(offer.lastModifiedDate))
                          ? new Date(offer.lastModifiedDate).toLocaleDateString(locale)
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {query.data &&
        (total === null ? query.data.elements.length > 0 : total > 0) &&
        !query.isError && (
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border/60 pt-5">
            <label className="flex items-center gap-2.5 text-xs font-medium text-muted-foreground">
              <span>{t("sandboxCatalog.pageSize")}</span>
              <select
                className="h-9 rounded-full border border-white/10 bg-card/80 px-3 text-xs text-foreground transition-colors hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                value={search.pageSize}
                onChange={(event) => update({ pageSize: Number(event.target.value) })}
              >
                {[20, 40, 60].map((size) => (
                  <option key={size}>{size}</option>
                ))}
              </select>
            </label>
            <div className="flex items-center gap-2.5">
              <Button
                variant="outline"
                size="sm"
                className="rounded-full border-white/10 bg-card/80 px-4 transition-colors hover:border-primary/60"
                isDisabled={search.page <= 1 || query.isPlaceholderData}
                onPress={() => update({ page: search.page - 1 })}
              >
                {t("sandboxCatalog.previous")}
              </Button>
              <span className="px-1 text-xs font-medium tabular-nums text-muted-foreground">
                {pages !== null
                  ? t("sandboxCatalog.page", { page: search.page, pages })
                  : `Page ${search.page}`}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full border-white/10 bg-card/80 px-4 transition-colors hover:border-primary/60"
                isDisabled={!canGoNext || query.isPlaceholderData}
                onPress={() => update({ page: search.page + 1 })}
              >
                {t("sandboxCatalog.next")}
              </Button>
            </div>
          </div>
        )}
    </fieldset>
  );
}
