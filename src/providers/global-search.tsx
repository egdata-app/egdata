import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react";
import { Portal } from "@radix-ui/react-portal";
import { keepPreviousData, useQueries, useQuery } from "@tanstack/react-query";
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
import { SearchContext } from "@/contexts/global-search";
import { getPlatformsArray, textPlatformIcons } from "@/components/app/platform-icons";
import { httpClient } from "@/lib/http-client";
import { getV1PaginationTotal, type V1CursorPaginationMeta } from "@/lib/v1-adapters";
import { calculatePrice } from "@/lib/calculate-price";
import { getEffectivePrice } from "@/lib/effective-price";
import type { Price } from "@/types/price";
import { useTranslation } from "@/lib/paraglide-react";
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
  Sparkles,
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

interface GlobalSearchOffer {
  id: string;
  title: string;
  seller?: {
    name?: string | null;
  } | null;
  keyImages?: Array<{
    type: string;
    url: string;
    md5?: string;
  }> | null;
  price?: Price | null;
  prePurchase?: boolean | null;
}

interface NaturalLanguageSearchResponse {
  query: string;
  count: number;
  matches: Array<{
    score: number;
    offer: GlobalSearchOffer;
  }>;
}

interface SearchPortalProps {
  initialQuery: string;
  closeSearch: (clearQuery?: boolean) => void;
  storeQuery: (query: string) => void;
  inputRef: RefObject<HTMLInputElement | null>;
}

const SEARCH_LIMIT = 6;
const MIN_QUERY_LENGTH = 2;
const MAX_QUERY_LENGTH = 500;
const DIRECT_SEARCH_DEBOUNCE_MS = 180;
const SEMANTIC_SEARCH_DEBOUNCE_MS = 400;
const RESULTS_MAX_HEIGHT = 640;
const RESULTS_MAX_VIEWPORT_RATIO = 0.74;
const GROUP_CLASS_NAME = "min-w-0 max-w-full [&_[cmdk-group-items]]:min-w-0";
const RESULT_ROW_CLASS_NAME =
  "group w-full max-w-full min-w-0 cursor-pointer items-center gap-3 overflow-hidden rounded-lg px-3 py-2 transition-colors duration-150 hover:bg-card hover:text-foreground data-[focused]:bg-card data-[focused]:text-foreground";
const RESULT_ROW_STYLE: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "auto minmax(0, 1fr) auto",
};

export function SearchProvider({ children }: SearchProviderProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastQueryRef = useRef("");

  const storeQuery = useCallback((query: string) => {
    lastQueryRef.current = query;
  }, []);

  const setFocus = useCallback((focus: boolean) => {
    setSearchOpen(focus);
  }, []);

  const toggleFocus = useCallback(() => {
    setSearchOpen((open) => !open);
  }, []);

  const closeSearch = useCallback((clearQuery = false) => {
    if (clearQuery) {
      lastQueryRef.current = "";
    }

    setSearchOpen(false);
  }, []);

  const contextValue = useMemo(
    () => ({
      inputRef,
      setFocus,
      toggleFocus,
    }),
    [setFocus, toggleFocus],
  );

  return (
    <SearchContext.Provider value={contextValue}>
      {children}
      {searchOpen && (
        <SearchPortal
          initialQuery={lastQueryRef.current}
          closeSearch={closeSearch}
          storeQuery={storeQuery}
          inputRef={inputRef}
        />
      )}
    </SearchContext.Provider>
  );
}

