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
        <h2 className="font-display text-lg font-semibold tracking-tight text-foreground">
          {t("components.giveawayStats.title")}
        </h2>
      )}
      <div
        className={cn(
          "grid w-full grid-cols-2 gap-x-6 gap-y-5 py-2 sm:grid-cols-3 lg:grid-cols-5",
          wrap && "sm:grid-cols-3 lg:grid-cols-5",
        )}
      >
        <div className="flex flex-col items-start justify-center gap-1">
          <BigText
            value={calculatePrice(
              data.totalValue.originalPrice,
              data.totalValue.currencyCode,
            ).toLocaleString(locale, {
              style: "currency",
              currency: data.totalValue.currencyCode,
            })}
            className="text-2xl sm:text-3xl font-bold tracking-tight text-emerald-400"
          />
          <TooltipTrigger>
            <span className="cursor-help text-sm text-muted-foreground underline decoration-dotted decoration-muted-foreground/40 underline-offset-4">
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

        <div className="flex flex-col items-start justify-center gap-1">
          <BigText
            value={data.totalGiveaways.toLocaleString(locale)}
            className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground"
          />
          <TooltipTrigger>
            <span className="cursor-help text-sm text-muted-foreground underline decoration-dotted decoration-muted-foreground/40 underline-offset-4">
              {t("components.giveawayStats.giveaways")}
            </span>
            <Tooltip>
              <span className="text-xs font-medium">
                {t("components.giveawayStats.giveawaysTooltip")}
              </span>
            </Tooltip>
          </TooltipTrigger>
        </div>

        <div className="flex flex-col items-start justify-center gap-1">
          <BigText
            value={data.totalOffers.toLocaleString(locale)}
            className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground"
          />
          <TooltipTrigger>
            <span className="cursor-help text-sm text-muted-foreground underline decoration-dotted decoration-muted-foreground/40 underline-offset-4">
              {t("components.giveawayStats.offers")}
            </span>
            <Tooltip>
              <span className="text-xs font-medium">
                {t("components.giveawayStats.offersTooltip")}
              </span>
            </Tooltip>
          </TooltipTrigger>
        </div>

        <div className="flex flex-col items-start justify-center gap-1">
          <BigText
            value={data.repeated.toLocaleString(locale)}
            className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground"
          />
          <TooltipTrigger>
            <span className="cursor-help text-sm text-muted-foreground underline decoration-dotted decoration-muted-foreground/40 underline-offset-4">
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
          className="group flex flex-col items-start justify-center gap-1"
          to="/{-$locale}/freebies/sellers"
        >
          <BigText
            value={data.sellers.toLocaleString(locale)}
            className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground transition-colors group-hover:text-primary"
          />
          <TooltipTrigger>
            <span className="text-sm text-muted-foreground underline decoration-dotted decoration-muted-foreground/40 underline-offset-4 transition-colors group-hover:text-foreground">
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
  return <span className={cn("font-display tabular-nums", className)}>{value}</span>;
}
