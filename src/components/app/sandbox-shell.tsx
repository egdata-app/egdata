import { OpenLauncher } from "@/components/app/open-launcher";
import { Link } from "@/components/app/localized-link";
import { RenderTextPlatformIcon } from "@/components/app/platform-icons";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants, LinkButton } from "@/components/ui/button";
import { useCountry } from "@/hooks/use-country";
import { useLocale } from "@/hooks/use-locale";
import buildImageUrl, { buildSrcSet } from "@/lib/build-image-url";
import { calculatePrice } from "@/lib/calculate-price";
import { getEffectivePrice } from "@/lib/effective-price";
import { getImage } from "@/lib/get-image";
import { internalNamespaces } from "@/lib/internal-namespaces";
import { sandboxViewTransition } from "@/lib/sandbox-transition";
import { cn } from "@/lib/utils";
import {
  sandboxBaseGameQueryOptions,
  sandboxQueryOptions,
  type SandboxBaseGame,
  type SandboxIdentity,
} from "@/queries/sandbox";
import { sandboxHubQueryOptions, type SandboxHubData } from "@/queries/sandbox-hub";
import type { Price } from "@/types/price";
import { useQuery } from "@tanstack/react-query";
import { Outlet, useMatches } from "@tanstack/react-router";
import { DateTime } from "luxon";
import { useTranslation } from "@/lib/paraglide-react";
import type { TFunction } from "@/lib/paraglide-i18next";
import {
  Archive,
  ArrowUpRight,
  BoxIcon,
  Check,
  Copy,
  FileClock,
  LibrarySquareIcon,
  PackageIcon,
  ShoppingBag,
  StoreIcon,
  Trophy,
} from "lucide-react";
import { useState } from "react";

type BaseGame = SandboxBaseGame;
export interface SandboxShellProps {
  id: string;
  hub?: SandboxHubData | null;
}