function SearchPortal({ initialQuery, closeSearch, storeQuery, inputRef }: SearchPortalProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { locale } = useLocale();
  const resolvedLocale = locale ?? "en-US";
  const [queryValue, setQueryValue] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [semanticDebouncedQuery, setSemanticDebouncedQuery] = useState(initialQuery);
  const [resultsHeight, setResultsHeight] = useState(0);
  const commandListRef = useRef<HTMLDivElement>(null);

  const query = queryValue.trim();
  const resolvedQuery = debouncedQuery.trim();
  const semanticResolvedQuery = semanticDebouncedQuery.trim();
  const queryReady = resolvedQuery.length >= MIN_QUERY_LENGTH;
  const semanticQueryReady =
    semanticResolvedQuery.length >= MIN_QUERY_LENGTH &&
    semanticResolvedQuery.length <= MAX_QUERY_LENGTH;
  const semanticQueryIsCurrent = semanticResolvedQuery === query;

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedQuery(queryValue);
    }, DIRECT_SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [queryValue]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSemanticDebouncedQuery(queryValue);
    }, SEMANTIC_SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [queryValue]);

  useEffect(() => {
    window.requestAnimationFrame(() => inputRef.current?.focus());
  }, [inputRef]);

  useEffect(() => {
    let animationFrame: number | undefined;
    let cleanupObservers: (() => void) | undefined;

    const connectHeightObserver = () => {
      const commandList = commandListRef.current;
      // `CommandList` is the scroll content now that ScrollArea renders a plain
      // scroll container (React Aria migration). Radix's viewport element no
      // longer exists, which used to leave this observer without a target and
      // collapsed the palette to zero height.
      const content = commandList?.querySelector<HTMLElement>('[data-slot="command-list"]');
      if (!commandList || !content) {
        animationFrame = window.requestAnimationFrame(connectHeightObserver);
        return;
      }

      const updateHeight = () => {
        const maxHeight = Math.min(
          window.innerHeight * RESULTS_MAX_VIEWPORT_RATIO,
          RESULTS_MAX_HEIGHT,
        );
        const nextHeight = Math.min(content.scrollHeight, maxHeight);

        setResultsHeight((currentHeight) =>
          Math.abs(currentHeight - nextHeight) < 1 ? currentHeight : nextHeight,
        );
      };

      const scheduleHeightUpdate = () => window.requestAnimationFrame(updateHeight);
      const resizeObserver = new ResizeObserver(scheduleHeightUpdate);
      const mutationObserver = new MutationObserver(scheduleHeightUpdate);
      resizeObserver.observe(content);
      mutationObserver.observe(content, { childList: true, subtree: true, characterData: true });
      window.addEventListener("resize", scheduleHeightUpdate);
      updateHeight();

      cleanupObservers = () => {
        resizeObserver.disconnect();
        mutationObserver.disconnect();
        window.removeEventListener("resize", scheduleHeightUpdate);
      };
    };

    connectHeightObserver();

    return () => {
      if (animationFrame !== undefined) {
        window.cancelAnimationFrame(animationFrame);
      }
      cleanupObservers?.();
    };
  }, []);

  const [
    { data: offersData, isFetching: offersFetching, isError: offersError },
    { data: itemsData, isFetching: itemsFetching, isError: itemsError },
    { data: sellersData, isFetching: sellersFetching, isError: sellersError },
  ] = useQueries({
    queries: [
      {
        queryKey: ["global-search", "offers", resolvedQuery],
        queryFn: async ({ signal }) => {
          const envelope = await httpClient.v1GetEnvelope<SingleOffer[], V1CursorPaginationMeta>(
            "/multisearch/offers",
            {
              params: { query: resolvedQuery, limit: SEARCH_LIMIT },
              signal,
            },
          );
          const hits = Array.isArray(envelope?.data) ? envelope.data : [];
          return {
            query: resolvedQuery,
            hits,
            processingTimeMs: 0,
            limit: envelope?.meta?.pagination?.limit ?? SEARCH_LIMIT,
            offset: 0,
            estimatedTotalHits: getV1PaginationTotal(envelope?.meta?.pagination, hits.length),
          } satisfies Multisearch<SingleOffer>;
        },
        enabled: queryReady,
        placeholderData: keepPreviousData,
        staleTime: 30_000,
      },
      {
        queryKey: ["global-search", "items", resolvedQuery],
        queryFn: async ({ signal }) => {
          const envelope = await httpClient.v1GetEnvelope<SingleItem[], V1CursorPaginationMeta>(
            "/multisearch/items",
            {
              params: { query: resolvedQuery, limit: SEARCH_LIMIT },
              signal,
            },
          );
          const hits = Array.isArray(envelope?.data) ? envelope.data : [];
          return {
            query: resolvedQuery,
            hits,
            processingTimeMs: 0,
            limit: envelope?.meta?.pagination?.limit ?? SEARCH_LIMIT,
            offset: 0,
            estimatedTotalHits: getV1PaginationTotal(envelope?.meta?.pagination, hits.length),
          } satisfies Multisearch<SingleItem>;
        },
        enabled: queryReady,
        placeholderData: keepPreviousData,
        staleTime: 30_000,
      },
      {
        queryKey: ["global-search", "sellers", resolvedQuery],
        queryFn: async ({ signal }) => {
          const envelope = await httpClient.v1GetEnvelope<SingleSeller[], { count?: number }>(
            "/multisearch/sellers",
            {
              params: { query: resolvedQuery, limit: SEARCH_LIMIT },
              signal,
            },
          );
          const hits = Array.isArray(envelope?.data) ? envelope.data : [];
          return {
            query: resolvedQuery,
            hits,
            processingTimeMs: 0,
            limit: SEARCH_LIMIT,
            offset: 0,
            estimatedTotalHits:
              typeof envelope?.meta?.count === "number" ? envelope.meta.count : hits.length,
          } satisfies Multisearch<SingleSeller>;
        },
        enabled: queryReady,
        placeholderData: keepPreviousData,
        staleTime: 30_000,
      },
    ],
  });

  const {
    data: semanticData,
    isFetching: semanticFetching,
    isError: semanticError,
  } = useQuery({
    queryKey: ["global-search", "natural-language", semanticResolvedQuery, resolvedLocale],
    queryFn: async ({ signal }) => {
      const envelope = await httpClient.v1PostEnvelope<
        Array<{ score: number; offer: GlobalSearchOffer }>,
        { query?: string; count?: number }
      >(
        "/search/natural-language",
        { query: semanticResolvedQuery, topK: SEARCH_LIMIT },
        {
          params: { locale: resolvedLocale },
          signal,
        },
      );
      const matches = Array.isArray(envelope?.data) ? envelope.data : [];
      return {
        query: envelope?.meta?.query ?? semanticResolvedQuery,
        count: typeof envelope?.meta?.count === "number" ? envelope.meta.count : matches.length,
        matches,
      } satisfies NaturalLanguageSearchResponse;
    },
    enabled: semanticQueryReady,
    staleTime: 30_000,
    retry: false,
  });

  const updateQuery = useCallback(
    (nextQuery: string) => {
      const limitedQuery = nextQuery.slice(0, MAX_QUERY_LENGTH);
      setQueryValue(limitedQuery);
      storeQuery(limitedQuery);
    },
    [storeQuery],
  );

  const openFullSearch = useCallback(
    (title?: string) => {
      closeSearch(true);
      void navigate({
        to: "/{-$locale}/search",
        search: title ? { title } : {},
      });
    },
    [closeSearch, navigate],
  );

  const openDiscounts = useCallback(() => {
    closeSearch(true);
    void navigate({
      to: "/{-$locale}/search",
      search: { onSale: true },
    });
  }, [closeSearch, navigate]);

  const openOffer = useCallback(
    (id: string) => {
      closeSearch(true);
      void navigate({
        to: "/{-$locale}/offers/$id",
        params: { id },
      });
    },
    [closeSearch, navigate],
  );

  const openItem = useCallback(
    (id: string) => {
      closeSearch(true);
      void navigate({
        to: "/{-$locale}/items/$id",
        params: { id },
      });
    },
    [closeSearch, navigate],
  );

  const openSeller = useCallback(
    (id: string) => {
      closeSearch(true);
      void navigate({
        to: "/{-$locale}/sellers/$id",
        params: { id },
      });
    },
    [closeSearch, navigate],
  );

  const openFreebies = useCallback(() => {
    closeSearch(true);
    void navigate({
      to: "/{-$locale}/freebies",
      search: { developerDisplayName: undefined, publisherDisplayName: undefined },
    });
  }, [closeSearch, navigate]);

  const openSales = useCallback(() => {
    closeSearch(true);
    void navigate({ to: "/{-$locale}/sales" });
  }, [closeSearch, navigate]);

  const offers = useMemo(() => offersData?.hits ?? [], [offersData?.hits]);
  const items = itemsData?.hits ?? [];
  const sellers = sellersData?.hits ?? [];
  const semanticOffers = useMemo(() => {
    if (!semanticQueryIsCurrent) return [];

    const seenOfferIds = new Set(offers.map((offer) => offer.id));
    const uniqueOffers: GlobalSearchOffer[] = [];

    for (const match of semanticData?.matches ?? []) {
      if (!match.offer?.id || seenOfferIds.has(match.offer.id)) continue;

      seenOfferIds.add(match.offer.id);
      uniqueOffers.push(match.offer);
    }

    return uniqueOffers;
  }, [offers, semanticData, semanticQueryIsCurrent]);
  const semanticPending =
    query.length >= MIN_QUERY_LENGTH && (!semanticQueryIsCurrent || semanticFetching);
  const isSearching =
    queryReady &&
    (offersFetching || itemsFetching || sellersFetching) &&
    !hasAnyResults(offers, items, sellers);
  const hasNoMatches =
    queryReady &&
    !offersFetching &&
    !itemsFetching &&
    !sellersFetching &&
    semanticQueryIsCurrent &&
    !semanticFetching &&
    !hasAnyResults(offers, items, sellers) &&
    semanticOffers.length === 0;

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
        className="fixed inset-0 z-[60] bg-background/75 backdrop-blur-sm"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) {
            closeSearch(false);
          }
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="global-search-title"
          className="fixed left-1/2 top-4 z-[61] w-[calc(100%-1rem)] max-w-2xl -translate-x-1/2 sm:top-[10vh]"
        >
          <Command
            filter={() => true}
            inputValue={queryValue}
            onInputChange={updateQuery}
            className="overflow-hidden rounded-2xl border border-white/10 bg-popover text-popover-foreground shadow-2xl shadow-black/60"
          >
            <h2 id="global-search-title" className="sr-only">
              Search EGDATA
            </h2>
            <div
              className="relative"
              ref={(el) => {
                inputRef.current = el?.querySelector("input") ?? null;
              }}
            >
              <CommandInput
                value={queryValue}
                onChange={(event) => updateQuery(event.target.value)}
                maxLength={MAX_QUERY_LENGTH}
                placeholder="Search games, items, sellers..."
                className="h-14 pr-11 text-base"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors duration-150 hover:bg-muted/80 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={queryValue ? "Clear search" : "Close search"}
                onClick={() => {
                  if (queryValue) {
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

            <ScrollArea
              ref={commandListRef}
              className="max-h-[min(74vh,640px)] motion-safe:transition-[height] motion-safe:duration-200 motion-safe:ease-out"
              style={{ height: resultsHeight }}
            >
              <CommandList className="max-h-none overflow-x-hidden !overflow-y-visible pr-3">
                {!query && (
                  <CommandGroup className={GROUP_CLASS_NAME} heading="Quick links">
                    <SearchActionItem
                      value="action:browse-catalog"
                      icon={SearchIcon}
                      title="Browse catalog"
                      description="Open the advanced offer search"
                      label="Search"
                      onSelect={() => openFullSearch()}
                    />
                    <SearchActionItem
                      value="action:discounts"
                      icon={Tag}
                      title="Discounts"
                      description="Show offers that are currently on sale"
                      label="Search"
                      onSelect={openDiscounts}
                    />
                    <SearchActionItem
                      value="action:free-games"
                      icon={Gift}
                      title="Free games"
                      description="Open current and past giveaways"
                      label="Page"
                      onSelect={openFreebies}
                    />
                    <SearchActionItem
                      value="action:sales"
                      icon={CalendarDays}
                      title="Sales"
                      description="Open sale events"
                      label="Page"
                      onSelect={openSales}
                    />
                  </CommandGroup>
                )}

                {query && !queryReady && (
                  <ResultNotice>Type at least {MIN_QUERY_LENGTH} characters.</ResultNotice>
                )}

                {queryReady && (
                  <>
                    <CommandGroup className={GROUP_CLASS_NAME} heading={`Results for "${query}"`}>
                      <SearchActionItem
                        value="action:search-offers"
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

                        {semanticPending && (
                          <ResultGroup
                            icon={Sparkles}
                            title={t("globalSearch.semantic.heading")}
                            error={false}
                            emptyLabel=""
                          >
                            <ResultNotice>{t("globalSearch.semantic.loading")}</ResultNotice>
                          </ResultGroup>
                        )}

                        {semanticQueryIsCurrent && semanticError && (
                          <ResultGroup
                            icon={Sparkles}
                            title={t("globalSearch.semantic.heading")}
                            error={true}
                            errorLabel={t("globalSearch.semantic.error")}
                            emptyLabel=""
                          >
                            {null}
                          </ResultGroup>
                        )}

                        {semanticQueryIsCurrent &&
                          !semanticFetching &&
                          !semanticError &&
                          semanticOffers.length > 0 && (
                            <ResultGroup
                              icon={Sparkles}
                              title={t("globalSearch.semantic.heading")}
                              count={semanticOffers.length}
                              error={false}
                              emptyLabel=""
                            >
                              {semanticOffers.map((offer) => (
                                <OfferResultItem
                                  key={offer.id}
                                  offer={offer}
                                  locale={resolvedLocale}
                                  onSelect={() => openOffer(offer.id)}
                                />
                              ))}
                            </ResultGroup>
                          )}

                        <ResultGroup
                          icon={Gamepad2}
                          title="Items"
                          count={itemsData?.estimatedTotalHits}
                          error={itemsError}
                          emptyLabel="No matching items"
                        >
                          {items.map((item, index) => {
                            const itemKey = item._id || item.id || `${index}`;
                            return (
                              <ItemResultItem
                                key={`${itemKey}-${index}`}
                                itemId={itemKey}
                                item={item}
                                onSelect={() => openItem(item.id || item._id)}
                              />
                            );
                          })}
                        </ResultGroup>

                        <ResultGroup
                          icon={Store}
                          title="Sellers"
                          count={sellersData?.estimatedTotalHits}
                          error={sellersError}
                          emptyLabel="No matching sellers"
                        >
                          {sellers.map((seller, index) => {
                            const sellerId = seller._id || seller.id || seller.name || `${index}`;
                            return (
                              <SellerResultItem
                                key={`${sellerId}-${index}`}
                                sellerId={sellerId}
                                seller={seller}
                                onSelect={() => openSeller(seller._id || seller.id || "")}
                              />
                            );
                          })}
                        </ResultGroup>
                      </>
                    )}

                    {hasNoMatches && (
                      <ResultNotice>No matches. Try the full catalog search.</ResultNotice>
                    )}
                  </>
                )}
              </CommandList>
            </ScrollArea>
            <div className="hidden items-center justify-between border-t border-border/50 bg-card/50 px-4 py-2 text-[11px] text-muted-foreground/75 sm:flex">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1">
                  <kbd className="rounded border border-border/70 bg-background/80 px-1.5 py-0.5 text-[10px]">
                    ↑↓
                  </kbd>
                  <span>Navigate</span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <kbd className="rounded border border-border/70 bg-background/80 px-1.5 py-0.5 text-[10px]">
                    ↵
                  </kbd>
                  <span>Open</span>
                </span>
              </div>
              <span className="inline-flex items-center gap-1">
                <kbd className="rounded border border-border/70 bg-background/80 px-1.5 py-0.5 text-[10px]">
                  Esc
                </kbd>
                <span>Close</span>
              </span>
            </div>
          </Command>
        </div>
      </div>
    </Portal>
  );
}

