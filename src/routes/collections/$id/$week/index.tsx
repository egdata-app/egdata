import { Image } from "@/components/app/image";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useCountry } from "@/hooks/use-country";
import { useLocale } from "@/hooks/use-locale";
import { calculatePrice } from "@/lib/calculate-price";
import { getImage } from "@/lib/get-image";
import { cn } from "@/lib/utils";
import { type Collections, getCollection, type OfferWithTops } from "@/queries/collection";
import {
  dehydrate,
  type DehydratedState,
  HydrationBoundary,
  useInfiniteQuery,
} from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";

export const Route = createFileRoute("/collections/$id/$week/")({
  component: () => {
    const { dehydratedState } = Route.useLoaderData() as {
      dehydratedState: DehydratedState;
      id: string;
      country: string;
    };

    return (
      <HydrationBoundary state={dehydratedState}>
        <CollectionPage />
      </HydrationBoundary>
    );
  },

  // @ts-expect-error - loader return type
  loader: async ({ params, context }) => {
    const { id } = params;
    const { queryClient, country } = context;

    return {
      id,
      dehydratedState: dehydrate(queryClient),
      country,
    };
  },
});

function CollectionPage() {
  const { id, week } = Route.useParams();
  const { country } = useCountry();
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery({
    queryKey: ["collection", { id, country, limit: 20, week }],
    queryFn: ({ pageParam }) =>
      getCollection({
        slug: id,
        limit: 20,
        page: pageParam as number,
        country,
        week,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage: Collections, allPages: Collections[]) => {
      if (lastPage.page * lastPage.limit + 20 > lastPage.total) {
        return undefined;
      }

      return allPages?.length + 1;
    },
  });

  if (isLoading) {
    return (
      <main className="container mx-auto flex flex-col items-center justify-center gap-4 min-h-screen">
        <div className="relative h-96 overflow-hidden rounded-2xl flex items-center bg-cover bg-center w-full">
          <div className="h-full w-full flex flex-col justify-center items-start text-white p-8 bg-gradient-to-r from-black/80 to-black/30">
            <span className="text-5xl font-bold">Loading...</span>
          </div>
        </div>
      </main>
    );
  }

  return (
    <TooltipProvider>
      <main className="flex flex-col items-start justify-start h-full gap-1 px-4 w-full">
        <div className="flex flex-row items-center justify-between gap-4">
          <h1 className="text-4xl font-semibold">{data?.pages[0].title}</h1>
          <span className="text-4xl text-muted-foreground">-</span>
          {data?.pages[0].start && data?.pages[0].end && (
            <div className="text-4xl text-muted-foreground">
              {new Date(data?.pages[0].start).toLocaleDateString("en-UK", {
                year: undefined,
                month: "long",
                day: "numeric",
              })}{" "}
              -{" "}
              {new Date(data?.pages[0].end).toLocaleDateString("en-UK", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </div>
          )}
        </div>

        <div className="w-full h-12 flex flex-row items-center px-5 font-thin text-muted-foreground">
          <span className="w-10">Position</span>
          <span className="w-24" />
          <span className="flex-grow pl-4" />
          <span className="w-32 text-right" />
          <span className="w-16 text-center">
            <Tooltip>
              <TooltipTrigger className="underline decoration-dotted decoration-gray-300/50 underline-offset-4 cursor-help">
                Variance
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>
                  The difference between the current position and the previous position. Usually
                  changes every day.
                </p>
              </TooltipContent>
            </Tooltip>
          </span>
          <span className="w-16 text-center">
            <Tooltip>
              <TooltipTrigger className="underline decoration-dotted decoration-gray-300/50 underline-offset-4 cursor-help">
                Weeks
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>
                  The number of weeks the game has been in the top 100 for{" "}
                  {data?.pages[0].title.toLowerCase()}.
                </p>
              </TooltipContent>
            </Tooltip>
          </span>
        </div>

        {/* Offers List */}
        <div className="flex flex-col gap-2 w-full">
          {data?.pages
            .flatMap((page) => page.elements)
            .map((offer) => (
              <OfferInTop key={offer.id} offer={offer} />
            ))}
        </div>

        {hasNextPage && (
          <div className="flex justify-center items-center mt-4 w-full">
            <Button
              onClick={() => fetchNextPage()}
              variant="outline"
              disabled={isFetchingNextPage || isLoading}
            >
              {isFetchingNextPage ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Loading...
                </>
              ) : (
                "Load more"
              )}
            </Button>
          </div>
        )}
      </main>
    </TooltipProvider>
  );
}

function OfferInTop({ offer }: { offer: OfferWithTops }) {
  const { locale } = useLocale();
  const fmt = Intl.NumberFormat(locale, {
    style: "currency",
    currency: offer.price?.price.currencyCode || "USD",
  });

  const weeksInTop100 = Math.floor(offer.metadata.timesInTop100 / 7);

  return (
    <Link to="/offers/$id" params={{ id: offer.id }} preload="viewport">
      <Card className="w-full h-16 flex flex-row items-center rounded-xl overflow-hidden px-5">
        <span className="text-xl font-bold w-10 flex-shrink-0">{offer.metadata.position}</span>

        <div className="h-full w-24 flex-shrink-0 flex flex-col justify-center items-center">
          <Image
            src={
              getImage(offer.keyImages, [
                "DieselGameBoxWide",
                "DieselStoreFrontWide",
                "Featured",
                "OfferImageWide",
              ])?.url ?? "/placeholder.webp"
            }
            alt={offer.title}
            className="w-full h-full object-cover rounded-md"
            width={200}
            height={100}
            quality="low"
          />
        </div>

        <div className="flex-grow flex flex-col justify-center px-4">
          <h3 className="text-xl font-light truncate">{offer.title}</h3>
        </div>

        <div className="flex-shrink-0 w-40 text-right inline-flex items-center justify-end gap-2 pr-5">
          <span
            className={cn(
              "text-lg font-semibold",
              offer.price?.price.discountPrice !== offer.price?.price.originalPrice && "text-badge",
            )}
          >
            {fmt.format(
              calculatePrice(
                offer.price?.price.discountPrice ?? 0,
                offer.price?.price.currencyCode,
              ),
            )}
          </span>
          {offer.price?.price.discountPrice !== offer.price?.price.originalPrice && (
            <span className="text-lg font-medium text-muted-foreground line-through">
              {fmt.format(
                calculatePrice(
                  offer.price?.price.originalPrice ?? 0,
                  offer.price?.price.currencyCode,
                ),
              )}
            </span>
          )}
        </div>

        <div
          className={cn(
            "flex flex-row gap-1 items-center text-badge w-16 justify-center",
            offer.previousPosition && offer.position > offer.previousPosition ? "text-red-500" : "",
          )}
        >
          {offer.previousPosition && offer.position !== offer.previousPosition ? (
            <>
              <ChevronDown
                className={cn(
                  "h-4 w-4",
                  offer.position < offer.previousPosition ? "rotate-180" : "",
                )}
              />
              <span className="text-md">{Math.abs(offer.position - offer.previousPosition)}</span>
            </>
          ) : (
            <span className="text-md">-</span>
          )}
        </div>

        <div className="w-16 text-center">
          <Tooltip>
            <TooltipTrigger className="text-md">{weeksInTop100}</TooltipTrigger>
            <TooltipContent className="max-w-xs bg-transparent" side="right">
              <div className="flex flex-col gap-1 p-3 bg-gray-50 rounded-md shadow-md w-36">
                <div className="flex justify-between text-xs font-medium text-gray-600">
                  <span>Top 1:</span>
                  <span className="text-gray-900 font-semibold">
                    {offer.metadata.timesInTop1} days
                  </span>
                </div>
                <div className="flex justify-between text-xs font-medium text-gray-600">
                  <span>Top 5:</span>
                  <span className="text-gray-900 font-semibold">
                    {offer.metadata.timesInTop5} days
                  </span>
                </div>
                <div className="flex justify-between text-xs font-medium text-gray-600">
                  <span>Top 10:</span>
                  <span className="text-gray-900 font-semibold">
                    {offer.metadata.timesInTop10} days
                  </span>
                </div>
                <div className="flex justify-between text-xs font-medium text-gray-600">
                  <span>Top 50:</span>
                  <span className="text-gray-900 font-semibold">
                    {offer.metadata.timesInTop50} days
                  </span>
                </div>
                <div className="flex justify-between text-xs font-medium text-gray-600">
                  <span>Top 100:</span>
                  <span className="text-gray-900 font-semibold">
                    {offer.metadata.timesInTop100} days
                  </span>
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        </div>
      </Card>
    </Link>
  );
}
