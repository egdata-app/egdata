import { useForm } from "@tanstack/react-form";
import { type TypeOf, z } from "zod";
import { useSearchDispatch, useSearchState } from "@/hooks/use-search-state";
import { useCountry } from "@/hooks/use-country";
import { usePreferences } from "@/hooks/use-preferences";
import { useNavigate } from "@tanstack/react-router";
import { useDebounce } from "@uidotdev/usehooks";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { httpClient } from "@/lib/http-client";
import type { SingleOffer } from "@/types/single-offer";
import { cn } from "@/lib/utils";
import { OfferCard, GameCardSkeleton } from "@/components/app/offer-card";
import { OfferListItem } from "@/components/app/game-card";
import { DynamicPagination } from "@/components/app/dynamic-pagination";
import { useEffect, useState } from "react";

export const formSchema = z.object({
  title: z.string().optional(),
  offerType: z
    .enum([
      "IN_GAME_PURCHASE",
      "BASE_GAME",
      "EXPERIENCE",
      "UNLOCKABLE",
      "ADD_ON",
      "Bundle",
      "CONSUMABLE",
      "WALLET",
      "OTHERS",
      "DEMO",
      "DLC",
      "VIRTUAL_CURRENCY",
      "BUNDLE",
      "DIGITAL_EXTRA",
      "EDITION",
      "SUBSCRIPTION",
    ])
    .optional(),
  tags: z.string().array().optional(),
  customAttributes: z.string().array().optional(),
  seller: z.string().optional(),
  sortBy: z
    .enum([
      "releaseDate",
      "lastModifiedDate",
      "effectiveDate",
      "creationDate",
      "viewableDate",
      "pcReleaseDate",
      "upcoming",
      "priceAsc",
      "priceDesc",
      "price",
      "discount",
      "discountPercent",
    ])
    .optional(),
  sortDir: z.enum(["asc", "desc"]).optional(),
  limit: z.number().optional(),
  page: z.number().optional(),
  refundType: z.string().optional(),
  isCodeRedemptionOnly: z.boolean().optional(),
  excludeBlockchain: z.boolean().optional(),
  price: z
    .object({
      min: z.number().optional(),
      max: z.number().optional(),
    })
    .optional(),
  onSale: z.boolean().optional(),
  categories: z.string().array().optional(),
  developerDisplayName: z.string().optional(),
  publisherDisplayName: z.string().optional(),
});

export type SearchFormProps = {
  // @ts-expect-error
  form?: ReturnType<typeof useForm<TypeOf<typeof formSchema>>>;
  defaultValues?: Partial<TypeOf<typeof formSchema>>;
  onSearch?: (search: TypeOf<typeof formSchema>) => void;
  showFilters?: boolean;
  showSort?: boolean;
  showViewToggle?: boolean;
  className?: string;
  resultsClassName?: string;
  initialPage?: number;
  initialHash?: string;
  fixedFilters?: Partial<TypeOf<typeof formSchema>>;
  showPastGiveaways?: boolean;
};

