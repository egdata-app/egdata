import { Link } from "@/components/app/localized-link";
import { sandboxViewTransition } from "@/lib/sandbox-transition";
import { Button, buttonVariants } from "@/components/ui/button";
import { useCountry } from "@/hooks/use-country";
import { useLocale } from "@/hooks/use-locale";
import buildImageUrl, { buildSrcSet } from "@/lib/build-image-url";
import { calculatePrice } from "@/lib/calculate-price";
import { getEffectivePrice } from "@/lib/effective-price";
import { getImage } from "@/lib/get-image";
import { useTranslation } from "@/lib/paraglide-react";
import { sandboxCatalogGroups, type SandboxCatalogGroup } from "@/lib/sandbox-catalog";
import { sandboxCatalogQueryOptions, type SandboxCatalogOffer } from "@/queries/sandbox-catalog";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, ArrowRight, Inbox, Package, RotateCcw, SearchX } from "lucide-react";

export function SandboxQueryState({
  loading,
  error,
  retry,
  empty,
  reset,
  variant = "rows",
}: {
  loading?: boolean;
  error?: boolean;
  retry?: () => void;
  empty?: boolean;
  reset?: () => void;
  variant?: "rows" | "cards";
}) {
  const { t } = useTranslation();

  if (loading) {
    if (variant === "cards") {
      return (
        <div
          role="status"
          className="grid grid-cols-1 gap-5 min-[420px]:grid-cols-2 lg:grid-cols-4"
        >
          <span className="sr-only">{t("sandboxCatalog.loading")}</span>
          {Array.from({ length: 4 }).map((_, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: skeleton cards are positional placeholders
            <div key={index} className="space-y-2.5">
              <div className="aspect-[16/9] animate-pulse rounded-lg bg-muted/40" />
              <div className="h-4 w-3/4 animate-pulse rounded bg-muted/30" />
              <div className="h-3.5 w-1/3 animate-pulse rounded bg-muted/25" />
            </div>
          ))}
        </div>
      );
    }

    return (
      <div role="status" className="space-y-2.5 rounded-xl border border-white/10 bg-card/40 p-4">
        <span className="sr-only">{t("sandboxCatalog.loading")}</span>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-12 animate-pulse rounded-lg bg-muted/35" />
        ))}
      </div>
    );
  }

  const StateIcon = error ? AlertCircle : empty ? Inbox : SearchX;

  return (
    <div
      role={error ? "alert" : "status"}
      className="flex flex-col items-center justify-center rounded-xl border border-white/10 bg-card/50 px-6 py-12 text-center"
    >
      <span className="mb-3 inline-flex size-10 items-center justify-center rounded-full border border-white/10 bg-background/60 text-muted-foreground">
        <StateIcon className={cn("size-5", error && "text-destructive")} />
      </span>
      <p className="text-sm font-medium text-foreground">
        {t(
          error
            ? "sandboxCatalog.error"
            : empty
              ? "sandboxCatalog.empty"
              : "sandboxCatalog.noMatches",
        )}
      </p>
      {error && retry && (
        <Button
          variant="outline"
          size="sm"
          className="mt-4 border-white/10 bg-card/80 hover:border-primary/60"
          onClick={retry}
        >
          <RotateCcw className="size-3.5" />
          {t("sandboxCatalog.retry")}
        </Button>
      )}
      {!error && reset && (
        <Button
          variant="outline"
          size="sm"
          className="mt-4 border-white/10 bg-card/80 hover:border-primary/60"
          onClick={reset}
        >
          {t("sandboxCatalog.reset")}
        </Button>
      )}
    </div>
  );
}

