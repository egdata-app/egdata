import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import type { SingleOffer } from "@/types/single-offer";
import type { SingleItem } from "@/types/single-item";
import { z } from "zod";
import { zodSearchValidator } from "@tanstack/router-zod-adapter";
import { httpClient } from "@/lib/http-client";
import {
  fetchV1CursorPageAt,
  getV1TotalPages,
  type V1CursorPaginationMeta,
} from "@/lib/v1-adapters";
import type { DehydratedState } from "@tanstack/react-query";
import { dehydrate, HydrationBoundary, keepPreviousData, useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DynamicPagination } from "@/components/app/dynamic-pagination";
import { ChangeTracker } from "@/components/app/changelog/item";
import { useTranslation } from "@/lib/paraglide-react";
import i18n from "@/lib/i18n";
import { Search } from "lucide-react";

export interface Root {
  hits: (OfferHit | ItemHit | AssetHit | Hit)[];
  query: string;
  processingTimeMs: number;
  limit: number;
  offset: number;
  estimatedTotalHits: number;
  page: number;
  hasMore?: boolean;
  totalPages?: number | null;
}

async function fetchSearchChangelogPage(query: string, page: number): Promise<Root> {
  const trimmed = query.trim();
  const limit = 20;
  const { envelope, resolvedPage, hasMore, total } = await fetchV1CursorPageAt<
    Root["hits"],
    V1CursorPaginationMeta
  >(
    (cursor) =>
      httpClient.v1GetEnvelope<Root["hits"], V1CursorPaginationMeta>("/search/changelog", {
        params: {
          query: trimmed || undefined,
          limit,
          cursor,
        },
      }),
    page,
    `search-changelog:${trimmed}`,
  );
  const hits = Array.isArray(envelope?.data) ? envelope.data : [];
  return {
    hits,
    query: trimmed,
    processingTimeMs: 0,
    limit: envelope?.meta?.pagination?.limit ?? limit,
    offset: 0,
    estimatedTotalHits: total ?? hits.length,
    page: resolvedPage,
    hasMore,
    totalPages: getV1TotalPages(envelope?.meta?.pagination, limit),
  };
}

interface DefaultHit {
  _id: string;
  timestamp: string;
  metadata: Metadata;
}

interface Metadata {
  changes: Change[];
  contextId: string;
  contextType: string;
}

interface Change {
  changeType: "insert" | "update" | "delete";
  field: string;
  newValue: unknown;
  oldValue: unknown;
}

interface OfferHit extends DefaultHit {
  metadata: Metadata & { contextType: "offer" };
  document: SingleOffer;
}

interface ItemHit extends DefaultHit {
  metadata: Metadata & { contextType: "item" };
  document: SingleItem;
}

interface AssetHit extends DefaultHit {
  metadata: Metadata & { contextType: "asset" };
  document: SingleItem;
}

interface Hit {
  _id: string;
  timestamp: string;
  metadata: Metadata;
  document: null;
}

const searchParamsSchema = z.object({
  query: z
    .preprocess((value) => {
      if (typeof value === "string") return value;
      if (typeof value === "boolean") return "";
      return undefined;
    }, z.string())
    .optional(),
  page: z.number().optional(),
});

export const Route = createFileRoute("/{-$locale}/changelog/")({
  component: () => {
    const { dehydratedState } = Route.useLoaderData() as {
      dehydratedState: DehydratedState;
      page: number;
      query: string;
    };

    return (
      <HydrationBoundary state={dehydratedState}>
        <ChangelogPage />
      </HydrationBoundary>
    );
  },

  // @ts-expect-error - loader return type
  loader: async ({ context, search }) => {
    const { queryClient } = context;

    const query = search?.query ?? "";
    const page = search?.page ?? 1;

    await queryClient.prefetchQuery({
      queryKey: [
        "changelogs",
        {
          query,
          page,
        },
      ],
      queryFn: () => fetchSearchChangelogPage(query, page).catch(() => null),
    });

    return {
      dehydratedState: dehydrate(queryClient),
      page,
      query,
    };
  },

  beforeLoad: async () => {},

  validateSearch: zodSearchValidator(searchParamsSchema),

  head() {
    return {
      meta: [
        {
          title: i18n.t("changelog.index.meta.title"),
        },
      ],
    };
  },
});