export function SandboxShell({ id, hub }: SandboxShellProps) {
  const { country } = useCountry();
  const { locale } = useLocale();
  const { t } = useTranslation();
  const { data: sandbox } = useQuery(sandboxQueryOptions(id));
  const { data: baseGame } = useQuery(sandboxBaseGameQueryOptions(id, country || "US"));
  const { data: hubData } = useQuery(
    sandboxHubQueryOptions({ id, country: country || "US", offerLimit: 8, updateLimit: 8 }),
  );
  // Matches commit inside the view transition; location changes earlier, while loaders run.
  const pathname = useMatches({ select: (matches) => matches.at(-1)?.pathname ?? "" });
  const subPath = pathname.split(`/sandboxes/${id}`)[1]?.replace(/^\/|\/$/g, "") || "";
  const activeHub = hub ?? hubData ?? null;
  const isCompact = Boolean(subPath);

  const images = (activeHub?.keyImages?.filter(Boolean) ??
    baseGame?.keyImages ??
    []) as SandboxBaseGame["keyImages"];
  const backdropImage = getImage(images, [
    "DieselStoreFrontWide",
    "OfferImageWide",
    "DieselGameBoxWide",
    "TakeoverWide",
    "Screenshot",
    "DieselGameBox",
  ]);

  const sections = [
    { id: "", label: "overview", icon: BoxIcon, count: undefined },
    { id: "offers", label: "offers", icon: StoreIcon, count: activeHub?.stats?.offers },
    { id: "items", label: "items", icon: LibrarySquareIcon, count: activeHub?.stats?.items },
    { id: "assets", label: "assets", icon: Archive, count: activeHub?.stats?.assets },
    { id: "builds", label: "builds", icon: PackageIcon, count: activeHub?.stats?.builds },
    {
      id: "achievements",
      label: "achievements",
      icon: Trophy,
      count: activeHub?.stats?.achievements,
    },
    { id: "changelog", label: "changelog", icon: FileClock, count: undefined },
  ] as const;

  return (
    <main className="sandbox-shell relative mx-auto flex w-full min-w-0 max-w-7xl flex-1 flex-col gap-8 px-4 pb-16 pt-6 sm:px-6 lg:px-8">
      {!isCompact && backdropImage.type !== "placeholder" && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 -top-2 z-0 h-80 select-none overflow-hidden rounded-2xl opacity-30"
        >
          <img
            src={buildImageUrl(backdropImage.url, 640, "low")}
            alt=""
            className="size-full scale-110 object-cover blur-2xl"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/35 via-background/75 to-background" />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-background" />
        </div>
      )}

      <SandboxHero
        id={id}
        hub={activeHub}
        sandbox={sandbox ?? null}
        baseGame={baseGame ?? null}
        compact={isCompact}
      />

      <nav
        style={{ viewTransitionName: "sandbox-tabs" }}
        aria-label={t("sandboxCatalog.navigation")}
        className="sticky top-0 z-20 -mx-4 overflow-x-auto [color-scheme:dark] [scrollbar-width:thin] border-b border-border/60 bg-background/90 px-4 backdrop-blur-md sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
      >
        <ul className="flex w-max min-w-full gap-1">
          {sections.map((section) => {
            const isActive = subPath === section.id;
            return (
              <li key={section.id}>
                <Link
                  to={`/{-$locale}/sandboxes/$id${section.id ? `/${section.id}` : ""}`}
                  params={{ id }}
                  viewTransition={sandboxViewTransition}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "group inline-flex min-h-12 items-center gap-2 whitespace-nowrap border-b-2 px-3.5 py-3 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary",
                    isActive
                      ? "border-primary text-foreground"
                      : "border-transparent text-muted-foreground hover:border-border/80 hover:text-foreground",
                  )}
                >
                  <section.icon
                    aria-hidden="true"
                    className={cn(
                      "size-4 shrink-0 transition-colors",
                      isActive
                        ? "text-primary"
                        : "text-muted-foreground/80 group-hover:text-foreground",
                    )}
                  />
                  <span>{t(`components.sandboxShell.${section.label}`)}</span>
                  {typeof section.count === "number" && (
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums transition-colors duration-150",
                        isActive
                          ? "bg-primary/15 text-primary"
                          : "bg-muted/60 text-muted-foreground group-hover:bg-muted group-hover:text-foreground/85",
                      )}
                    >
                      {section.count.toLocaleString(locale)}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="relative z-10 min-w-0" style={{ viewTransitionName: "sandbox-content" }}>
        <Outlet />
      </div>
    </main>
  );
}

function NamespaceCopy({ id, compact = false }: { id: string; compact?: boolean }) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");

  return (
    <div className="min-w-0">
      <div className={cn("flex items-center gap-2", !compact && "justify-between")}>
        <div className="flex min-w-0 items-center gap-2">
          <span className="shrink-0 text-xs font-medium text-muted-foreground">Namespace</span>
          <code className="min-w-0 break-all font-mono text-xs tabular-nums text-foreground/90">
            {id}
          </code>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="size-7 shrink-0 rounded-full text-muted-foreground transition-colors duration-150 hover:bg-muted/80 hover:text-primary"
          aria-label={t("sandboxCatalog.copy")}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(id);
              setStatus("copied");
            } catch {
              setStatus("error");
            }
          }}
        >
          {status === "copied" ? (
            <Check className="size-3.5 text-emerald-400" />
          ) : (
            <Copy className="size-3.5" />
          )}
        </Button>
      </div>
      {status !== "idle" && (
        <span
          role="status"
          className={cn(
            "mt-0.5 block text-xs",
            status === "copied" ? "text-emerald-400" : "text-destructive",
          )}
        >
          {status === "copied" ? t("sandboxCatalog.copied") : t("sandboxCatalog.copyFailed")}
        </span>
      )}
    </div>
  );
}

