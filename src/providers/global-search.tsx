import { useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import debounce from "lodash.debounce";
import { Portal } from "@radix-ui/react-portal";
import { defaultState, SearchContext, type SearchState } from "@/contexts/global-search";
import { Link } from "@tanstack/react-router";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useCountry } from "@/hooks/use-country";
import { keepPreviousData, useQueries, useQuery } from "@tanstack/react-query";
import type { SingleOffer } from "@/types/single-offer";
import type { SingleItem } from "@/types/single-item";
import type { SingleSeller } from "@/types/sellers";
import { Skeleton } from "@/components/ui/skeleton";
import { Image } from "@/components/app/image";
import { getImage } from "@/lib/getImage";
import {
  getPlatformsArray,
  platformIcons,
  textPlatformIcons,
} from "@/components/app/platform-icons";
import { ScrollArea } from "@/components/ui/scroll-area";
import { httpClient } from "@/lib/http-client";
import { calculatePrice } from "@/lib/calculate-price";
import { useLocale } from "@/hooks/use-locale";
import consola from "consola";
import { Gamepad2, SearchIcon, Store, Tag } from "lucide-react";
import { cn } from "@/lib/utils";

interface Search {
  elements: Element[];
  total: number;
}

interface SearchProviderProps {
  children: ReactNode;
}

export function SearchProvider({ children }: SearchProviderProps) {
  const [searchState, setSearchState] = useState<SearchState>(defaultState);
  const inputRef = useRef<HTMLInputElement>(null);

  const debouncedSearch = useCallback(
    debounce((query: string) => {
      httpClient
        .get<Search>("/autocomplete", {
          params: { query },
        })
        .then((data) => {
          setSearchState((prevState) => ({
            ...prevState,
            results: data.elements,
          }));
        });
    }, 300), // 300ms debounce time
    [],
  );

  useEffect(() => {
    debouncedSearch(searchState.query);
  }, [searchState.query, debouncedSearch]);

  return (
    <SearchContext.Provider
      value={{
        ...searchState,
        setQuery: (query: string) =>
          setSearchState((prevState) => ({
            ...prevState,
            query,
          })),
        setFocus: (focus: boolean) =>
          setSearchState((prevState) => ({
            ...prevState,
            focus,
          })),
        inputRef,
      }}
    >
      {children}
      <Portal>
        {searchState.focus && (
          <SearchPortal
            searchState={searchState}
            setSearchState={setSearchState}
            inputRef={inputRef}
          />
        )}
      </Portal>
    </SearchContext.Provider>
  );
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
  setSearchState: (value: React.SetStateAction<SearchState>) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
}

type SectionType = "offers" | "items" | "sellers";