function ChangelogPage() {
  const { t } = useTranslation();
  const { page: initialPage, query: initialQuery } = Route.useLoaderData() as {
    dehydratedState: DehydratedState;
    page: number;
    query: string;
  };
  const navigate = Route.useNavigate();
  const [page, setPage] = React.useState(initialPage || 1);
  const [query, setQuery] = React.useState(initialQuery || "");
  const { data, isLoading, isError, isPlaceholderData } = useQuery({
    queryKey: [
      "changelogs",
      {
        query,
        page,
      },
    ],
    queryFn: () => fetchSearchChangelogPage(query, page),
    refetchOnMount: false,
    placeholderData: keepPreviousData,
  });

  React.useEffect(() => {
    if (data && !isPlaceholderData && data.page !== page) {
      setPage(data.page);
      void navigate({
        search: {
          query: query.trim() === "" ? undefined : query,
          page: data.page,
        },
        replace: true,
        resetScroll: false,
      });
    }
  }, [data, isPlaceholderData, navigate, page, query]);

  const handleQueryChange = (newQuery: string) => {
    setQuery(newQuery);
    setPage(1);

    navigate({
      search: {
        page: 1,
        query: newQuery.trim() === "" ? undefined : newQuery,
      },
      resetScroll: false,
    });
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
    navigate({
      search: {
        query: query.trim() === "" ? undefined : query,
        page: newPage,
      },
    });
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6">
      <header className="flex flex-wrap items-baseline justify-between gap-4 border-b border-border/60 pb-4">
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {t("nav.changelog")}
        </h1>
        {typeof data?.estimatedTotalHits === "number" && data.estimatedTotalHits > 0 && (
          <span className="text-sm font-medium text-muted-foreground tabular-nums">
            {data.estimatedTotalHits.toLocaleString()}
          </span>
        )}
      </header>
      <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-card/80 p-2 shadow-sm transition-[box-shadow,border-color,background-color] duration-200 ease-out focus-within:border-primary/60">
        <Search className="ml-2 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <Input
          type="search"
          placeholder={t("changelog.index.searchPlaceholder")}
          className="h-9 flex-1 border-0 bg-transparent px-1 text-sm shadow-none focus-visible:ring-0"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
        />
        <Button
          size="lg"
          className="shrink-0 transition-[box-shadow,background-color,border-color] duration-200 ease-out"
        >
          {t("changelog.index.searchButton")}
        </Button>
      </div>
      <div className="grid gap-4 [&>[data-slot=card]]:border [&>[data-slot=card]]:border-white/10 [&>[data-slot=card]]:bg-card/80 [&>[data-slot=card]]:transition-[box-shadow,border-color,background-color] [&>[data-slot=card]]:duration-200 [&>[data-slot=card]]:ease-out [&>[data-slot=card]:hover]:bg-card [&>[data-slot=card]:hover]:border-primary/60 [&>[data-slot=card]:hover]:shadow-lg [&>[data-slot=card]:hover]:shadow-black/35">
        {isLoading && (
          <div className="rounded-xl bg-card/80 p-6 text-sm text-muted-foreground ring-1 ring-white/10">
            {t("changelog.index.loading")}
          </div>
        )}
        {isError && (
          <div className="rounded-xl bg-card/80 p-6 text-sm text-destructive ring-1 ring-white/10">
            {t("changelog.index.error")}
          </div>
        )}
        {data?.hits
          // Filter out hits without metadata
          .filter((hit) => hit.metadata)
          .map((hit) => (
            <ChangeTracker
              key={hit._id}
              {...({
                _id: hit._id,
                document: hit.document,
                metadata: hit.metadata,
                timestamp: hit.timestamp,
              } as Parameters<typeof ChangeTracker>[0])}
            />
          ))}
      </div>
      <DynamicPagination
        cursorMode
        totalPages={data?.totalPages ?? null}
        hasMore={data?.hasMore}
        currentPage={page}
        setPage={handlePageChange}
      />
    </div>
  );
}