export function SandboxOfferCard({ offer }: { offer: SandboxCatalogOffer }) {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const image = getImage(offer.keyImages, [
    "OfferImageWide",
    "DieselStoreFrontWide",
    "DieselGameBoxWide",
    "Thumbnail",
    "OfferImageTall",
  ]);
  const effective = getEffectivePrice(offer.price);
  const currencyCode = effective?.price.currencyCode;
  const discountPrice = effective?.price.discountPrice;
  const originalPrice = effective?.price.originalPrice;
  const hasPrice = typeof discountPrice === "number" && Boolean(currencyCode);
  const isFree = hasPrice && discountPrice === 0;
  const isDiscounted =
    hasPrice &&
    typeof originalPrice === "number" &&
    originalPrice > discountPrice &&
    originalPrice > 0;
  const discountPct = isDiscounted
    ? Math.round(((originalPrice - discountPrice) / originalPrice) * 100)
    : 0;

  const formatAmount = (amount: number) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currencyCode || "USD",
    }).format(calculatePrice(amount, currencyCode || "USD"));

  const typeLabel = offer.offerType
    ? t(`sandboxCatalog.types.${offer.offerType.replaceAll("_", "")}`, {
        defaultValue: offer.offerType,
      })
    : t("sandboxCatalog.unknownType");

  return (
    <Link
      to="/{-$locale}/offers/$id"
      params={{ id: offer.id }}
      className="group flex min-w-0 flex-col text-start focus-visible:outline-none"
    >
      <div className="relative aspect-[16/9] w-full overflow-hidden rounded-lg border border-white/10 bg-muted/40 transition-[box-shadow,border-color] duration-200 ease-out group-hover:border-primary/60 group-hover:shadow-lg group-hover:shadow-black/35 group-focus-visible:border-primary">
        {image.type !== "placeholder" ? (
          <img
            src={buildImageUrl(image.url, 420, "medium")}
            srcSet={buildSrcSet(image.url, 420, "medium")}
            sizes="(min-width: 1024px) 290px, (min-width: 420px) 46vw, 94vw"
            alt=""
            loading="lazy"
            decoding="async"
            className="size-full object-cover transition-transform duration-300 ease-out will-change-transform group-hover:scale-[1.035]"
            onError={(event) => {
              event.currentTarget.srcset = "";
              event.currentTarget.src = "/placeholder.webp";
            }}
          />
        ) : (
          <div className="flex size-full items-center justify-center bg-muted/30">
            <Package className="size-9 text-muted-foreground/60" />
          </div>
        )}
        <span className="absolute start-2 top-2 rounded-md bg-background/80 px-2 py-0.5 text-[11px] font-medium text-foreground/90 ring-1 ring-white/10 backdrop-blur-md">
          {typeLabel}
        </span>
        {discountPct > 0 && (
          <span className="absolute bottom-2 end-2 rounded-md bg-primary px-1.5 py-0.5 text-xs font-semibold tabular-nums text-primary-foreground shadow-sm">
            -{discountPct}%
          </span>
        )}
      </div>

      <div className="mt-2.5 flex flex-1 flex-col gap-1">
        <h3 className="line-clamp-2 break-words text-sm font-medium leading-snug text-foreground transition-colors duration-150 group-hover:text-primary">
          {offer.title || offer.id}
        </h3>
        <div className="flex flex-wrap items-baseline gap-2 tabular-nums">
          {!hasPrice ? (
            <span className="text-xs text-muted-foreground">
              {t("sandboxCatalog.priceUnknown")}
            </span>
          ) : isFree ? (
            <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-300">
              {t("common.free")}
            </span>
          ) : (
            <>
              <span className="text-sm font-semibold text-foreground">
                {formatAmount(discountPrice)}
              </span>
              {isDiscounted && (
                <span className="text-xs text-muted-foreground line-through">
                  {formatAmount(originalPrice)}
                </span>
              )}
            </>
          )}
        </div>
      </div>
    </Link>
  );
}

function CatalogPreview({ id, group }: { id: string; group: SandboxCatalogGroup }) {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const { country } = useCountry();
  const query = useQuery(
    sandboxCatalogQueryOptions(
      id,
      { q: "", group, types: "", page: 1, pageSize: 4 },
      country || "US",
    ),
  );

  if (query.isSuccess && query.data.elements.length === 0) return null;

  return (
    <section className="space-y-4" aria-label={t(`sandboxCatalog.groups.${group}`)}>
      <div className="flex items-baseline justify-between gap-4 border-b border-border/60 pb-2.5">
        <div className="flex min-w-0 items-baseline gap-2.5">
          <h2 className="font-display text-lg font-semibold tracking-tight text-foreground">
            {t(`sandboxCatalog.groups.${group}`)}
          </h2>
          {query.data && query.data.count !== null && (
            <span className="shrink-0 rounded-full border border-white/10 bg-card/80 px-2.5 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
              {query.data.count.toLocaleString(locale)}
            </span>
          )}
        </div>
        <Link
          to="/{-$locale}/sandboxes/$id/offers"
          params={{ id }}
          search={{ group }}
          viewTransition={sandboxViewTransition}
          className="group/link inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors duration-150 hover:text-primary"
        >
          <span>{t("sandboxCatalog.viewAll")}</span>
          <ArrowRight className="size-3.5 transition-transform duration-150 group-hover/link:translate-x-0.5" />
        </Link>
      </div>
      {query.isPending ? (
        <SandboxQueryState loading variant="cards" />
      ) : query.isError ? (
        <SandboxQueryState error retry={() => void query.refetch()} />
      ) : (
        <div className="grid grid-cols-1 gap-5 min-[420px]:grid-cols-2 lg:grid-cols-4">
          {query.data.elements.map((offer) => (
            <SandboxOfferCard key={offer.id} offer={offer} />
          ))}
        </div>
      )}
    </section>
  );
}

export function SandboxCatalogPreviews({ id, total }: { id: string; total?: number | null }) {
  const { t } = useTranslation();
  const { country } = useCountry();
  const countQuery = useQuery({
    ...sandboxCatalogQueryOptions(
      id,
      { q: "", group: "all", types: "", page: 1, pageSize: 1 },
      country || "US",
    ),
    enabled: total == null,
  });
  const resolvedTotal = total ?? countQuery.data?.count;
  const isEmpty =
    resolvedTotal === 0 ||
    (resolvedTotal == null && countQuery.isSuccess && countQuery.data.elements.length === 0);

  return (
    <div className="space-y-10">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div className="space-y-1">
          <h2 className="font-display text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            {t("sandboxCatalog.title")}
          </h2>
          <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
            {t("sandboxCatalog.description")}
          </p>
        </div>
        <Link
          to="/{-$locale}/sandboxes/$id/offers"
          params={{ id }}
          search={{ group: "all" }}
          viewTransition={sandboxViewTransition}
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "shrink-0 rounded-full border-white/10 bg-card/70 px-4 transition-colors duration-150 hover:border-primary/60 hover:bg-card",
          )}
        >
          <span>{t("sandboxCatalog.allOffers")}</span>
          <ArrowRight className="size-3.5" />
        </Link>
      </div>
      {isEmpty ? (
        <SandboxQueryState empty />
      ) : (
        <div className="space-y-10">
          {sandboxCatalogGroups.map((group) => (
            <CatalogPreview key={group.id} id={id} group={group.id} />
          ))}
        </div>
      )}
    </div>
  );
}