function SearchActionItem({
  value,
  icon: Icon,
  title,
  description,
  label,
  onSelect,
}: {
  value: string;
  icon: LucideIcon;
  title: string;
  description: string;
  label: string;
  onSelect: () => void;
}) {
  return (
    <CommandItem
      id={value}
      textValue={`${label} ${title} ${description}`}
      onAction={onSelect}
      className={cn("min-h-[52px]", RESULT_ROW_CLASS_NAME)}
      style={RESULT_ROW_STYLE}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-card/80 text-muted-foreground transition-colors duration-150 group-hover:border-primary/40 group-hover:text-primary">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium transition-colors duration-150 group-hover:text-primary">
          {title}
        </span>
        <span className="block truncate text-xs text-muted-foreground">{description}</span>
      </span>
      <Badge
        variant="outline"
        className="ml-2 shrink-0 rounded-full border-border/70 bg-background/50 px-2.5 text-[11px] font-medium text-muted-foreground"
      >
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
  errorLabel,
  emptyLabel,
  children,
}: {
  icon: LucideIcon;
  title: string;
  count?: number;
  error: boolean;
  errorLabel?: string;
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
      className={GROUP_CLASS_NAME}
      heading={count !== undefined ? `${title} (${formatCount(count)})` : title}
    >
      {error && (
        <ResultNotice key="error">
          {errorLabel ?? `Could not load ${title.toLowerCase()}.`}
        </ResultNotice>
      )}
      {!error && childCount === 0 && <ResultNotice key="empty">{emptyLabel}</ResultNotice>}
      {!error && children}
    </CommandGroup>
  );
}

