import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type RefObject,
  type SetStateAction,
} from "react";
import { Portal } from "@radix-ui/react-portal";
import { keepPreviousData, useQueries } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Image } from "@/components/app/image";
import { getImage } from "@/lib/getImage";
import { defaultState, SearchContext, type SearchState } from "@/contexts/global-search";
import { getPlatformsArray, textPlatformIcons } from "@/components/app/platform-icons";
import { httpClient } from "@/lib/http-client";
import { calculatePrice } from "@/lib/calculate-price";
import { useLocale } from "@/hooks/use-locale";
import type { SingleOffer } from "@/types/single-offer";
import type { SingleItem } from "@/types/single-item";
import type { SingleSeller } from "@/types/sellers";
import { cn } from "@/lib/utils";
import {
  CalendarDays,
  Gamepad2,
  Gift,
  SearchIcon,
  Store,
  Tag,
  X,
  type LucideIcon,
} from "lucide-react";

interface SearchProviderProps {
  children: ReactNode;
}

interface Multisearch<T> {
  query: string;
  hits: T[];
  processingTimeMs: number;
  limit: number;
  offset: number;
  estimatedTotalHits: number;
}

interface SearchPortalProps {
  searchState: SearchState;
  setSearchState: Dispatch<SetStateAction<SearchState>>;
  inputRef: RefObject<HTMLInputElement | null>;
}

const SEARCH_LIMIT = 6;
const MIN_QUERY_LENGTH = 2;

export function SearchProvider({ children }: SearchProviderProps) {
  const [searchState, setSearchState] = useState<SearchState>(defaultState);
  const inputRef = useRef<HTMLInputElement>(null);

  const setQuery = useCallback((query: string) => {
    setSearchState((prevState) => ({
      ...prevState,
      query,
    }));
  }, []);

  const setFocus = useCallback((focus: boolean) => {
    setSearchState((prevState) => ({
      ...prevState,
      focus,
    }));
  }, []);

  const contextValue = useMemo(
    () => ({
      ...searchState,
      setQuery,
      setFocus,
      inputRef,
    }),
    [searchState, setFocus, setQuery],
  );

  return (
    <SearchContext.Provider value={contextValue}>
      {children}
      {searchState.focus && (
        <SearchPortal
          searchState={searchState}
          setSearchState={setSearchState}
          inputRef={inputRef}
        />
      )}
    </SearchContext.Provider>
  );
}