function SandboxHero({
  id,
  hub,
  sandbox,
  baseGame,
  compact,
}: {
  id: string;
  hub: SandboxHubData | null;
  sandbox: SandboxIdentity | null;
  baseGame: BaseGame | null;
  compact: boolean;
}) {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const [expanded, setExpanded] = useState(false);
  const isInternal = internalNamespaces.includes(id);
  const title =
    hub?.title ||
    (id === "ue"
      ? t("components.sandboxShell.unrealEngine")
      : isInternal
        ? t("components.sandboxShell.internalSandbox")
        : undefined) ||
    baseGame?.title ||
    sandbox?.displayName ||
    sandbox?.name ||
    t("components.sandboxShell.sandbox");

  const images = (hub?.keyImages?.filter(Boolean) ??
    baseGame?.keyImages ??
    []) as SandboxBaseGame["keyImages"];
  const image = getImage(images, [
    "DieselStoreFrontWide",
    "OfferImageWide",
    "DieselGameBoxWide",
    "TakeoverWide",
    "Screenshot",
    "DieselGameBox",
  ]);
  const primaryOffer = baseGame && !baseGame.isItem ? baseGame : null;
  const releaseStatus = getReleaseStatus(primaryOffer, t);
  const updated = hub?.updated ?? sandbox?.updated;

  const artwork =
    image.type !== "placeholder" ? (
      <img
        src={buildImageUrl(image.url, compact ? 256 : 960, compact ? "low" : "high")}
        srcSet={compact ? undefined : buildSrcSet(image.url, 960, "high")}
        sizes={compact ? "128px" : "(min-width: 1024px) 840px, 100vw"}
        alt=""
        className="size-full object-cover object-top transition-transform duration-300 ease-out will-change-transform group-hover:scale-[1.03]"
        onError={(event) => {
          event.currentTarget.srcset = "";
          event.currentTarget.src = "/placeholder.webp";
        }}
      />
    ) : (
      <div className="flex size-full items-center justify-center bg-muted/30">
        <BoxIcon className={cn("text-muted-foreground/70", compact ? "size-7" : "size-12")} />
      </div>
    );

  if (compact) {
    return (
      <header className="relative z-10 flex min-w-0 items-center gap-4 border-b border-border/50 pb-5">
        <div
          style={{ viewTransitionName: "sandbox-artwork" }}
          className="group aspect-video w-24 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-muted/40 shadow-sm transition-[box-shadow,border-color] duration-200 ease-out hover:border-primary/60 sm:w-32"
        >
          {artwork}
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/{-$locale}/sandboxes/$id"
              params={{ id }}
              viewTransition={sandboxViewTransition}
              className="text-xs font-medium text-muted-foreground transition-colors duration-150 hover:text-primary"
            >
              {t("components.sandboxShell.sandbox")}
            </Link>
            {isInternal && (
              <span className="rounded-full border border-border/60 bg-card/50 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                {t("components.sandboxShell.internalNamespace")}
              </span>
            )}
          </div>
          <h1
            style={{ viewTransitionName: "sandbox-title" }}
            className="font-display break-words text-xl font-bold tracking-tight text-foreground sm:text-2xl"
          >
            {title}
          </h1>
          <NamespaceCopy key={id} id={id} compact />
        </div>
      </header>
    );
  }

  return (
    <header className="relative z-10 grid min-w-0 items-start gap-8 border-b border-border/50 pb-8 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0 space-y-5">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full border border-border/60 bg-card/60 px-3 py-0.5 text-xs font-medium text-muted-foreground">
              {t("components.sandboxShell.sandbox")}
            </span>
            {releaseStatus && (
              <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-0.5 text-xs font-medium text-primary">
                {releaseStatus}
              </span>
            )}
            {sandbox?.status && (
              <span className="inline-flex items-center rounded-full border border-border/60 bg-card/40 px-3 py-0.5 text-xs font-medium text-muted-foreground">
                {sandbox.status}
              </span>
            )}
            {isInternal && (
              <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-0.5 text-xs font-medium text-amber-300">
                {t("components.sandboxShell.internalNamespace")}
              </span>
            )}
          </div>

          <h1
            style={{ viewTransitionName: "sandbox-title" }}
            className="font-display break-words text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-[2.5rem] lg:leading-[1.12]"
          >
            {title}
          </h1>
        </div>

        <div
          style={{ viewTransitionName: "sandbox-artwork" }}
          className="group relative aspect-video w-full max-h-[420px] overflow-hidden rounded-xl border border-white/10 bg-muted/40 shadow-xl shadow-black/30 transition-[box-shadow,border-color] duration-200 ease-out hover:border-primary/50"
        >
          {artwork}
        </div>

        {hub?.description && (
          <div>
            <p
              id="sandbox-description"
              className={cn(
                "max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base sm:leading-relaxed",
                !expanded && "line-clamp-3",
              )}
            >
              {hub.description}
            </p>
            {hub.description.length > 240 && (
              <button
                type="button"
                aria-expanded={expanded}
                aria-controls="sandbox-description"
                onClick={() => setExpanded(!expanded)}
                className="mt-2 cursor-pointer text-sm font-medium text-primary transition-colors duration-150 hover:text-primary/80 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {t(expanded ? "sandboxCatalog.readLess" : "sandboxCatalog.readMore")}
              </button>
            )}
          </div>
        )}
      </div>

      <aside
        aria-label={t("sandboxCatalog.details")}
        className="flex min-w-0 flex-col gap-5 self-start rounded-xl border border-white/10 bg-card/70 p-5 shadow-lg shadow-black/20 backdrop-blur-sm"
      >
        {primaryOffer && (
          <div className="flex flex-col gap-3 border-b border-border/50 pb-5">
            <PriceBlock price={primaryOffer.price} />
            <div className="flex flex-col gap-2">
              <StoreActions offer={primaryOffer} />
              <Link
                to="/{-$locale}/offers/$id"
                params={{ id: primaryOffer.id }}
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "h-10 justify-between border-white/10 bg-background/50 transition-colors duration-150 hover:border-primary/60 hover:bg-card",
                )}
              >
                <span>{t("sandboxCatalog.primaryOffer")}</span>
                <ArrowUpRight className="size-4 text-muted-foreground" />
              </Link>
            </div>
          </div>
        )}

        <div className="rounded-lg border border-border/50 bg-background/50 px-3 py-2">
          <NamespaceCopy key={id} id={id} />
        </div>

        <dl className="divide-y divide-border/40 text-sm">
          {hub?.developer && (
            <div className="flex items-baseline justify-between gap-4 py-2.5 first:pt-0">
              <dt className="shrink-0 text-xs font-medium text-muted-foreground">
                {t("sandboxCatalog.developer")}
              </dt>
              <dd className="min-w-0 break-words text-right text-sm font-medium text-foreground/95">
                {hub.developer}
              </dd>
            </div>
          )}
          {hub?.publisher && (
            <div className="flex items-baseline justify-between gap-4 py-2.5 first:pt-0">
              <dt className="shrink-0 text-xs font-medium text-muted-foreground">
                {t("sandboxCatalog.publisher")}
              </dt>
              <dd className="min-w-0 break-words text-right text-sm font-medium text-foreground/95">
                {hub.publisher}
              </dd>
            </div>
          )}
          {hub?.seller?.id && (
            <div className="flex items-baseline justify-between gap-4 py-2.5 first:pt-0">
              <dt className="shrink-0 text-xs font-medium text-muted-foreground">
                {t("sandboxCatalog.columns.seller")}
              </dt>
              <dd className="min-w-0 truncate text-right text-sm">
                <Link
                  to="/{-$locale}/sellers/$id"
                  params={{ id: hub.seller.id }}
                  className="font-medium text-primary underline-offset-4 transition-colors duration-150 hover:text-primary/80 hover:underline"
                >
                  {hub.seller.name}
                </Link>
              </dd>
            </div>
          )}
          {!!hub?.platforms?.length && (
            <div className="flex items-center justify-between gap-4 py-2.5 first:pt-0">
              <dt className="shrink-0 text-xs font-medium text-muted-foreground">
                {t("sandboxCatalog.platforms")}
              </dt>
              <dd className="flex min-w-0 flex-wrap items-center justify-end gap-2 text-right text-sm font-medium text-foreground/95">
                {hub.platforms.map((platform) => (
                  <span key={platform} className="inline-flex items-center gap-1 text-xs">
                    {RenderTextPlatformIcon({
                      platform,
                      className: "size-3.5 text-muted-foreground",
                      key: `sandbox-platform-${platform}`,
                    })}
                    <span>{platform}</span>
                  </span>
                ))}
              </dd>
            </div>
          )}
        </dl>

        {!!hub?.genres?.length && (
          <div className="flex flex-wrap gap-1.5 border-t border-border/40 pt-4">
            {hub.genres.filter(Boolean).map((genre) => (
              <Badge
                key={genre?.id ?? genre?.name}
                variant="secondary"
                className="rounded-full border border-border/60 bg-background/50 px-2.5 py-0.5 text-xs font-medium text-muted-foreground transition-colors duration-150 hover:border-primary/50 hover:text-foreground"
              >
                {genre?.name}
              </Badge>
            ))}
          </div>
        )}

        {updated && (
          <p className="border-t border-border/40 pt-3 text-xs tabular-nums text-muted-foreground/80">
            {t("components.sandboxShell.updated", { date: formatDate(updated, locale || "en-US") })}
          </p>
        )}
      </aside>
    </header>
  );
}