function OfferResultItem({
  offer,
  locale,
  onSelect,
}: {
  offer: GlobalSearchOffer;
  locale: string;
  onSelect: () => void;
}) {
  const price = formatOfferPrice(offer.price, locale);

  return (
    <CommandItem
      id={`offer:${offer.id}`}
      textValue={`${offer.title} ${offer.seller?.name ?? ""}`}
      onAction={onSelect}
      className={cn("min-h-[60px]", RESULT_ROW_CLASS_NAME)}
      style={RESULT_ROW_STYLE}
    >
      <ResultImage
        src={
          getImage(offer.keyImages ?? null, [
            "DieselStoreFrontWide",
            "OfferImageWide",
            "DieselGameBoxWide",
            "TakeoverWide",
          ])?.url
        }
        alt={offer.title}
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium transition-colors duration-150 group-hover:text-primary">
          {offer.title}
        </span>
        <span className="block truncate text-xs text-muted-foreground">
          {offer.seller?.name ?? "Epic Games Store offer"}
        </span>
      </span>
      <span className="ml-2 flex min-w-0 items-center justify-end gap-2 overflow-hidden">
        {offer.prePurchase && (
          <Badge
            variant="secondary"
            className="hidden max-w-full truncate rounded-full bg-primary/15 px-2.5 text-[11px] font-medium text-primary sm:inline-flex"
          >
            Pre-purchase
          </Badge>
        )}
        {price &&
          (price === "Free" ? (
            <span className="inline-flex shrink-0 items-center rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-300 tabular-nums">
              {price}
            </span>
          ) : (
            <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
              {price}
            </span>
          ))}
      </span>
    </CommandItem>
  );
}