function SearchPortal({ searchState, setSearchState, inputRef }: SearchPortalProps) {
  const navigate = useNavigate();
  const { locale } = useLocale();
  const resolvedLocale = locale ?? "en-US";
  const [debouncedQuery, setDebouncedQuery] = useState(searchState.query);

  const query = searchState.query.trim();
  const resolvedQuery = debouncedQuery.trim();
  const queryReady = resolvedQuery.length >= MIN_QUERY_LENGTH;

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedQuery(searchState.query);
    }, 180);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [searchState.query]);

  useEffect(() => {
    window.requestAnimationFrame(() => inputRef.current?.focus());
  }, [inputRef]);

  const [
    { data: offersData, isFetching: offersFetching, isError: offersError },
    { data: itemsData, isFetching: itemsFetching, isError: itemsError },
    { data: sellersData, isFetching: sellersFetching, isError: sellersError },
  ] = useQueries({
    queries: [
      {
        queryKey: ["global-search", "offers", resolvedQuery],
        queryFn: () =>
          httpClient.get<Multisearch<SingleOffer>>("/multisearch/offers", {
            params: { query: resolvedQuery, limit: SEARCH_LIMIT },
          }),
        enabled: queryReady,
        placeholderData: keepPreviousData,
        staleTime: 30_000,
      },
      {
        queryKey: ["global-search", "items", resolvedQuery],
        queryFn: () =>
          httpClient.get<Multisearch<SingleItem>>("/multisearch/items", {
            params: { query: resolvedQuery, limit: SEARCH_LIMIT },
          }),
        enabled: queryReady,
        placeholderData: keepPreviousData,
        staleTime: 30_000,
      },
      {
        queryKey: ["global-search", "sellers", resolvedQuery],
        queryFn: () =>
          httpClient.get<Multisearch<SingleSeller>>("/multisearch/sellers", {
            params: { query: resolvedQuery, limit: SEARCH_LIMIT },
          }),
        enabled: queryReady,
        placeholderData: keepPreviousData,
        staleTime: 30_000,
      },
    ],
  });

  const closeSearch = useCallback(
    (clearQuery = false) => {
      setSearchState((prevState) => ({
        ...prevState,
        focus: false,
        query: clearQuery ? "" : prevState.query,
      }));
    },
    [setSearchState],
  );

  const updateQuery = useCallback(
    (nextQuery: string) => {
      setSearchState((prevState) => ({
        ...prevState,
        query: nextQuery,
      }));
    },
    [setSearchState],
  );

  const openFullSearch = useCallback(
    (title?: string) => {
      closeSearch(true);
      void navigate({
        to: "/search",
        search: title ? { title } : {},
      });
    },
    [closeSearch, navigate],
  );

  const openDiscounts = useCallback(() => {
    closeSearch(true);
    void navigate({
      to: "/search",
      search: { onSale: true },
    });
  }, [closeSearch, navigate]);

  const openOffer = useCallback(
    (id: string) => {
      closeSearch(true);
      void navigate({
        to: "/offers/$id",
        params: { id },
      });
    },
    [closeSearch, navigate],
  );

  const openItem = useCallback(
    (id: string) => {
      closeSearch(true);
      void navigate({
        to: "/items/$id",
        params: { id },
      });
    },
    [closeSearch, navigate],
  );

  const openSeller = useCallback(
    (id: string) => {
      closeSearch(true);
      void navigate({
        to: "/sellers/$id",
        params: { id },
      });
    },
    [closeSearch, navigate],
  );

  const openFreebies = useCallback(() => {
    closeSearch(true);
    void navigate({
      to: "/freebies",
      search: { developerDisplayName: undefined, publisherDisplayName: undefined },
    });
  }, [closeSearch, navigate]);

  const openSales = useCallback(() => {
    closeSearch(true);
    void navigate({ to: "/sales" });
  }, [closeSearch, navigate]);

  const offers = offersData?.hits ?? [];
  const items = itemsData?.hits ?? [];
  const sellers = sellersData?.hits ?? [];
  const isSearching =
    queryReady &&
    (offersFetching || itemsFetching || sellersFetching) &&
    !hasAnyResults(offers, items, sellers);
  const hasNoDirectMatches =
    queryReady &&
    !offersFetching &&
    !itemsFetching &&
    !sellersFetching &&
    !hasAnyResults(offers, items, sellers);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeSearch(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeSearch]);

  return (
    <Portal>
      <div
        className="fixed inset-0 z-[60] bg-background/70 backdrop-blur-sm"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) {
            closeSearch(false);
          }
        }}
      >
        <div className="fixed left-1/2 top-4 z-[61] w-[calc(100%-1rem)] max-w-2xl -translate-x-1/2 sm:top-[10vh]">
          <Command
            shouldFilter={false}
            role="dialog"
            aria-modal="true"
            aria-labelledby="global-search-title"
            className="overflow-hidden rounded-lg border border-border/70 bg-card/95 shadow-2xl"
          >
            <h2 id="global-search-title" className="sr-only">
              Search EGDATA
            </h2>
            <div className="relative">
              <CommandInput
                ref={inputRef}
                value={searchState.query}
                onValueChange={updateQuery}
                placeholder="Search games, items, sellers..."
                className="h-14 pr-11 text-base"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={searchState.query ? "Clear search" : "Close search"}
                onClick={() => {
                  if (searchState.query) {
                    updateQuery("");
                    inputRef.current?.focus();
                    return;
                  }

                  closeSearch(false);
                }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <ScrollArea className="h-[min(74vh,640px)]">
              <CommandList className="max-h-none overflow-x-hidden !overflow-y-visible">
                {!query && (
                  <CommandGroup heading="Quick links">
                    <SearchActionItem
                      icon={SearchIcon}
                      title="Browse catalog"
                      description="Open the advanced offer search"
                      label="Search"
                      onSelect={() => openFullSearch()}
                    />
                    <SearchActionItem
                      icon={Tag}
                      title="Discounts"
                      description="Show offers that are currently on sale"
                      label="Search"
                      onSelect={openDiscounts}
                    />
                    <SearchActionItem
                      icon={Gift}
                      title="Free games"
                      description="Open current and past giveaways"
                      label="Page"
                      onSelect={openFreebies}
                    />
                    <SearchActionItem
                      icon={CalendarDays}
                      title="Sales"
                      description="Open sale events"
                      label="Page"
                      onSelect={openSales}
                    />
                  </CommandGroup>
                )}

                {query && !queryReady && (
                  <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                    Type at least {MIN_QUERY_LENGTH} characters.
                  </div>
                )}

                {queryReady && (
                  <>
                    <CommandGroup heading={`Results for "${query}"`}>
                      <SearchActionItem
                        icon={SearchIcon}
                        title={`Search all offers for "${query}"`}
                        description="Open the full catalog with filters"
                        label="Search"
                        onSelect={() => openFullSearch(query)}
                      />
                    </CommandGroup>

                    <CommandSeparator />

                    {isSearching && <ResultSkeletonList />}

                    {!isSearching && (
                      <>
                        <ResultGroup
                          icon={Tag}
                          title="Offers"
                          count={offersData?.estimatedTotalHits}
                          error={offersError}
                          emptyLabel="No matching offers"
                        >
                          {offers.map((offer) => (
                            <OfferResultItem
                              key={offer.id}
                              offer={offer}
                              locale={resolvedLocale}
                              onSelect={() => openOffer(offer.id)}
                            />
                          ))}
                        </ResultGroup>

                        <ResultGroup
                          icon={Gamepad2}
                          title="Items"
                          count={itemsData?.estimatedTotalHits}
                          error={itemsError}
                          emptyLabel="No matching items"
                        >
                          {items.map((item) => (
                            <ItemResultItem
                              key={item._id}
                              item={item}
                              onSelect={() => openItem(item.id)}
                            />
                          ))}
                        </ResultGroup>

                        <ResultGroup
                          icon={Store}
                          title="Sellers"
                          count={sellersData?.estimatedTotalHits}
                          error={sellersError}
                          emptyLabel="No matching sellers"
                        >
                          {sellers.map((seller) => (
                            <SellerResultItem
                              key={seller._id}
                              seller={seller}
                              onSelect={() => openSeller(seller._id)}
                            />
                          ))}
                        </ResultGroup>
                      </>
                    )}

                    {hasNoDirectMatches && (
                      <div className="px-4 pb-6 pt-2 text-center text-sm text-muted-foreground">
                        No direct matches. Try the full catalog search.
                      </div>
                    )}
                  </>
                )}
              </CommandList>
            </ScrollArea>
          </Command>
        </div>
      </div>
    </Portal>
  );
}

