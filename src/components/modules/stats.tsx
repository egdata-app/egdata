import { useQuery } from "@tanstack/react-query";
import { httpClient as client } from "@/lib/http-client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export interface Stats {
  offers: number;
  items: number;
  tags: number;
  assets: number;
  priceEngine: number;
  changelog: number;
  sandboxes: number;
  products: number;
  offersYear: number;
  itemsYear: number;
}

export function StatsModule() {
  const { t } = useTranslation();
  const { data } = useQuery({
    queryKey: ["stats"],
    queryFn: async () => {
      const data = await client.get<Stats>("/stats");
      return data;
    },
  });

  return (
    <Card className="md:w-1/2 h-full my-auto w-full">
      <CardHeader className="flex flex-col">
        <h2 className="text-xl font-semibold">{t("components.stats.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("components.stats.description")}</p>
      </CardHeader>
      <CardContent className="grid grid-cols-3 gap-4 h-[300px]">
        <Count
          value={data?.offers ?? 0}
          label={t("components.stats.offers")}
          tooltip={t("components.stats.offersTooltip")}
        />
        <Count
          value={data?.items ?? 0}
          label={t("components.stats.items")}
          tooltip={t("components.stats.itemsTooltip")}
        />
        <Count value={data?.tags ?? 0} label={t("components.stats.tags")} />
        <Count value={data?.offersYear ?? 0} label={t("components.stats.offersYear")} />
        <Count value={data?.itemsYear ?? 0} label={t("components.stats.itemsYear")} />
        <Count
          value={data?.assets ?? 0}
          label={t("components.stats.assets")}
          tooltip={t("components.stats.assetsTooltip")}
        />
        <Count value={data?.priceEngine ?? 0} label={t("components.stats.regPrices")} />
        <Count value={data?.changelog ?? 0} label={t("components.stats.changes")} />
        <Count
          value={data?.sandboxes ?? 0}
          label={t("components.stats.sandboxes")}
          tooltip={t("components.stats.sandboxesTooltip")}
        />
      </CardContent>
    </Card>
  );
}

function Count({ value, label, tooltip }: { value: number; label: string; tooltip?: string }) {
  return (
    <div>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger
            className={cn(
              "text-xs text-muted-foreground",
              tooltip ? "underline decoration-dotted underline-offset-4" : "cursor-default",
            )}
          >
            {label}
          </TooltipTrigger>
          {tooltip && <TooltipContent>{tooltip}</TooltipContent>}
        </Tooltip>
      </TooltipProvider>
      <p className="text-lg font-semibold">{value.toLocaleString()}</p>
    </div>
  );
}