function ItemResultItem({
  itemId,
  item,
  onSelect,
}: {
  itemId: string;
  item: SingleItem;
  onSelect: () => void;
}) {
  const platforms = getPlatformsArray(item.releaseInfo).filter(
    (platform) => textPlatformIcons[platform],
  );

  return (
    <CommandItem
      id={`item:${itemId}`}
      textValue={`${item.title} ${item.namespace}`}
      onAction={onSelect}
      className={cn("min-h-[60px]", RESULT_ROW_CLASS_NAME)}
      style={RESULT_ROW_STYLE}
    >
      <ResultImage
        src={getImage(item.keyImages, ["DieselGameBoxWide", "DieselGameBox"])?.url}
        alt={item.title}
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium transition-colors duration-150 group-hover:text-primary">
          {item.title}
        </span>
        <span className="block truncate text-xs text-muted-foreground">
          {item.itemType || "Item"} - {item.namespace}
        </span>
      </span>
      {platforms.length > 0 && (
        <span className="ml-2 hidden min-w-0 items-center justify-end gap-2 overflow-hidden text-sm text-muted-foreground sm:flex">
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

function SellerResultItem({
  sellerId,
  seller,
  onSelect,
}: {
  sellerId: string;
  seller: SingleSeller;
  onSelect: () => void;
}) {
  return (
    <CommandItem
      id={`seller:${sellerId}`}
      textValue={seller.name}
      onAction={onSelect}
      className={cn("min-h-[60px]", RESULT_ROW_CLASS_NAME)}
      style={RESULT_ROW_STYLE}
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-muted">
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
        <span className="block truncate font-medium transition-colors duration-150 group-hover:text-primary">
          {seller.name}
        </span>
        <span className="block truncate text-xs text-muted-foreground">
          {seller.igdb_id ? `IGDB ${seller.igdb_id}` : "Seller"}
        </span>
      </span>
      <Badge
        variant="outline"
        className="ml-2 shrink-0 rounded-full border-border/70 bg-background/50 px-2.5 text-[11px] font-medium text-muted-foreground"
      >
        Seller
      </Badge>
    </CommandItem>
  );
}

function ResultImage({ src, alt }: { src?: string; alt: string }) {
  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-muted">
      <Image
        src={src ?? "/placeholder.webp"}
        alt={alt}
        height={88}
        width={88}
        quality="high"
        sizes="44px"
        className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.05]"
      />
    </span>
  );
}

// These notices and skeletons live inside the React Aria Menu collection, so
// they must be collection nodes. A plain <div> here is rendered into the
// collection document, which cannot create text nodes (crash on typing).
function ResultNotice({ children }: { children: ReactNode }) {
  const id = useId();

  return (
    <CommandItem
      id={`notice:${id}`}
      isDisabled
      textValue={typeof children === "string" ? children : undefined}
      className="min-h-0 cursor-default px-3 py-3 text-sm text-muted-foreground"
    >
      <span>{children}</span>
    </CommandItem>
  );
}

function ResultSkeletonList() {
  return (
    <CommandGroup>
      {Array.from({ length: 5 }).map((_, index) => (
        <CommandItem
          key={index}
          id={`search-skeleton-${index}`}
          isDisabled
          textValue="Loading"
          className="min-h-16 px-3 py-2"
        >
          <span className="flex w-full items-center gap-3">
            <Skeleton className="h-11 w-11 rounded-md" />
            <span className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </span>
            <Skeleton className="h-6 w-16 rounded-md" />
          </span>
        </CommandItem>
      ))}
    </CommandGroup>
  );
}

function hasAnyResults(offers: GlobalSearchOffer[], items: SingleItem[], sellers: SingleSeller[]) {
  return offers.length > 0 || items.length > 0 || sellers.length > 0;
}

function formatOfferPrice(price: GlobalSearchOffer["price"], locale: string) {
  const effectivePrice = getEffectivePrice(price);
  if (!effectivePrice) {
    return null;
  }

  if (effectivePrice.price.discountPrice === 0) {
    return "Free";
  }

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: effectivePrice.price.currencyCode,
    currencySign: "standard",
  }).format(calculatePrice(effectivePrice.price.discountPrice, effectivePrice.price.currencyCode));
}

function formatCount(count: number) {
  if (count > 9999) {
    return new Intl.NumberFormat("en", { notation: "compact" }).format(count);
  }

  return count.toLocaleString("en");
}