function SearchActionItem({
  icon: Icon,
  title,
  description,
  label,
  onSelect,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  label: string;
  onSelect: () => void;
}) {
  return (
    <CommandItem
      value={`${label} ${title} ${description}`}
      onSelect={onSelect}
      className="flex min-h-14 items-center gap-3 rounded-md px-3 py-2"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{title}</span>
        <span className="block truncate text-xs text-muted-foreground">{description}</span>
      </span>
      <Badge variant="outline" className="ml-2 shrink-0">
        {label}
      </Badge>
    </CommandItem>
  );
}

function ResultGroup({
  icon: Icon,
  title,
  count,
  error,
  emptyLabel,
  children,
}: {
  icon: LucideIcon;
  title: string;
  count?: number;
  error: boolean;
  emptyLabel: string;
  children: ReactNode;
}) {
  const childCount = useMemo(() => {
    if (!Array.isArray(children)) {
      return children ? 1 : 0;
    }

    return children.filter(Boolean).length;
  }, [children]);

  return (
    <CommandGroup
      heading={
        <span className="flex items-center gap-2">
          <Icon className="h-3.5 w-3.5" />
          <span>{title}</span>
          {count !== undefined && (
            <span className="text-muted-foreground/70">{formatCount(count)}</span>
          )}
        </span>
      }
    >
      {error && <ResultNotice>Could not load {title.toLowerCase()}.</ResultNotice>}
      {!error && childCount === 0 && <ResultNotice>{emptyLabel}</ResultNotice>}
      {!error && children}
    </CommandGroup>
  );
}

