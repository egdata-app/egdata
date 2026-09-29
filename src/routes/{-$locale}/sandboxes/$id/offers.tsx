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
import type { SingleOffer } from "@/types/single-offer";
import type { SingleSandbox } from "@/types/single-sandbox";
import { getQueryClient } from "@/lib/client";
import { getFetchedQuery } from "@/lib/get-fetched-query";
import { generateSandboxMeta } from "@/lib/generate-sandbox-meta";
import { StoreIcon, LayoutGrid, List, Search } from "lucide-react";
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
    return { id: params.id, dehydratedState: dehydrate(context.queryClient) };
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

    const sandbox = getFetchedQuery<SingleSandbox>(queryClient, ctx.loaderData?.dehydratedState, [
      "sandbox",
      { id },
    ]);
    const offer = getFetchedQuery<SingleOffer>(queryClient, ctx.loaderData?.dehydratedState, [
      "sandbox",
      "base-game",
      { id },
    ]);

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
  const total = query.data?.count ?? 0;
  const pages = Math.max(1, Math.ceil(total / search.pageSize));
  useEffect(() => {
    if (query.isSuccess && !query.isPlaceholderData && search.page > pages)
      update({ page: pages }, true);
  }, [query.isSuccess, query.isPlaceholderData, search.page, pages, update]);
  const filtered = Boolean(search.q || search.types || search.group !== "all");
  const reset = () => {
    setDraft("");
    update({ q: "", group: "all" });
  };
  const selectClass =
    "h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:ring-2 focus-visible:ring-primary";
  return (
    <fieldset disabled={!hydrated} className="min-w-0 space-y-5">
      <SandboxPageHeader
        icon={StoreIcon}
        eyebrow={t("sandboxes.offersEyebrow")}
        title={t("sandboxes.offersTitle")}
        description={t("sandboxCatalog.description")}
      >
        <div
          className="flex rounded-md border border-border p-1"
          aria-label={t("sandboxes.offersTitle")}
        >
          <Button
            size="sm"
            variant={search.view === "cards" ? "secondary" : "ghost"}
            aria-pressed={search.view === "cards"}
            onClick={() => update({ view: "cards" })}
          >
            <LayoutGrid className="size-4" />
            {t("sandboxCatalog.cards")}
          </Button>
          <Button
            size="sm"
            variant={search.view === "table" ? "secondary" : "ghost"}
            aria-pressed={search.view === "table"}
            onClick={() => update({ view: "table" })}
          >
            <List className="size-4" />
            {t("sandboxCatalog.table")}
          </Button>
        </div>
      </SandboxPageHeader>
      <div className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-card p-3">
        <div className="relative min-w-48 flex-1">
          <Search
            aria-hidden="true"
            className="absolute left-3 top-3 size-4 text-muted-foreground"
          />
          <Input
            className="h-10 pl-9"
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
          <Button variant="ghost" onClick={reset}>
            {t("sandboxCatalog.reset")}
          </Button>
        )}
      </div>
      {search.view === "table" && (
        <details className="rounded-md border border-border p-3" open={Boolean(search.types)}>
          <summary className="cursor-pointer text-sm font-medium">
            {t("sandboxCatalog.rawTypes")}
          </summary>
          <div className="mt-3 flex flex-wrap gap-2">
            {[...new Set([...offerTypeValues, ...search.types.split(",").filter(Boolean)])].map(
              (type) => (
                <label
                  key={type}
                  className="flex cursor-pointer items-center gap-2 rounded border border-border px-2 py-1.5 text-xs"
                >
                  <input
                    type="checkbox"
                    checked={search.types.split(",").includes(type)}
                    onChange={(event) => {
                      const types = new Set(search.types.split(",").filter(Boolean));
                      if (event.target.checked) types.add(type);
                      else types.delete(type);
                      update({ types: [...types].join(",") });
                    }}
                  />
                  {type}
                </label>
              ),
            )}
          </div>
        </details>
      )}
      <div
        className="flex min-h-6 items-center justify-between text-sm text-muted-foreground"
        role="status"
        aria-live="polite"
      >
        <span>
          {query.data
            ? t("sandboxCatalog.results", {
                count: total,
              })
            : ""}
        </span>
        {query.isFetching && !query.isPending && <span>{t("sandboxCatalog.refreshing")}</span>}
      </div>
      {query.isPending ? (
        <SandboxQueryState loading />
      ) : query.isError ? (
        <SandboxQueryState error retry={() => void query.refetch()} />
      ) : !query.data.elements.length ? (
        <SandboxQueryState empty={!filtered} reset={filtered ? reset : undefined} />
      ) : (
        <div aria-busy={query.isFetching} className={query.isPlaceholderData ? "opacity-60" : ""}>
          {search.view === "cards" ? (
            <div className="grid grid-cols-1 gap-4 min-[400px]:grid-cols-2 lg:grid-cols-4">
              {query.data.elements.map((offer) => (
                <SandboxOfferCard key={offer.id} offer={offer} />
              ))}
            </div>
          ) : (
            <div
              className="overflow-x-auto rounded-md border border-border"
              tabIndex={0}
              role="region"
              aria-label={t("sandboxCatalog.table")}
            >
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    {["id", "title", "type", "prePurchase", "seller", "modified"].map((column) => (
                      <th key={column} className="px-4 py-3 font-medium">
                        {t(`sandboxCatalog.columns.${column}`)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {query.data.elements.map((offer) => (
                    <tr key={offer.id} className="border-t border-border hover:bg-muted/20">
                      <td className="px-4 py-3">
                        <Link
                          to="/{-$locale}/offers/$id"
                          params={{ id: offer.id }}
                          className="font-mono text-xs text-primary hover:underline"
                        >
                          {offer.id}
                        </Link>
                      </td>
                      <td className="px-4 py-3 font-medium">
                        <Link to="/{-$locale}/offers/$id" params={{ id: offer.id }}>
                          {offer.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        {offer.offerType || t("sandboxCatalog.unknownType")}
                      </td>
                      <td className="px-4 py-3">
                        {offer.prePurchase ? t("sandboxCatalog.columns.prePurchase") : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {offer.seller?.id ? (
                          <Link
                            to="/{-$locale}/sellers/$id"
                            params={{ id: offer.seller.id }}
                            className="text-primary"
                          >
                            {offer.seller.name}
                          </Link>
                        ) : (
                          offer.seller?.name || "—"
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
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
      {query.data && total > 0 && !query.isError && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            {t("sandboxCatalog.pageSize")}
            <select
              className={selectClass}
              value={search.pageSize}
              onChange={(event) => update({ pageSize: Number(event.target.value) })}
            >
              {[20, 40, 60].map((size) => (
                <option key={size}>{size}</option>
              ))}
            </select>
          </label>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              disabled={search.page <= 1 || query.isPlaceholderData}
              onClick={() => update({ page: search.page - 1 })}
            >
              {t("sandboxCatalog.previous")}
            </Button>
            <span className="text-sm tabular-nums">
              {t("sandboxCatalog.page", { page: search.page, pages })}
            </span>
            <Button
              variant="outline"
              disabled={search.page >= pages || query.isPlaceholderData}
              onClick={() => update({ page: search.page + 1 })}
            >
              {t("sandboxCatalog.next")}
            </Button>
          </div>
        </div>
      )}
    </fieldset>
  );
}