function SearchPortal({ searchState, setSearchState, inputRef }: SearchPortalProps) {
  const { country } = useCountry();
  const [searchQuery, setSearchQuery] = useState<string>(searchState.query);
  const [activeSection, setActiveSection] = useState<SectionType>("offers");

  const [
    { data: offersData, isLoading: offersLoading, error: offersError },
    { data: itemsData, isLoading: itemsLoading, error: itemsError },
    { data: sellersData, isLoading: sellersLoading, error: sellersError },
  ] = useQueries({
    queries: [
      {
        queryKey: [
          "multisearch:offers",
          {
            query: searchQuery,
          },
        ],
        queryFn: async () => {
          const data = await httpClient.get<Multisearch<SingleOffer>>("/multisearch/offers", {
            params: { query: searchQuery, limit: 20 },
          });
          return data;
        },
        enabled: activeSection === "offers",
        placeholderData: keepPreviousData,
      },
      {
        queryKey: [
          "multisearch:items",
          {
            query: searchQuery,
          },
        ],
        queryFn: async () => {
          const data = await httpClient.get<Multisearch<SingleItem>>("/multisearch/items", {
            params: { query: searchQuery, limit: 20 },
          });
          return data;
        },
        enabled: activeSection === "items",
        placeholderData: keepPreviousData,
      },
      {
        queryKey: [
          "multisearch:sellers",
          {
            query: searchQuery,
          },
        ],
        queryFn: async () => {
          const data = await httpClient.get<Multisearch<SingleSeller>>("/multisearch/sellers", {
            params: { query: searchQuery, limit: 20 },
          });
          return data;
        },
        enabled: activeSection === "sellers",
        placeholderData: keepPreviousData,
      },
    ],
  });
  const [selected, setSelected] = useState<{ type: string; id: string } | null>(null);

  useEffect(() => {
    inputRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSearchState((prevState: SearchState) => ({
          ...prevState,
          focus: false,
        }));
      } else if (e.key === "Enter" && selected) {
        e.preventDefault();
        // Navigate to the selected result
        let url = "";
        if (selected.type === "offer") {
          url = `/offers/${selected.id}`;
        } else if (selected.type === "item") {
          url = `/items/${selected.id}`;
        } else if (selected.type === "seller") {
          url = `/sellers/${selected.id}`;
        }

        if (url) {
          setSearchState((prevState) => ({
            ...prevState,
            focus: false,
          }));
          window.location.href = url;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [inputRef, setSearchState, selected]);

  useEffect(() => {
    const debouncedSearch = debounce((query: string) => {
      setSearchQuery(query);
    }, 300);

    debouncedSearch(searchState.query);

    return () => {
      debouncedSearch.cancel();
    };
  }, [searchState.query]);

  const sections = [
    {
      id: "offers",
      label: "Offers",
      icon: <Tag className="w-5 h-5" />,
      count: offersData?.estimatedTotalHits,
    },
    {
      id: "items",
      label: "Items",
      icon: <Gamepad2 className="w-5 h-5" />,
      count: itemsData?.estimatedTotalHits,
    },
    {
      id: "sellers",
      label: "Sellers",
      icon: <Store className="w-5 h-5" />,
      count: sellersData?.estimatedTotalHits,
    },
  ];

  return (
    <div className="fixed top-0 right-0 z-20 w-full h-full bg-card/50 backdrop-blur-[3px] items-center flex-col gap-2 justify-center flex">
      <span
        className="absolute top-0 left-0 w-full h-full cursor-pointer z-0"
        onClick={() =>
          setSearchState((prevState) => ({
            ...prevState,
            focus: false,
          }))
        }
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setSearchState((prevState) => ({
              ...prevState,
              focus: false,
            }));
          }
        }}
      />

      <div className="w-full inline-flex justify-center items-center z-10">
        <div className="relative md:w-1/3 w-full">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="text"
            value={searchState.query}
            className="w-full h-14 pl-12 pr-4 bg-card text-white text-lg rounded-xl shadow-2xl border-slate-700"
            placeholder="Search for games, items, sellers..."
            onChange={(e) =>
              setSearchState((prevState) => ({
                ...prevState,
                query: e.target.value,
              }))
            }
            ref={inputRef}
          />
        </div>
      </div>
      <div className="flex gap-0 w-full h-[80vh] xl:w-2/3 mx-auto bg-card rounded-xl z-10 overflow-hidden border border-slate-700 shadow-2xl">
        {/* Sidebar */}
        <div className="w-64 bg-slate-900/50 border-r border-slate-700 flex flex-col p-2 gap-1">
          {sections.map((section) => (
            <button
              type="button"
              key={section.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg text-left transition-all duration-200",
                activeSection === section.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-slate-800 hover:text-white",
              )}
              onMouseEnter={() => setActiveSection(section.id as SectionType)}
              onClick={() => setActiveSection(section.id as SectionType)}
            >
              {section.icon}
              <div className="flex-1 font-medium">{section.label}</div>
            </button>
          ))}
        </div>

        {/* Results Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-4">
              <h2 className="text-xl font-bold sticky top-0 bg-card z-10 pb-2 border-b border-slate-700 mb-4">
                {activeSection.charAt(0).toUpperCase() + activeSection.slice(1)}
              </h2>

              {/* Offers Results */}
              {activeSection === "offers" && (
                <div className="space-y-2">
                  {offersLoading && (
                    <>
                      <ResultItemSkeleton />
                      <ResultItemSkeleton />
                      <ResultItemSkeleton />
                    </>
                  )}
                  {offersError && <p>Error: {offersError.message}</p>}
                  {offersData && offersData.hits.length === 0 && (
                    <div className="text-center text-muted-foreground py-8">No offers found</div>
                  )}
                  {offersData?.hits.map((offer) => (
                    <Link
                      className="flex items-center justify-between p-2 hover:bg-slate-700/50 rounded-lg transition-colors group"
                      key={offer._id}
                      to={"/offers/$id"}
                      params={{
                        id: offer.id,
                      }}
                      onClick={() => {
                        setSearchState((prevState) => ({
                          ...prevState,
                          focus: false,
                          query: "",
                        }));
                      }}
                      onMouseEnter={() => setSelected({ type: "offer", id: offer.id })}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 rounded overflow-hidden bg-slate-800">
                          <Image
                            src={
                              getImage(offer.keyImages, [
                                "DieselStoreFrontWide",
                                "OfferImageWide",
                                "DieselGameBoxWide",
                                "TakeoverWide",
                              ])?.url ?? "/placeholder.webp"
                            }
                            alt={offer.title}
                            height={300}
                            width={300}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <div className="font-medium group-hover:text-primary transition-colors">
                            {offer.title}
                          </div>
                          {offer.prePurchase && (
                            <Badge variant="secondary" className="text-xs">
                              Pre-Purchase
                            </Badge>
                          )}
                        </div>
                      </div>
                      <OfferPrice id={offer.id} country={country} />
                    </Link>
                  ))}
                </div>
              )}

              {/* Items Results */}
              {activeSection === "items" && (
                <div className="space-y-2">
                  {itemsLoading && (
                    <>
                      <ResultItemSkeleton />
                      <ResultItemSkeleton />
                      <ResultItemSkeleton />
                    </>
                  )}
                  {itemsError && <p>Error: {itemsError.message}</p>}
                  {itemsData && itemsData.hits.length === 0 && (
                    <div className="text-center text-muted-foreground py-8">No items found</div>
                  )}
                  {itemsData?.hits.map((item) => (
                    <Link
                      className="flex items-center justify-between p-2 hover:bg-slate-700/50 rounded-lg transition-colors group"
                      key={item._id}
                      to={"/items/$id"}
                      params={{
                        id: item.id,
                      }}
                      onClick={() => {
                        setSearchState((prevState) => ({
                          ...prevState,
                          focus: false,
                          query: "",
                        }));
                      }}
                      onMouseEnter={() => setSelected({ type: "item", id: item._id })}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 rounded overflow-hidden bg-slate-800">
                          <Image
                            src={
                              getImage(item.keyImages, ["DieselGameBoxWide", "DieselGameBox"])
                                ?.url ?? "/placeholder.webp"
                            }
                            alt={item.title}
                            height={300}
                            width={300}
                            quality="low"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <span className="font-medium group-hover:text-primary transition-colors">
                          {item.title}
                        </span>
                      </div>
                      <div className="inline-flex items-center gap-2">
                        {getPlatformsArray(item.releaseInfo)
                          .filter((platform) => textPlatformIcons[platform])
                          .map((platform) => (
                            <span key={platform} title={platform} className="text-muted-foreground">
                              {textPlatformIcons[platform]}
                            </span>
                          ))}
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {/* Sellers Results */}
              {activeSection === "sellers" && (
                <div className="space-y-2">
                  {sellersLoading && (
                    <>
                      <ResultItemSkeleton />
                      <ResultItemSkeleton />
                      <ResultItemSkeleton />
                    </>
                  )}
                  {sellersError && <p>Error: {sellersError.message}</p>}
                  {sellersData && sellersData.hits.length === 0 && (
                    <div className="text-center text-muted-foreground py-8">No sellers found</div>
                  )}
                  {sellersData?.hits.map((seller) => (
                    <Link
                      className="flex items-center justify-between p-2 hover:bg-slate-700/50 rounded-lg transition-colors group"
                      key={seller._id}
                      to={"/sellers/$id"}
                      params={{
                        id: seller._id,
                      }}
                      onClick={() => {
                        setSearchState((prevState) => ({
                          ...prevState,
                          focus: false,
                          query: "",
                        }));
                      }}
                      onMouseEnter={() => setSelected({ type: "seller", id: seller._id })}
                    >
                      <div className="flex items-center space-x-3">
                        <img
                          src={seller.logo?.url ?? "/placeholder.webp"}
                          alt={seller.name}
                          className="w-12 h-12 rounded object-cover bg-slate-800"
                          width="50"
                          height="50"
                        />
                        <span className="font-medium group-hover:text-primary transition-colors">
                          {seller.name}
                        </span>
                      </div>
                      <span className="text-muted-foreground text-sm">
                        {seller.igdb_id ? `ID: ${seller.igdb_id}` : ""}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Preview Area */}
        <div className="w-1/3 bg-slate-900/30 border-l border-slate-700 hidden lg:block">
          <ScrollArea className="h-full p-6">
            <div className="w-full flex justify-between items-center">
              {selected && (
                <FeaturedResult
                  id={selected.id}
                  type={selected.type}
                  data={
                    selected.type === "offer"
                      ? offersData?.hits.find((offer) => offer.id === selected.id)
                      : selected.type === "item"
                        ? itemsData?.hits.find((item) => item._id === selected.id)
                        : sellersData?.hits.find((seller) => seller._id === selected.id)
                  }
                />
              )}
              {!selected && (
                <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground gap-4 pt-20">
                  <SearchIcon className="w-16 h-16 opacity-20" />
                  <p className="text-lg font-medium">Hover a result to see details</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}

function FeaturedResult({
  id,
  type,
  data,
}: {
  id: string;
  type: string;
  data?: SingleOffer | SingleItem | SingleSeller;
}) {
  if (!data) {
    return null;
  }

  if (type === "offer") {
    return <FeaturedOffer id={id} data={data as SingleOffer} />;
  }

  const imageToShow =
    // @ts-expect-error
    getImage(data?.keyImages ?? [], ["Featured", "DieselStoreFrontWide", "OfferImageWide"])?.url ??
    "/placeholder.webp";

  return (
    <div
      className="flex flex-col gap-4 w-full animate-in fade-in duration-300"
      key={`multi-search-${id}`}
    >
      <div className="rounded-xl overflow-hidden border border-slate-700 shadow-lg">
        <Image
          src={imageToShow}
          // @ts-expect-error
          alt={type === "item" || type === "offer" ? data.title : data.name}
          className="w-full aspect-video object-cover"
          width={600}
          height={325}
          quality="high"
          key={`${id}-preview-image`}
        />
      </div>
      <div className="space-y-2">
        <h6 className="text-2xl font-bold inline-flex items-center gap-2">
          {/** @ts-expect-error */}
          {type === "offer" || type === "item" ? data.title : data.name}{" "}
        </h6>
        <Badge variant="outline" className="capitalize">
          {type}
        </Badge>
      </div>
    </div>
  );
}

function FeaturedOffer({ id, data }: { id: string; data: SingleOffer }) {
  if (!data) {
    return null;
  }

  const imageToShow =
    getImage(data.keyImages, ["Featured", "DieselStoreFrontWide", "OfferImageWide"])?.url ??
    "/placeholder.webp";

  return (
    <div className="flex flex-col gap-4 w-full animate-in fade-in duration-300">
      <div className="rounded-xl overflow-hidden border border-slate-700 shadow-lg">
        <Image
          src={imageToShow}
          alt="Game Screenshot"
          className="w-full aspect-video object-cover"
          width={600}
          height={325}
          quality="high"
          key={`${id}-preview-image`}
        />
      </div>

      <div className="space-y-4">
        <div>
          <h6 className="text-2xl font-bold">{data.title}</h6>
          <div className="flex flex-wrap gap-2 mt-2">
            {data.tags
              .filter((tag) => tag !== null)
              .slice(0, 4)
              .map((tag) => (
                <Badge variant="secondary" key={`${data.id}-${tag?.id}`}>
                  {tag.name}
                </Badge>
              ))}
          </div>
        </div>

        <div className="space-y-3 text-sm text-muted-foreground bg-slate-800/50 p-4 rounded-lg">
          <div className="flex justify-between border-b border-slate-700/50 pb-2">
            <span className="font-medium text-foreground">Seller</span>
            <span>{data.seller.name}</span>
          </div>
          <div className="flex justify-between border-b border-slate-700/50 pb-2">
            <span className="font-medium text-foreground">Developer</span>
            <span>{data.developerDisplayName ?? data.seller.name}</span>
          </div>
          <div className="flex justify-between border-b border-slate-700/50 pb-2">
            <span className="font-medium text-foreground">Release Date</span>
            <span>
              {new Date(data.releaseDate).toLocaleDateString("en-UK", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          </div>
          <div className="pt-1">
            <span className="font-medium text-foreground block mb-2">Platforms</span>
            <div className="flex gap-3">
              {data.tags
                .filter((tag) => platformIcons[tag.id])
                .map((tag) => (
                  <span key={`${data.id}-${tag.id}`} title={tag.name} className="text-foreground">
                    {platformIcons[tag.id]}
                  </span>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ResultItemSkeleton() {
  return (
    <div className="flex items-center justify-between p-2 bg-slate-800/50 rounded-lg">
      <div className="flex items-center space-x-3">
        <Skeleton className="w-12 h-12 rounded" />
        <div className="space-y-2">
          <Skeleton className="w-32 h-4" />
          <Skeleton className="w-20 h-3" />
        </div>
      </div>
      <Skeleton className="w-24 h-8" />
    </div>
  );
}

function OfferPrice({ id, country }: { id: string; country: string }) {
  const { locale } = useLocale();
  const { data, isLoading, error } = useQuery({
    queryKey: ["offer-price", { id, country }],
    queryFn: async () => {
      const data = await httpClient.get<SingleOffer["price"]>(`/offers/${id}/price`, {
        params: { country },
      });
      return data;
    },
  });

  if (isLoading) {
    return <Skeleton className="w-20 h-6" />;
  }

  if (error) {
    consola.error(error);
    return null;
  }

  if (!data) {
    return null;
  }

  const priceFmtr = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: data.price.currencyCode,
    currencySign: "standard",
  });

  if (data.price.discountPrice === 0) {
    return <span className="font-bold text-green-400">Free</span>;
  }

  return (
    <span className="font-bold">
      {priceFmtr.format(calculatePrice(data.price.discountPrice, data.price.currencyCode))}
    </span>
  );
}
