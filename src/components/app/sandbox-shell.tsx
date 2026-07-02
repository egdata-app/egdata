import { OpenLauncher } from "@/components/app/open-launcher";
import { SectionsNav } from "@/components/app/offer-sections";
import { EpicTrophyIcon } from "@/components/icons/epic-trophy";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCountry } from "@/hooks/use-country";
import { useLocale } from "@/hooks/use-locale";
import { calculatePrice } from "@/lib/calculate-price";
import { getImage } from "@/lib/get-image";
import { internalNamespaces } from "@/lib/internal-namespaces";
import { cn } from "@/lib/utils";
import { sandboxBaseGameQueryOptions, sandboxQueryOptions } from "@/queries/sandbox";
import { sandboxHubQueryOptions, type SandboxHubData } from "@/queries/sandbox-hub";
import type { Price } from "@/types/price";
import type { SingleItem } from "@/types/single-item";
import type { SingleOffer } from "@/types/single-offer";
import type { SingleSandbox } from "@/types/single-sandbox";
import { useQuery } from "@tanstack/react-query";
import { Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { DateTime } from "luxon";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import {
  Archive,
  BoxIcon,
  CalculatorIcon,
  LibrarySquareIcon,
  PackageIcon,
  ShoppingBag,
  StoreIcon,
} from "lucide-react";
import { useMemo, type ComponentType } from "react";

type BaseGame = SingleOffer | (SingleItem & { isItem: true }) | null;
type NavIcon = ComponentType<{ className?: string }>;

export interface SandboxShellProps {
  id: string;
  /** If the hub data is already available (hub index route), pass it to avoid a second GraphQL call. */
  hub?: SandboxHubData | null;
}

export function SandboxShell({ id, hub }: SandboxShellProps) {
  const { country } = useCountry();
  const { t } = useTranslation();
  const { data: sandbox } = useQuery(sandboxQueryOptions(id));
  const { data: baseGame } = useQuery(sandboxBaseGameQueryOptions(id));
  const { data: hubData } = useQuery(
    sandboxHubQueryOptions({
      id,
      country: country || "US",
      offerLimit: 8,
      updateLimit: 8,
    }),
  );
  const navigate = useNavigate();
  const location = useLocation();
  const subPath = (location.pathname.split(`/${id}/`)[1] ?? "") as string;
  const activeHub = hub ?? hubData ?? null;

  return (
    <main className="mx-auto flex w-full max-w-[1500px] flex-col gap-8 px-4 pb-16 pt-2 md:px-8">
      <SandboxHero id={id} hub={activeHub} sandbox={sandbox ?? null} baseGame={baseGame ?? null} />

      <div className="sticky top-0 z-20 -mx-4 border-y border-border/40 bg-background/92 px-4 py-3 backdrop-blur md:-mx-8 md:px-8">
        <SectionsNav
          links={[
            {
              id: "",
              label: <NavLabel icon={BoxIcon} label={t("components.sandboxShell.overview")} />,
              href: `/sandboxes/${id}`,
            },
            {
              id: "offers",
              label: <NavLabel icon={StoreIcon} label={t("components.sandboxShell.offers")} />,
              href: `/sandboxes/${id}/offers`,
            },
            {
              id: "items",
              label: (
                <NavLabel icon={LibrarySquareIcon} label={t("components.sandboxShell.items")} />
              ),
              href: `/sandboxes/${id}/items`,
            },
            {
              id: "assets",
              label: <NavLabel icon={Archive} label={t("components.sandboxShell.assets")} />,
              href: `/sandboxes/${id}/assets`,
            },
            {
              id: "builds",
              label: <NavLabel icon={PackageIcon} label={t("components.sandboxShell.builds")} />,
              href: `/sandboxes/${id}/builds`,
            },
            {
              id: "achievements",
              label: (
                <NavLabel icon={EpicTrophyIcon} label={t("components.sandboxShell.achievements")} />
              ),
              href: `/sandboxes/${id}/achievements`,
            },
            {
              id: "changelog",
              label: (
                <NavLabel icon={CalculatorIcon} label={t("components.sandboxShell.changelog")} />
              ),
              href: `/sandboxes/${id}/changelog`,
            },
          ]}
          activeSection={subPath}
          onSectionChange={(section) => {
            navigate({
              to: section ? `/sandboxes/${id}/${section}` : `/sandboxes/${id}`,
              replace: false,
              resetScroll: false,
            });
          }}
        />
      </div>

      <Outlet />
    </main>
  );
}

function NavLabel({ icon: Icon, label }: { icon: NavIcon; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <Icon className="size-4" />
      <span>{label}</span>
    </span>
  );
}

function SandboxHero({
  id,
  hub,
  sandbox,
  baseGame,
}: {
  id: string;
  hub: SandboxHubData | null;
  sandbox: SingleSandbox | null;
  baseGame: BaseGame;
}) {
  const { t } = useTranslation();
  const isInternal = useMemo(() => internalNamespaces.includes(id), [id]);
  const isUnreal = id === "ue";

  const title =
    hub?.title ??
    (isUnreal
      ? t("components.sandboxShell.unrealEngine")
      : isInternal
        ? t("components.sandboxShell.internalSandbox")
        : undefined) ??
    (baseGame && "title" in baseGame ? baseGame.title : undefined) ??
    sandbox?.displayName ??
    (sandbox?.name as string | undefined) ??
    t("components.sandboxShell.sandbox");

  const description = hub?.description ?? undefined;
  const developer = hub?.developer ?? undefined;
  const publisher = hub?.publisher ?? undefined;
  const seller = hub?.seller ?? null;
  const genres = hub?.genres ?? null;
  const platforms = hub?.platforms ?? null;
  const price = hub?.price ?? null;
  const primaryOffer = hub?.primaryOffer ?? null;

  const keyImages = (hub?.keyImages ??
    (baseGame && "keyImages" in baseGame ? baseGame.keyImages : [])) as {
    type: string;
    url: string;
    md5: string;
  }[];

  const image = getImage(keyImages, [
    "DieselStoreFrontWide",
    "OfferImageWide",
    "DieselGameBoxWide",
    "TakeoverWide",
    "Screenshot",
    "DieselGameBox",
  ]);

  const releaseStatus = getReleaseStatus(primaryOffer, t);
  const updated = hub?.updated ?? sandbox?.updated;

  return (
    <section className="relative overflow-hidden rounded-md border border-border/50 bg-card">
      <div className="absolute inset-0">
        <img src={image.url} alt={title} className="h-full w-full object-cover" loading="eager" />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/88 to-background/55" />
        <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/35 to-transparent" />
      </div>

      <div className="relative z-10 flex min-h-[330px] flex-col justify-end gap-5 p-6 md:p-9 lg:p-10">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{t("components.sandboxShell.sandbox")}</Badge>
          {releaseStatus && <Badge variant="outline">{releaseStatus}</Badge>}
          {sandbox?.status && <Badge variant="outline">{sandbox.status}</Badge>}
          {isInternal && (
            <Badge variant="outline">{t("components.sandboxShell.internalNamespace")}</Badge>
          )}
        </div>

        <div className="max-w-5xl space-y-3">
          <h1 className="text-3xl font-bold leading-tight tracking-tight md:text-5xl">{title}</h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span className="font-mono text-xs">{id}</span>
            {developer && (
              <>
                <span>/</span>
                <span>{developer}</span>
              </>
            )}
            {publisher && publisher !== developer && (
              <>
                <span>/</span>
                <span>{publisher}</span>
              </>
            )}
            {seller?.id ? (
              <>
                <span>/</span>
                <Link
                  to="/sellers/$id"
                  params={{ id: seller.id }}
                  className="underline decoration-dotted underline-offset-4"
                >
                  {seller.name}
                </Link>
              </>
            ) : (
              seller?.name && (
                <>
                  <span>/</span>
                  <span>{seller.name}</span>
                </>
              )
            )}
            {updated && (
              <>
                <span>/</span>
                <span>{t("components.sandboxShell.updated", { date: formatDate(updated) })}</span>
              </>
            )}
          </div>
        </div>

        {description && (
          <p className="line-clamp-2 max-w-4xl text-base leading-7 text-muted-foreground md:text-lg">
            {description}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {genres?.slice(0, 3).map((genre) => (
            <Badge key={genre?.id ?? genre?.name} variant="secondary">
              {genre?.name}
            </Badge>
          ))}
          {platforms?.slice(0, 4).map((platform) => (
            <Badge key={platform} variant="outline">
              {platform}
            </Badge>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <PriceBlock price={price} />
          {primaryOffer && <StoreActions offer={primaryOffer} />}
        </div>
      </div>
    </section>
  );
}

function StoreActions({ offer }: { offer: SingleOffer }) {
  const storeUrl = getStoreUrl(offer);
  const { t } = useTranslation();

  return (
    <>
      {storeUrl && (
        <Button asChild className="h-10 gap-2">
          <a href={storeUrl} target="_blank" rel="noopener noreferrer">
            <ShoppingBag className="size-4" />
            <span>{t("components.sandboxShell.storePage")}</span>
          </a>
        </Button>
      )}
      <OpenLauncher id={offer.id} />
    </>
  );
}

function getStoreUrl(offer: SingleOffer) {
  if (offer.namespace === "ue") {
    const fabListingId = offer.customAttributes?.FabListingId?.value;
    return fabListingId ? `https://www.fab.com/listings/${fabListingId}` : null;
  }

  const isBundle = offer.offerType === "BUNDLE";
  const namespace = isBundle ? "bundles" : "product";
  const urlType = offer.offerType === "BASE_GAME" ? "product" : "url";
  const slug =
    offer.customAttributes?.["com.epicgames.app.productSlug"]?.value ??
    offer.offerMappings?.[0]?.pageSlug ??
    offer.urlSlug ??
    (urlType === "product" ? offer.productSlug : offer.urlSlug);

  if (!slug) {
    return null;
  }

  return `/store/${namespace}/${slug.replaceAll("-pp", "")}?id=${offer.id}&ns=${offer.namespace}`;
}

function PriceBlock({ price }: { price: Price | null }) {
  const { locale } = useLocale();
  const { t } = useTranslation();

  if (!price) {
    return null;
  }

  const formatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: price.price.currencyCode || "USD",
  });
  const discountPrice = calculatePrice(price.price.discountPrice ?? 0, price.price.currencyCode);
  const originalPrice = calculatePrice(price.price.originalPrice ?? 0, price.price.currencyCode);
  const discounted = (price.price.discount ?? 0) > 0 && originalPrice > discountPrice;
  const discountPercent = discounted
    ? Math.round(((originalPrice - discountPrice) / originalPrice) * 100)
    : 0;

  return (
    <div className="flex min-h-10 flex-wrap items-center gap-2 rounded-md border border-border/45 bg-background/60 px-4 py-2 backdrop-blur md:gap-3 md:py-0">
      <span className={cn("text-lg font-semibold", discounted && "text-primary")}>
        {discountPrice === 0 ? t("common.free") : formatter.format(discountPrice)}
      </span>
      {discounted && (
        <>
          <span className="text-sm text-muted-foreground line-through">
            {formatter.format(originalPrice)}
          </span>
          <Badge className="bg-badge text-black">-{discountPercent}%</Badge>
        </>
      )}
    </div>
  );
}

function getReleaseStatus(offer: SingleOffer | null, t: TFunction) {
  if (!offer) {
    return null;
  }

  if (offer.prePurchase) {
    return t("components.sandboxShell.releaseStatus.prePurchase");
  }

  if (!offer.releaseDate || offer.releaseDate.includes("2099")) {
    return t("components.sandboxShell.releaseStatus.datePending");
  }

  return new Date(offer.releaseDate) > new Date()
    ? t("components.sandboxShell.releaseStatus.comingSoon")
    : t("components.sandboxShell.releaseStatus.released");
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "N/A";
  }

  const date = DateTime.fromISO(value);
  if (!date.isValid) {
    return "N/A";
  }

  return date.setLocale("en-GB").toLocaleString({
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