function OfferResultItem({
  offer,
  locale,
  onSelect,
}: {
  offer: SingleOffer;
  locale: string;
  onSelect: () => void;
}) {
  const price = formatOfferPrice(offer.price, locale);

  return (
    <CommandItem
      value={`offer ${offer.title} ${offer.seller?.name ?? ""}`}
      onSelect={onSelect}
      className="flex min-h-16 items-center gap-3 rounded-md px-3 py-2"
    >
      <ResultImage
        src={
          getImage(offer.keyImages, [
            "DieselStoreFrontWide",
            "OfferImageWide",
            "DieselGameBoxWide",
            "TakeoverWide",
          ])?.url
        }
        alt={offer.title}
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{offer.title}</span>
        <span className="block truncate text-xs text-muted-foreground">
          {offer.seller?.name ?? "Epic Games Store offer"}
        </span>
      </span>
      <span className="ml-2 flex shrink-0 items-center gap-2">
        {offer.prePurchase && (
          <Badge variant="secondary" className="hidden sm:inline-flex">
            Pre-purchase
          </Badge>
        )}
        {price && (
          <span
            className={cn(
              "text-sm font-semibold",
              price === "Free" ? "text-primary" : "text-foreground",
            )}
          >
            {price}
          </span>
        )}
      </span>
    </CommandItem>
  );
}

function ItemResultItem({ item, onSelect }: { item: SingleItem; onSelect: () => void }) {
  const platforms = getPlatformsArray(item.releaseInfo).filter(
    (platform) => textPlatformIcons[platform],
  );

  return (
    <CommandItem
      value={`item ${item.title} ${item.namespace}`}
      onSelect={onSelect}
      className="flex min-h-16 items-center gap-3 rounded-md px-3 py-2"
    >
      <ResultImage
        src={getImage(item.keyImages, ["DieselGameBoxWide", "DieselGameBox"])?.url}
        alt={item.title}
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{item.title}</span>
        <span className="block truncate text-xs text-muted-foreground">
          {item.itemType || "Item"} - {item.namespace}
        </span>
      </span>
      {platforms.length > 0 && (
        <span className="ml-2 hidden shrink-0 items-center gap-2 text-sm text-muted-foreground sm:flex">
          {platforms.slice(0, 4).map((platform) => (
            <span key={platform} title={platform}>
              {textPlatformIcons[platform]}
            </span>
          ))}
        </span>
      )}
    </CommandItem>
  );
}

function SellerResultItem({ seller, onSelect }: { seller: SingleSeller; onSelect: () => void }) {
  return (
    <CommandItem
      value={`seller ${seller.name}`}
      onSelect={onSelect}
      className="flex min-h-16 items-center gap-3 rounded-md px-3 py-2"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
        {seller.logo?.url ? (
          <img
            src={seller.logo.url}
            alt=""
            className="h-full w-full object-cover"
            width={44}
            height={44}
            loading="lazy"
          />
        ) : (
          <Store className="h-4 w-4 text-muted-foreground" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{seller.name}</span>
        <span className="block truncate text-xs text-muted-foreground">
          {seller.igdb_id ? `IGDB ${seller.igdb_id}` : "Seller"}
        </span>
      </span>
      <Badge variant="outline" className="ml-2 shrink-0">
        Seller
      </Badge>
    </CommandItem>
  );
}

function ResultImage({ src, alt }: { src?: string; alt: string }) {
  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
      <Image
        src={src ?? "/placeholder.webp"}
        alt={alt}
        height={44}
        width={44}
        quality="low"
        sizes="44px"
        className="h-full w-full object-cover"
      />
    </span>
  );
}

function ResultNotice({ children }: { children: ReactNode }) {
  return <div className="px-3 py-3 text-sm text-muted-foreground">{children}</div>;
}

function ResultSkeletonList() {
  return (
    <div className="space-y-2 p-3">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="flex min-h-16 items-center gap-3 rounded-md px-3 py-2">
          <Skeleton className="h-11 w-11 rounded-md" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="h-6 w-16 rounded-md" />
        </div>
      ))}
    </div>
  );
}

function hasAnyResults(offers: SingleOffer[], items: SingleItem[], sellers: SingleSeller[]) {
  return offers.length > 0 || items.length > 0 || sellers.length > 0;
}

function formatOfferPrice(price: SingleOffer["price"], locale: string) {
  if (!price) {
    return null;
  }

  if (price.price.discountPrice === 0) {
    return "Free";
  }

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: price.price.currencyCode,
    currencySign: "standard",
  }).format(calculatePrice(price.price.discountPrice, price.price.currencyCode));
}

function formatCount(count: number) {
  if (count > 9999) {
    return new Intl.NumberFormat("en", { notation: "compact" }).format(count);
  }

  return count.toLocaleString("en");
}
