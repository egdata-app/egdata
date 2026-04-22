import React, { useState } from "react";
import { Info, ChevronDown, ChevronUp, InfoIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from "@/components/ui/hover-card";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { getCountryOrRegionName, getCountryName } from "@/lib/country-names";
import type {
  RegionalPricingScore,
  Tier,
} from "@/types/regional-pricing-score";

const TIER_RANK: Record<Tier, number> = {
  none: -1,
  elevated: 0,
  average: 1,
  good: 2,
  great: 3,
  incredible: 4,
};

function displayTier(score: RegionalPricingScore): {
  tier: Tier;
  kind: "fairness" | "market";
} {
  if (score.tier === "none") return { tier: "none", kind: "fairness" };

  // Promote relativeTier whenever it's the strictly stronger positive signal. Covers:
  //   - Spain/EURO with tier=elevated, relativeTier=good       → show market
  //   - Spain/EURO with tier=average,  relativeTier=incredible → show market
  // Never downgrades: if tier is already as strong as relativeTier, keep tier.
  if (
    score.relativeTier &&
    TIER_RANK[score.relativeTier] > TIER_RANK[score.tier]
  ) {
    return { tier: score.relativeTier, kind: "market" };
  }

  return { tier: score.tier, kind: "fairness" };
}

const tierConfig: Record<
  Tier,
  { label: string; className: string; icon?: React.ReactNode }
> = {
  incredible: {
    label: "Incredible price",
    className: "bg-emerald-500 text-white",
  },
  great: {
    label: "Great price",
    className: "bg-green-500 text-white",
  },
  good: {
    label: "Good value",
    className: "bg-teal-500 text-white",
  },
  average: {
    label: "Fair price",
    className: "bg-slate-400 text-white",
  },
  elevated: {
    label: "Overpriced",
    className: "bg-amber-500 text-white",
  },
  none: {
    label: "No regional pricing",
    className: "bg-gray-400 text-white",
    icon: <Info className="size-3.5" />,
  },
};

function formatPrice(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

interface RegionalPricingBadgeProps {
  score: RegionalPricingScore;
}

export const RegionalPricingBadge = React.memo(function RegionalPricingBadge({
  score,
}: RegionalPricingBadgeProps) {
  const { tier, kind } = displayTier(score);
  const config = tierConfig[tier];

  const cheaperThanMedian = Math.round((1 - score.deviationMedian) * 100);
  const belowPpp = Math.round((1 - score.deviationPpp) * 100);
  const [open, setOpen] = useState(false);

  const regionName = getCountryOrRegionName(score.region);
  const countryName = getCountryName(score.country);

  // Tiers anchor on MSRP (`*MsrpUsd`); display paying prices (`*CurrentPriceUsd`) alongside
  // so the UI can show MSRP strikethrough when a live regional sale is in effect.
  const regionalOnSale = score.regionalCurrentPriceUsd < score.regionalMsrpUsd;
  const usOnSale = score.usCurrentPriceUsd < score.usMsrpUsd;
  const regionalSalePct = regionalOnSale
    ? Math.round((1 - score.regionalCurrentPriceUsd / score.regionalMsrpUsd) * 100)
    : 0;

  // Subtitle copy MUST match the kind (market vs fairness) — otherwise the title and subtitle
  // speak different languages and the verdict feels contradictory.
  const subtitle = (() => {
    if (tier === "none") return `Paying base USD price — no localized pricing`;
    if (kind === "market") {
      return cheaperThanMedian >= 0
        ? `${cheaperThanMedian}% below typical ${regionName} pricing`
        : `${Math.abs(cheaperThanMedian)}% above typical ${regionName} pricing`;
    }
    // kind === "fairness"
    if (tier === "average") return `Near the fair price for ${countryName}`;
    return belowPpp >= 0
      ? `${belowPpp}% below fair price for ${countryName}`
      : `${Math.abs(belowPpp)}% above fair price for ${countryName}`;
  })();

  return (
    <HoverCard openDelay={100} closeDelay={100}>
      <HoverCardTrigger asChild>
        <div
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-semibold rounded-md cursor-pointer",
            config.className,
          )}
        >
          {config.icon}
          <span>{config.label}</span>
        </div>
      </HoverCardTrigger>
      <HoverCardContent
        className="w-72 space-y-3 text-sm"
        align="end"
        side="top"
      >
        {/* Beta header */}
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-amber-500 text-white rounded">
            Beta
          </span>
          <span className="text-xs text-muted-foreground">
            Regional pricing analysis
          </span>
        </div>

        {/* Price rows */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Current price</span>
            <span className="font-medium flex items-center gap-2">
              {regionalOnSale && (
                <span className="text-xs line-through text-muted-foreground">
                  {formatPrice(score.regionalMsrpUsd)}
                </span>
              )}
              <span>{formatPrice(score.regionalCurrentPriceUsd)}</span>
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">US price</span>
            <span className="font-medium flex items-center gap-2">
              {usOnSale && (
                <span className="text-xs line-through text-muted-foreground">
                  {formatPrice(score.usMsrpUsd)}
                </span>
              )}
              <span>{formatPrice(score.usCurrentPriceUsd)}</span>
            </span>
          </div>
          {kind === "fairness" && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Suggested price</span>
              <span className="font-medium">
                {formatPrice(score.suggestedPriceUsd)}
              </span>
            </div>
          )}
        </div>

        {regionalOnSale && (
          <div className="text-xs text-muted-foreground">
            <InfoIcon className="size-3 inline-block mr-1 align-text-bottom" />
            On sale: {regionalSalePct}% off regional MSRP. Tier reflects MSRP —
            it won&apos;t flip when the sale ends.
          </div>
        )}

        {/* Dominant verdict block */}
        <div
          className={cn(
            "rounded-md p-3 space-y-1",
            config.className.replace("text-white", ""),
            "bg-opacity-20 text-foreground",
          )}
        >
          <div className="text-base font-bold">{config.label}</div>
          <div className="text-xs opacity-80">{subtitle}</div>
        </div>

        {/* PPP diagnostic — shown when we promoted relativeTier (kind=market), since that's
            when the user is seeing the market signal and may want the fairness context too. */}
        {kind === "market" && (
          <Collapsible open={open} onOpenChange={setOpen}>
            <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors w-full">
              <span className="inline-flex items-baseline gap-1">
                <InfoIcon className="size-3" /> About {countryName}&apos;s cost
                of living
              </span>
              {open ? (
                <ChevronUp className="size-3" />
              ) : (
                <ChevronDown className="size-3" />
              )}
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2 text-xs text-muted-foreground">
              Based on {countryName}&apos;s cost of living, a fair price would
              be around{" "}
              <strong className="text-foreground">
                {formatPrice(score.suggestedPriceUsd)}
              </strong>
              .{" "}
              {score.deviationPpp > 1.05 ? (
                <>
                  This deal is above that, but still well below typical{" "}
                  {regionName} pricing — so it&apos;s a net win.
                </>
              ) : score.deviationPpp < 0.95 ? (
                <>
                  This deal is actually below that too — a great deal all
                  around.
                </>
              ) : (
                <>
                  This deal is close to that, and well below typical{" "}
                  {regionName} pricing.
                </>
              )}
            </CollapsibleContent>
          </Collapsible>
        )}

        {tier === "none" && (
          <p className="text-sm italic text-muted-foreground">
            The developer hasn&apos;t set a dedicated price for your region —
            you&apos;re paying the base USD price.
          </p>
        )}
      </HoverCardContent>
    </HoverCard>
  );
});
