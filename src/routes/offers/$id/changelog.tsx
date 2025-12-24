import { ChangelogDailyChart } from "@/components/app/changelog-daily-chart";
import { ChangelogFieldsChart } from "@/components/app/changelog-fields.chart";
import { ChangelogTypesChart } from "@/components/app/changelog-types-chart";
import { ChangelogWeekdaysChart } from "@/components/app/changelog-weekdays-chart";
import { ChangeTracker } from "@/components/app/changelog/item";
import { DynamicPagination } from "@/components/app/dynamic-pagination";
import type { Change } from "@/components/modules/changelist";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getQueryClient } from "@/lib/client";
import { ClientOnly } from "@/lib/cllient-only";
import { generateOfferMeta } from "@/lib/generate-offer-meta";
import { getFetchedQuery } from "@/lib/get-fetched-query";
import { httpClient } from "@/lib/http-client";
import { offerChangeFields } from "@/lib/offer-change-fields";
import type { ChangelogStats } from "@/types/changelog";
import type { SingleOffer } from "@/types/single-offer";
import {
  dehydrate,
  type DehydratedState,
  HydrationBoundary,
  keepPreviousData,
  useQuery,
} from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useDebounce } from "@uidotdev/usehooks";
import { Loader2 } from "lucide-react";
import { useState } from "react";