export function SearchForm({
  form: externalForm,
  defaultValues = {},
  onSearch,
  className,
  resultsClassName,
  initialPage = 1,
  fixedFilters = {},
}: SearchFormProps) {
  const [showLongLoading, setShowLongLoading] = useState(false);
  const { isFetching, currentPageNumber, totalCount } = useSearchState();
  const { view } = usePreferences();
  const { setCurrentPageNumber, setHash, setIsFetching } = useSearchDispatch();
  const { country } = useCountry();
  const navigate = useNavigate();

  const internalForm = useForm({
    defaultValues: {
      title: "",
      offerType: undefined,
      tags: undefined,
      customAttributes: undefined,
      seller: undefined,
      sortBy: "lastModifiedDate",
      sortDir: "desc",
      limit: 28,
      page: initialPage,
      refundType: undefined,
      isCodeRedemptionOnly: undefined,
      excludeBlockchain: undefined,
      price: {
        min: undefined,
        max: undefined,
      },
      onSale: undefined,
      categories: undefined,
      developerDisplayName: undefined,
      publisherDisplayName: undefined,
      ...defaultValues,
      ...fixedFilters,
    } as TypeOf<typeof formSchema>,
    asyncDebounceMs: 300,
    asyncAlways: true,
  });

  const form = externalForm || internalForm;

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;

    if (isFetching) {
      timeout = setTimeout(() => {
        setShowLongLoading(true);
      }, 3000);
    } else {
      setShowLongLoading(false);
    }

    return () => clearTimeout(timeout);
  }, [isFetching]);

  useEffect(() => {
    form.setFieldValue("page", currentPageNumber);
  }, [currentPageNumber, form]);

  return (
    <form.Subscribe
      selector={(state) => state.values}
      // biome-ignore lint/correctness/noChildrenProp: <explanation>
      children={(values) => {
        const debouncedSearch = useDebounce(values, 300);

        const {
          isPending,
          error,
          data,
          isFetching: isSearchFetching,
        } = useQuery({
          queryKey: [
            "search",
            {
              ...cleanBody({ search: debouncedSearch }),
              country,
            },
          ],
          queryFn: () =>
            httpClient.post<{
              elements: SingleOffer[];
              page: number;
              limit: number;
              query: string;
              total: number;
            }>("/search", cleanBody({ search: debouncedSearch }), {
              params: { country },
            }),
          placeholderData: keepPreviousData,
        });

        useEffect(() => {
          if (data?.query) {
            setHash(data.query);
            navigate({
              search: {
                page: data.page,
                hash: data.query,
              },
            });
          }
        }, [data?.query, data?.page, navigate]);

        useEffect(() => {
          setIsFetching(isSearchFetching);
        }, [isSearchFetching]);

        useEffect(() => {
          onSearch?.(debouncedSearch);
        }, [debouncedSearch]);

        if (isPending && !data) {
          return (
            <div
              className={cn(
                "w-full flex flex-col gap-4",
                view === "grid"
                  ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
                  : "flex flex-col gap-4",
                resultsClassName,
              )}
            >
              {Array.from({ length: 34 }).map((_, i) => (
                <GameCardSkeleton key={`skeleton-${i}`} />
              ))}
            </div>
          );
        }

        if (error) {
          return <div>Error: {error.message}</div>;
        }

        if (!data || data.elements.length === 0) {
          return (
            <div className="flex flex-col items-center justify-center h-full">
              <span className="text-gray-400">No results found</span>
            </div>
          );
        }

        return (
          <section className={cn("flex flex-col gap-4 w-full overflow-hidden", className)}>
            <div
              className={cn(
                view === "grid"
                  ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
                  : "flex flex-col gap-4",
                resultsClassName,
              )}
            >
              {data.elements.map((offer) => {
                if (view === "grid") {
                  return <OfferCard key={offer.id} offer={offer} size="md" />;
                }

                return <OfferListItem key={offer.id} game={offer} />;
              })}
            </div>
            <SearchPagination
              page={values.page ?? 1}
              setPage={setCurrentPageNumber}
              total={totalCount || 0}
              limit={data.limit}
            />
            {showLongLoading && (
              <div className="absolute inset-0 bg-opacity-90 bg-gray-900 z-10 w-full h-screen flex items-center justify-center rounded-xl">
                <span className="flex flex-col items-center justify-center gap-2">
                  <div className="flex flex-col items-center justify-center gap-1">
                    <span className="text-sm font-medium">Loading...</span>
                    <span className="text-xs text-gray-400">
                      This query is taking more than usual...
                    </span>
                  </div>
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5"
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
                </span>
              </div>
            )}
          </section>
        );
      }}
    />
  );
}

function cleanBody(search: { search: TypeOf<typeof formSchema> }): TypeOf<typeof formSchema> {
  const result = { ...search.search };

  for (const key of Object.keys(result)) {
    if (result[key] === "") {
      delete result[key];
    }
    if (JSON.stringify(result[key]) === "[]") {
      delete result[key];
    }
  }

  return result;
}

function SearchPagination({
  page,
  setPage,
  total,
  limit,
}: {
  page: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  total: number;
  limit: number;
}) {
  const navigate = useNavigate();
  const totalPages = Math.ceil(total / limit);

  // If there is only one page, don't show the pagination
  if (totalPages <= 1) {
    return null;
  }

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
    navigate({
      search: (prevState) => {
        return {
          ...prevState,
          page: newPage,
        };
      },
    });
  };

  return (
    <DynamicPagination currentPage={page} setPage={handlePageChange} totalPages={totalPages} />
  );
}