function StoreActions({ offer }: { offer: SandboxBaseGame }) {
  const storeUrl = getStoreUrl(offer);
  const { t } = useTranslation();

  return (
    <>
      {storeUrl && (
        <LinkButton
          href={storeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="h-10 gap-2 font-medium"
        >
          <ShoppingBag className="size-4" />
          <span>{t("components.sandboxShell.storePage")}</span>
        </LinkButton>
      )}
      <OpenLauncher id={offer.id} />
    </>
  );
}

function getStoreUrl(offer: SandboxBaseGame) {
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
  const effectivePrice = getEffectivePrice(price);

  if (!effectivePrice) {
    return null;
  }

  const formatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: effectivePrice.price.currencyCode || "USD",
  });
  const discountPrice = calculatePrice(
    effectivePrice.price.discountPrice ?? 0,
    effectivePrice.price.currencyCode,
  );
  const originalPrice = calculatePrice(
    effectivePrice.price.originalPrice ?? 0,
    effectivePrice.price.currencyCode,
  );
  const discounted = (effectivePrice.price.discount ?? 0) > 0 && originalPrice > discountPrice;
  const discountPercent = discounted
    ? Math.round(((originalPrice - discountPrice) / originalPrice) * 100)
    : 0;

  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 tabular-nums">
      <div className="flex flex-wrap items-baseline gap-2.5">
        {discountPrice === 0 ? (
          <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-3 py-1 text-sm font-semibold text-emerald-300">
            {t("common.free")}
          </span>
        ) : (
          <span className="font-display text-2xl font-bold tracking-tight tabular-nums text-foreground">
            {formatter.format(discountPrice)}
          </span>
        )}
        {discounted && (
          <span className="text-sm tabular-nums text-muted-foreground line-through">
            {formatter.format(originalPrice)}
          </span>
        )}
      </div>
      {discounted && (
        <span className="rounded-md bg-primary px-2 py-0.5 text-xs font-semibold tabular-nums text-primary-foreground shadow-sm">
          -{discountPercent}%
        </span>
      )}
    </div>
  );
}

function getReleaseStatus(offer: SandboxBaseGame | null, t: TFunction) {
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

function formatDate(value: string | null | undefined, locale: string) {
  if (!value) {
    return "N/A";
  }

  const date = DateTime.fromISO(value);
  if (!date.isValid) {
    return "N/A";
  }

  return date.setLocale(locale).toLocaleString({
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
