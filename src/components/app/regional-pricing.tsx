import { useQuery } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { PriceChart } from "./price-chart";
import { useEffect, useState } from "react";
import { useCountry } from "@/hooks/use-country";
import { httpClient } from "@/lib/http-client";
import { Skeleton } from "../ui/skeleton";
import { useRegions } from "@/hooks/use-regions";
import { ArrowUpIcon } from "@radix-ui/react-icons";
import { cn } from "@/lib/utils";
import { calculatePrice } from "@/lib/calculate-price";
import { Badge } from "@/components/ui/badge";
import { useLocale } from "@/hooks/use-locale";
import type { RegionalPrice, RegionData } from "@/types/regional-pricing";

const getRegionalPricing = async ({ id }: { id: string }) => {
  const response = await httpClient.get<RegionalPrice>(`/offers/${id}/regional-price`);
  return response;
};

export function RegionalPricing({ id }: { id: string }) {
  const { country } = useCountry();
  const { locale } = useLocale();
  const [selectedRegion, setSelectedRegion] = useState("EURO");
  const { regions } = useRegions();
  const {
    data: regionalPricing,
    error,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["regional-pricing", { id }],
    queryFn: () => getRegionalPricing({ id }),
  });
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const { data: regionData } = useQuery({
    queryKey: ["region", { country }],
    queryFn: () =>
      httpClient
        .get<RegionData>("/region", {
          params: {
            country,
          },
        })
        .then((response) => response),
  });

  useEffect(() => {
    if (regionData) {
      setSelectedRegion(regionData.region.code);
    }
  }, [regionData]);

  if (isLoading) {
    return (
      <div className="w-full mx-auto mt-2 flex flex-col gap-2">
        <Skeleton className="w-3/4 h-96 mx-auto" />
        <Skeleton className="w-3/4 h-[50vh] mx-auto" />
      </div>
    );
  }

  if (isError) {
    return <p>Error: {error.message}</p>;
  }

  if (!regionalPricing) {
    return null;
  }

  const scrollToChart = () => {
    const chart = document.getElementById("price-chart");
    if (chart) {
      chart.scrollIntoView({ behavior: "smooth" });
    }
  };

  const sortedRegions = Object.keys(regionalPricing).sort((a, b) => {
    const lastPriceA = regionalPricing[a].currentPrice.price.basePayoutPrice;
    const lastPriceB = regionalPricing[b].currentPrice.price.basePayoutPrice;

    return sortDirection === "asc" ? lastPriceA - lastPriceB : lastPriceB - lastPriceA;
  });

  // Ensure the current region is always on top
  if (selectedRegion) {
    const index = sortedRegions.indexOf(selectedRegion);
    if (index > -1) {
      sortedRegions.splice(index, 1);
      sortedRegions.unshift(selectedRegion);
    }
  }

  return (
    <div className="w-full mx-auto mt-2">
      <PriceChart
        selectedRegion={selectedRegion}
        id={id}
        regionStats={regionalPricing[selectedRegion]}
      />
      <div className="w-full md:w-3/4 mx-auto mt-2 overflow-x-auto">
        <Table className="w-full">
          <TableCaption>Regional Pricing</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Region</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Max Price</TableHead>
              <TableHead>Min Price</TableHead>
              <TableHead
                className="text-right inline-flex gap-1 items-center justify-end w-full cursor-pointer"
                onClick={() => {
                  setSortDirection(sortDirection === "asc" ? "desc" : "asc");
                }}
              >
                <span>USD</span>
                <ArrowUpIcon
                  className={cn(
                    "transform transition-transform size-5",
                    sortDirection === "asc" && "rotate-180",
                  )}
                />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedRegions.map((key) => {
              const regionPricing = regionalPricing[key];
              const {
                currentPrice: lastPrice,
                maxPrice,
                minPrice,
              } = regionPricing || {
                currentPrice: {
                  price: {
                    currencyCode: "USD",
                    basePayoutPrice: 0,
                    discountPrice: 0,
                  },
                },
                maxPrice: 0,
                minPrice: 0,
              };

              const currencyFormatter = new Intl.NumberFormat(locale, {
                style: "currency",
                currency: lastPrice.price.currencyCode,
              });

              const usdFormatter = new Intl.NumberFormat(locale, {
                style: "currency",
                currency: "USD",
              });

              return (
                <TableRow
                  key={key}
                  onClick={() => {
                    setSelectedRegion(key);
                    scrollToChart();
                  }}
                  className={cn(
                    "cursor-pointer",
                    selectedRegion === key && "bg-slate-800/25 text-white",
                  )}
                >
                  <TableCell className="inline-flex items-center gap-2">
                    <CountryFlag code={key} />
                    <span className="whitespace-nowrap">{regions?.[key]?.description || key}</span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {currencyFormatter.format(
                      calculatePrice(lastPrice.price.discountPrice, lastPrice.price.currencyCode),
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {currencyFormatter.format(
                      calculatePrice(maxPrice, lastPrice.price.currencyCode),
                    )}
                  </TableCell>
                  <TableCell className="inline-flex items-center gap-1 whitespace-nowrap">
                    {currencyFormatter.format(
                      calculatePrice(minPrice, lastPrice.price.currencyCode),
                    )}
                    {calculateDiscountPercentage(minPrice, lastPrice.price.originalPrice) !== "0" &&
                    selectedRegion === key ? (
                      <Badge className="text-xs" variant="outline">
                        -{calculateDiscountPercentage(minPrice, lastPrice.price.originalPrice)}%
                      </Badge>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    {usdFormatter.format(lastPrice.price.basePayoutPrice / 100)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

const flagAlternativesCodes: Record<string, string> = {
  EURO: "EU",
};

const flagAlternativesEmoji: Record<string, string> = {
  EURO: "🇪🇺",
  AFRICA: "🌍",
  SEA: "🌏",
  LATAM: "🌎",
  EAST: "🌏",
  CIS: "🇪🇺",
  MIDEAST: "🌏",
  ROW: "🌍",
  ANZ: "🌏",
};

const flagAlternativeImages: Record<string, string> = {
  CIS: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/49/Emblem_of_CIS.svg/504px-Emblem_of_CIS.svg.png",
};

function CountryFlag({ code }: { code: string }) {
  let fmtdCode = code.toLowerCase().replaceAll("2", "");

  if (code === "EURO") {
    return (
      <img
        src={"https://flagcdn.com/16x12/eu.png"}
        srcSet={`https://flagcdn.com/32x24/eu.png 2x,
              https://flagcdn.com/48x36/eu.png 3x`}
        width="16"
        height="12"
        alt="EURO"
      />
    );
  }

  if (flagAlternativesCodes[code]) {
    fmtdCode = flagAlternativesCodes[code];
  }

  if (flagAlternativeImages[code] && !flagAlternativesCodes[fmtdCode]) {
    return <img src={flagAlternativeImages[code]} width="16" height="16" alt={code} />;
  }

  if (flagAlternativesEmoji[code] && !flagAlternativesCodes[fmtdCode]) {
    return <span>{flagAlternativesEmoji[code]}</span>;
  }

  return (
    <img
      src={`https://flagcdn.com/16x12/${fmtdCode}.png`}
      srcSet={`https://flagcdn.com/32x24/${fmtdCode}.png 2x,
              https://flagcdn.com/48x36/${fmtdCode}.png 3x`}
      width="16"
      height="12"
      alt="Ukraine"
    />
  );
}

const calculateDiscountPercentage = (minPrice: number, maxPrice: number) => {
  if (maxPrice === 0) {
    return 0;
  }

  return (((maxPrice - minPrice) / maxPrice) * 100).toFixed(0);
};