type ChangelogWithPagination = {
  elements: Change[];
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

type ChangelogWithoutPagination = Change[];

function isChangelogWithPagination(
  page: ChangelogWithPagination | ChangelogWithoutPagination,
): page is ChangelogWithPagination {
  return !Array.isArray(page) && "totalPages" in page;
}

const getChangelog = (id: string, page: number, query?: string, field?: string, type?: string) => ({
  queryKey: ["changelog", { id, page, query, field, type }],
  queryFn: () =>
    httpClient.get<ChangelogWithPagination>(`/offers/${id}/changelog`, {
      params: {
        page,
        query,
        field,
        type,
      },
    }),
  placeholderData: keepPreviousData,
});

type LoaderData = {
  dehydratedState: DehydratedState;
  id: string;
  offer: SingleOffer;
};

export const Route = createFileRoute("/offers/$id/changelog")({
  component: () => {
    const { dehydratedState } = Route.useLoaderData() as LoaderData;

    return (
      <HydrationBoundary state={dehydratedState}>
        <ChangelogPage />
      </HydrationBoundary>
    );
  },

  // @ts-expect-error - loader return type
  loader: async ({ params, context }) => {
    const { queryClient } = context;
    const { id } = params;

    const offer = await queryClient.ensureQueryData({
      queryKey: ["offer", { id: params.id }],
      queryFn: () => httpClient.get<SingleOffer>(`/offers/${params.id}`),
    });

    await queryClient.prefetchQuery(getChangelog(id, 1));

    return {
      id,
      offer,
      dehydratedState: dehydrate(queryClient),
    };
  },

  head: (ctx) => {
    const { params } = ctx;
    const queryClient = getQueryClient();

    if (!ctx.loaderData) {
      return {
        meta: [
          {
            title: "Offer not found",
            description: "Offer not found",
          },
        ],
      };
    }

    const offer = getFetchedQuery<SingleOffer>(queryClient, ctx.loaderData?.dehydratedState, [
      "offer",
      { id: params.id },
    ]);

    if (!offer) {
      return {
        meta: [
          {
            title: "Offer not found",
            description: "Offer not found",
          },
        ],
      };
    }

    return {
      meta: generateOfferMeta(offer, "Changelog"),
    };
  },
});

const changelogTypes = {
  update: {
    label: "Update",
    color: "hsl(var(--chart-1))",
  },
  delete: {
    label: "Delete",
    color: "hsl(var(--chart-2))",
  },
  insert: {
    label: "Insert",
    color: "var(--chart-3)",
  },
};

function ChangelogPage() {
  const { id } = Route.useLoaderData() as LoaderData;
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState<string | undefined>(undefined);
  const debouncedQuery = useDebounce(query, 500);
  const [field, setField] = useState<string | undefined>(undefined);
  const [type, setType] = useState<string | undefined>(undefined);
  const { data, isLoading, isFetching } = useQuery(
    getChangelog(id, page, debouncedQuery, field, type),
  );
  const { data: stats } = useQuery({
    queryKey: ["changelog-stats", { id }],
    queryFn: () =>
      httpClient.get<ChangelogStats>(`/offers/${id}/changelog/stats`, {
        params: {
          // One year ago
          from: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
          to: new Date().toISOString(),
        },
      }),
  });

  const { data: offer } = useQuery({
    queryKey: ["offer", { id }],
    queryFn: () => httpClient.get<SingleOffer>(`/offers/${id}`),
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 mt-6">
        <h2 className="text-2xl font-bold">Changelog</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: This is a fallback component
            <Skeleton key={index} className="w-full h-72" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex justify-center items-center h-96">
        <p className="text-2xl font-bold text-gray-300">No changelog available</p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <section className="flex flex-col gap-4 mt-6">
        <div className="inline-flex justify-between items-center gap-4">
          <div className="inline-flex items-end gap-2">
            <Tooltip>
              <TooltipTrigger className="inline-flex gap-2 items-center">
                <h2
                  className="text-2xl font-bold underline decoration-dotted underline-offset-4 decoration-gray-300/50"
                  id="changelog-title"
                >
                  Changelog
                </h2>
                {isFetching && <Loader2 className="size-6 animate-spin" />}
              </TooltipTrigger>
              <TooltipContent align="start" className="bg-background">
                <p className="text-sm text-muted-foreground">
                  This list are the changes made to this specific offer or related items, assets or
                  builds.
                </p>
                <p className="text-sm text-muted-foreground">
                  You can see the changelog for the whole product in the{" "}
                  <Link
                    to="/sandboxes/$id/changelog"
                    params={{ id: offer?.namespace ?? "epic" }}
                    className="underline decoration-dotted underline-offset-4 decoration-gray-300/50"
                  >
                    sandbox changelog
                  </Link>
                  .
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex flex-row gap-2 items-center">
              <Select
                value={type}
                onValueChange={(value) => (value === "all" ? setType(undefined) : setType(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <Separator className="my-2" />
                  <SelectItem value="insert">
                    <ChangeTypeBubble type="insert" />
                  </SelectItem>
                  <SelectItem value="update">
                    <ChangeTypeBubble type="update" />
                  </SelectItem>
                  <SelectItem value="delete">
                    <ChangeTypeBubble type="delete" />
                  </SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={field}
                onValueChange={(value) => (value === "all" ? setField(undefined) : setField(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a field" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All fields</SelectItem>
                  <Separator className="my-2" />
                  {offerChangeFields.map((field) => (
                    <SelectItem key={field} value={field}>
                      {field}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setPage(page - 1);
              }}
              disabled={page === 1}
            >
              Previous
            </Button>
            <div className="flex items-center gap-2">
              <p className="text-sm text-muted-foreground">
                Page {page} of {data.totalPages}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setPage(page + 1);
              }}
              disabled={page === data.totalPages}
            >
              Next
            </Button>
          </div>
        </div>
        <div className="flex flex-col w-full gap-4">
          {data.elements
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .map((changelist) => (
              <ChangeTracker
                _id={changelist._id}
                key={changelist._id}
                timestamp={changelist.timestamp}
                // @ts-expect-error
                document={changelist.document}
                // @ts-expect-error
                metadata={changelist.metadata}
              />
            ))}
          {data.elements.length === 0 && (
            <p className="text-sm text-muted-foreground">No changes found for this offer</p>
          )}
        </div>
        <DynamicPagination
          currentPage={page}
          totalPages={data.totalPages}
          setPage={(page) => {
            setPage(page);
            window.scrollTo({
              top: document.getElementById("changelog-title")?.offsetTop,
              behavior: "smooth",
            });
          }}
        />
        <ClientOnly>
          <ChangelogDailyChart chartData={stats?.dailyChanges as ChangelogStats["dailyChanges"]} />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ChangelogWeekdaysChart chartData={stats?.weekdayChanges || {}} />
            <ChangelogFieldsChart chartData={stats?.changeFields || {}} />
            <ChangelogTypesChart
              chartData={stats?.changeTypes || ({} as ChangelogStats["changeTypes"])}
            />
          </div>
        </ClientOnly>
      </section>
    </TooltipProvider>
  );
}

function ChangeTypeBubble({ type }: { type: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: changelogTypes[type].color }}
      />
      {changelogTypes[type].label}
    </span>
  );
}
