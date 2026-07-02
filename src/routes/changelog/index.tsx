import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import type { SingleOffer } from "@/types/single-offer";
import type { SingleItem } from "@/types/single-item";
import { z } from "zod";
import { zodSearchValidator } from "@tanstack/router-zod-adapter";
import { httpClient } from "@/lib/http-client";
import type { DehydratedState } from "@tanstack/react-query";
import { dehydrate, HydrationBoundary, keepPreviousData, useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DynamicPagination } from "@/components/app/dynamic-pagination";
import { ChangeTracker } from "@/components/app/changelog/item";
import { useTranslation } from "react-i18next";
import i18n from "@/lib/i18n";

export interface Root {
  hits: (OfferHit | ItemHit | AssetHit | Hit)[];
  query: string;
  processingTimeMs: number;
  limit: number;
  offset: number;
  estimatedTotalHits: number;
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

export const Route = createFileRoute("/changelog/")({
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
      queryFn: () =>
        httpClient
          .get<Root>("/search/changelog", {
            params: {
              query,
              page,
            },
          })
          .catch(() => null),
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
  const { data, isLoading, isError } = useQuery({
    queryKey: [
      "changelogs",
      {
        query,
        page,
      },
    ],
    queryFn: () =>
      httpClient.get<Root>("/search/changelog", {
        params: {
          query,
          page,
        },
      }),
    refetchOnMount: false,
    placeholderData: keepPreviousData,
  });

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

  const totalPages = Math.ceil((data?.estimatedTotalHits || 0) / (data?.limit || 1));

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
    <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto px-4 py-8 sm:px-6">
      <div className="flex items-center gap-4">
        <Input
          type="search"
          placeholder={t("changelog.index.searchPlaceholder")}
          className="flex-1 bg-background"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
        />
        <Button>{t("changelog.index.searchButton")}</Button>
      </div>
      <div className="grid gap-4">
        {isLoading && <div>{t("changelog.index.loading")}</div>}
        {isError && <div>{t("changelog.index.error")}</div>}
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
      <DynamicPagination totalPages={totalPages} currentPage={page} setPage={handlePageChange} />
    </div>
  );
}
