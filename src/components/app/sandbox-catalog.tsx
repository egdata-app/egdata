import { Link } from "@/components/app/localized-link";
import { sandboxViewTransition } from "@/lib/sandbox-transition";
import { Button } from "@/components/ui/button";
import { useCountry } from "@/hooks/use-country";
import { useLocale } from "@/hooks/use-locale";
import { calculatePrice } from "@/lib/calculate-price";
import { getEffectivePrice } from "@/lib/effective-price";
import { getImage } from "@/lib/get-image";
import { useTranslation } from "@/lib/paraglide-react";
import { sandboxCatalogGroups, type SandboxCatalogGroup } from "@/lib/sandbox-catalog";
import { sandboxCatalogQueryOptions } from "@/queries/sandbox-catalog";
import type { SingleOffer } from "@/types/single-offer";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Package, RotateCcw } from "lucide-react";

export function SandboxQueryState({
  loading,
  error,
  retry,
  empty,
  reset,
}: {
  loading?: boolean;
  error?: boolean;
  retry?: () => void;
  empty?: boolean;
  reset?: () => void;
}) {
  const { t } = useTranslation();
  if (loading)
    return (
      <div role="status" className="space-y-3 py-6">
        <span className="sr-only">{t("sandboxCatalog.loading")}</span>
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-md bg-muted/50" />
        ))}
      </div>
    );
  return (
    <div
      role={error ? "alert" : "status"}
      className="rounded-md border border-dashed border-border px-6 py-10 text-center"
    >
      <p className="font-medium">
        {t(
          error
            ? "sandboxCatalog.error"
            : empty
              ? "sandboxCatalog.empty"
              : "sandboxCatalog.noMatches",
        )}
      </p>
      {error && retry && (
        <Button variant="outline" className="mt-4" onClick={retry}>
          <RotateCcw className="size-4" />
          {t("sandboxCatalog.retry")}
        </Button>
      )}
      {!error && reset && (
        <Button variant="outline" className="mt-4" onClick={reset}>
          {t("sandboxCatalog.reset")}
        </Button>
      )}
    </div>
  );
}

export function SandboxOfferCard({ offer }: { offer: SingleOffer }) {
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
  const amount = effective?.price.discountPrice;
  const price =
    typeof amount === "number" && effective?.price.currencyCode
      ? amount === 0
        ? t("common.free")
        : new Intl.NumberFormat(locale, {
            style: "currency",
            currency: effective.price.currencyCode,
          }).format(calculatePrice(amount, effective.price.currencyCode))
      : t("sandboxCatalog.priceUnknown");
  return (
    <Link
      to="/{-$locale}/offers/$id"
      params={{ id: offer.id }}
      className="group flex min-w-0 flex-col overflow-hidden rounded-md border border-border/60 bg-card transition-colors hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <div className="aspect-video overflow-hidden bg-muted/30">
        {image.type !== "placeholder" ? (
          <img
            src={image.url}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 motion-safe:group-hover:scale-105"
            onError={(event) => {
              event.currentTarget.src = "/placeholder.webp";
            }}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Package className="size-10 text-muted-foreground" />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <span className="text-xs text-muted-foreground">
          {offer.offerType
            ? t(`sandboxCatalog.types.${offer.offerType.replaceAll("_", "")}`, {
                defaultValue: offer.offerType,
              })
            : t("sandboxCatalog.unknownType")}
        </span>
        <h3 className="break-words text-base font-semibold leading-snug group-hover:text-primary">
          {offer.title || offer.id}
        </h3>
        <span className="truncate font-mono text-[11px] text-muted-foreground" title={offer.id}>
          {offer.id}
        </span>
        <div className="mt-auto flex items-center justify-between gap-2 border-t border-border/50 pt-3 text-sm">
          <span>{price}</span>
          <ArrowRight aria-hidden="true" className="size-4 shrink-0 text-primary" />
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
  if (query.isSuccess && !query.data.count) return null;
  return (
    <section className="space-y-4" aria-label={t(`sandboxCatalog.groups.${group}`)}>
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-semibold">
          {t(`sandboxCatalog.groups.${group}`)}
          {query.data && (
            <span className="ml-3 text-sm font-normal text-muted-foreground">
              {" "}
              {query.data.count.toLocaleString(locale)}
            </span>
          )}
        </h2>
        <Link
          to="/{-$locale}/sandboxes/$id/offers"
          params={{ id }}
          search={{ group }}
          viewTransition={sandboxViewTransition}
          className="inline-flex shrink-0 items-center gap-2 text-sm text-primary hover:underline"
        >
          {t("sandboxCatalog.viewAll")}
          <ArrowRight className="size-4" />
        </Link>
      </div>
      {query.isPending ? (
        <SandboxQueryState loading />
      ) : query.isError ? (
        <SandboxQueryState error retry={() => void query.refetch()} />
      ) : (
        <div className="grid grid-cols-1 gap-4 min-[400px]:grid-cols-2 lg:grid-cols-4">
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
  const isEmpty = (total ?? countQuery.data?.count) === 0;

  return (
    <div className="space-y-9">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">{t("sandboxCatalog.title")}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            {t("sandboxCatalog.description")}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link
            to="/{-$locale}/sandboxes/$id/offers"
            params={{ id }}
            search={{ group: "all" }}
            viewTransition={sandboxViewTransition}
          >
            {t("sandboxCatalog.allOffers")}
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>
      {isEmpty ? (
        <SandboxQueryState empty />
      ) : (
        sandboxCatalogGroups.map((group) => (
          <CatalogPreview key={group.id} id={id} group={group.id} />
        ))
      )}
    </div>
  );
}
