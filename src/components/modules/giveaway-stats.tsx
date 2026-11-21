import { useCountry } from "@/hooks/use-country";
import { useLocale } from "@/hooks/use-locale";
import { httpClient } from "@/lib/http-client";
import type { Price } from "@/types/price";
import { useQuery } from "@tanstack/react-query";
import { Tooltip, TooltipTrigger } from "../ui/tooltip";
import { calculatePrice } from "@/lib/calculate-price";
import { Link } from "@/components/app/localized-link";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/paraglide-react";

export const getGiveawaysStats = async ({ country }: { country: string }) => {
  const res = await httpClient.v1Get<{
    totalValue: Price["price"];
    totalGiveaways: number;
    totalOffers: number;
    repeated: number;
    sellers: number;
  }>("/free-games/stats", {
    params: {
      country,
    },
  });

  return res;
};

interface GiveawayStatsProps {
  showTitle?: boolean;
  wrap?: boolean;
}

export function GiveawaysStats({ showTitle = true, wrap = false }: GiveawayStatsProps) {
  const { t } = useTranslation();
  const { country } = useCountry();
  const { locale } = useLocale();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["giveaways-stats", { country }],
    queryFn: () => getGiveawaysStats({ country }),
    refetchInterval: 60 * 1000,
    refetchIntervalInBackground: true,
  });

  if (isLoading) {
    return <p>{t("components.giveawayStats.loading")}</p>;
  }

  if (isError || !data) {
    return null;
  }

  return (
    <div className="flex flex-col items-start justify-start gap-4 w-full">
      {showTitle && (
        <h2 className="text-xl font-semibold">{t("components.giveawayStats.title")}</h2>
      )}
      <div className="flex flex-row flex-wrap items-center justify-center gap-10 bg-card rounded-lg p-4 w-full">
        <div
          className={cn(
            "flex flex-col items-center justify-center gap-2",
            wrap ? "w-full" : "w-fit",
          )}
        >
          <BigText
            value={calculatePrice(
              data.totalValue.originalPrice,
              data.totalValue.currencyCode,
            ).toLocaleString(locale, {
              style: "currency",
              currency: data.totalValue.currencyCode,
            })}
            className="text-4xl font-medium"
          />
          <TooltipTrigger>
            <span className="text-lg font-medium text-muted-foreground decoration-dotted decoration-gray-400/50 underline underline-offset-4">
              {t("components.giveawayStats.totalValue")}
            </span>
            <Tooltip>
              <div className="flex flex-row items-center gap-1">
                <span className="text-xs font-medium">
                  {calculatePrice(
                    data.totalValue.discountPrice,
                    data.totalValue.currencyCode,
                  ).toLocaleString(locale, {
                    style: "currency",
                    currency: data.totalValue.currencyCode,
                  })}
                </span>
                <span className="text-xs font-medium">
                  {t("components.giveawayStats.totalValueTooltip")}
                </span>
              </div>
            </Tooltip>
          </TooltipTrigger>
        </div>

        <div className="flex flex-col items-center justify-center gap-2">
          <BigText
            value={data.totalGiveaways.toLocaleString(locale)}
            className="text-4xl font-medium"
          />
          <TooltipTrigger>
            <span className="text-lg font-medium text-muted-foreground decoration-dotted decoration-gray-400/50 underline underline-offset-4">
              {t("components.giveawayStats.giveaways")}
            </span>
            <Tooltip>
              <span className="text-xs font-medium">
                {t("components.giveawayStats.giveawaysTooltip")}
              </span>
            </Tooltip>
          </TooltipTrigger>
        </div>

        <div className="flex flex-col items-center justify-center gap-2">
          <BigText
            value={data.totalOffers.toLocaleString(locale)}
            className="text-4xl font-medium"
          />
          <TooltipTrigger>
            <span className="text-lg font-medium text-muted-foreground decoration-dotted decoration-gray-400/50 underline underline-offset-4">
              {t("components.giveawayStats.offers")}
            </span>
            <Tooltip>
              <span className="text-xs font-medium">
                {t("components.giveawayStats.offersTooltip")}
              </span>
            </Tooltip>
          </TooltipTrigger>
        </div>

        <div className="flex flex-col items-center justify-center gap-2">
          <BigText value={data.repeated.toLocaleString(locale)} className="text-4xl font-medium" />
          <TooltipTrigger>
            <span className="text-lg font-medium text-muted-foreground decoration-dotted decoration-gray-400/50 underline underline-offset-4">
              {t("components.giveawayStats.repeated")}
            </span>
            <Tooltip>
              <span className="text-xs font-medium">
                {t("components.giveawayStats.repeatedTooltip")}
              </span>
            </Tooltip>
          </TooltipTrigger>
        </div>

        <Link
          className="flex flex-col items-center justify-center gap-2"
          to="/{-$locale}/freebies/sellers"
        >
          <BigText value={data.sellers.toLocaleString(locale)} className="text-4xl font-medium" />
          <TooltipTrigger>
            <span className="text-lg font-medium text-muted-foreground decoration-dotted decoration-gray-400/50 underline underline-offset-4">
              {t("components.giveawayStats.sellers")}
            </span>
            <Tooltip>
              <span className="text-xs font-medium">
                {t("components.giveawayStats.sellersTooltip")}
              </span>
            </Tooltip>
          </TooltipTrigger>
        </Link>
      </div>
    </div>
  );
}

function BigText({ value, className }: { value: string | number; className?: string }) {
  return <span className={cn("font-mono", className)}>{value}</span>;
}
