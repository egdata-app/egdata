import { OpenLauncher } from "@/components/app/open-launcher";
import { Link } from "@/components/app/localized-link";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants, LinkButton } from "@/components/ui/button";
import { useCountry } from "@/hooks/use-country";
import { useLocale } from "@/hooks/use-locale";
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
    <main className="sandbox-shell mx-auto flex w-full min-w-0 max-w-[1500px] flex-col gap-6 px-4 pb-16 pt-4 md:px-8">
      <SandboxHero
        id={id}
        hub={activeHub}
        sandbox={sandbox ?? null}
        baseGame={baseGame ?? null}
        compact={Boolean(subPath)}
      />
      <nav
        style={{ viewTransitionName: "sandbox-tabs" }}
        aria-label={t("sandboxCatalog.navigation")}
        className="sticky top-0 z-20 -mx-4 overflow-x-auto [color-scheme:dark] [scrollbar-width:thin] border-b border-border/60 bg-background/95 px-4 backdrop-blur md:-mx-8 md:px-8"
      >
        <ul className="flex w-max min-w-full gap-1">
          {sections.map((section) => (
            <li key={section.id}>
              <Link
                to={`/{-$locale}/sandboxes/$id${section.id ? `/${section.id}` : ""}`}
                params={{ id }}
                viewTransition={sandboxViewTransition}
                aria-current={subPath === section.id ? "page" : undefined}
                className={cn(
                  "group inline-flex min-h-12 items-center gap-2 whitespace-nowrap border-b-2 px-3.5 py-3 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary",
                  subPath === section.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
                )}
              >
                <section.icon aria-hidden="true" className="size-4 shrink-0" />
                {t(`components.sandboxShell.${section.label}`)}
                {typeof section.count === "number" && (
                  <span
                    className={cn(
                      "rounded-md px-1.5 py-0.5 text-[11px] font-medium tabular-nums transition-colors duration-150",
                      subPath === section.id
                        ? "bg-primary/15 text-primary"
                        : "bg-muted/70 text-muted-foreground group-hover:bg-muted group-hover:text-foreground/80",
                    )}
                  >
                    {section.count.toLocaleString(locale)}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="min-w-0" style={{ viewTransitionName: "sandbox-content" }}>
        <Outlet />
      </div>
    </main>
  );
}

function NamespaceCopy({ id }: { id: string }) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">Namespace</span>
        <code className="min-w-0 break-all font-mono text-xs tabular-nums text-foreground/90">
          {id}
        </code>
        <Button
          size="icon"
          variant="ghost"
          className="size-8 shrink-0 text-muted-foreground transition-colors duration-150 hover:bg-muted/80 hover:text-primary"
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
            <Check className="size-3.5 text-primary" />
          ) : (
            <Copy className="size-3.5" />
          )}
        </Button>
      </div>
      <span role="status" className="text-xs text-muted-foreground">
        {status === "copied"
          ? t("sandboxCatalog.copied")
          : status === "error"
            ? t("sandboxCatalog.copyFailed")
            : ""}
      </span>
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
        src={image.url}
        alt=""
        className="h-full w-full object-cover object-top transition-transform duration-300 ease-out group-hover:scale-[1.03]"
        onError={(event) => {
          event.currentTarget.src = "/placeholder.webp";
        }}
      />
    ) : (
      <div className="flex h-full items-center justify-center bg-muted/25">
        <BoxIcon className="size-12 text-muted-foreground" />
      </div>
    );
  if (compact)
    return (
      <header className="flex min-w-0 items-center gap-4 border-b border-border/60 pb-5">
        <div
          style={{ viewTransitionName: "sandbox-artwork" }}
          className="group aspect-video w-24 shrink-0 overflow-hidden rounded-xl border border-border/60 bg-card/80 shadow-sm transition-[box-shadow,border-color,background-color] duration-200 ease-out hover:border-primary/50 sm:w-32"
        >
          {artwork}
        </div>
        <div className="min-w-0 flex-1">
          <Link
            to="/{-$locale}/sandboxes/$id"
            params={{ id }}
            viewTransition={sandboxViewTransition}
            className="text-xs font-medium text-muted-foreground transition-colors duration-150 hover:text-primary"
          >
            {t("components.sandboxShell.sandbox")}
          </Link>
          <h1
            style={{ viewTransitionName: "sandbox-title" }}
            className="font-display break-words text-2xl font-semibold tracking-tight text-foreground"
          >
            {title}
          </h1>
          <NamespaceCopy key={id} id={id} />
        </div>
      </header>
    );
  return (
    <header className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0 space-y-5">
        <div className="border-b border-border/60 pb-4">
          <div className="mb-2 flex flex-wrap gap-2">
            <Badge
              variant="secondary"
              className="border border-border/50 transition-colors duration-150 hover:border-primary/50"
            >
              {t("components.sandboxShell.sandbox")}
            </Badge>
            {isInternal && (
              <Badge
                variant="outline"
                className="border-border/60 transition-colors duration-150 hover:border-primary/50"
              >
                {t("components.sandboxShell.internalNamespace")}
              </Badge>
            )}
          </div>
          <h1
            style={{ viewTransitionName: "sandbox-title" }}
            className="font-display break-words text-3xl font-bold tracking-tight text-foreground md:text-4xl"
          >
            {title}
          </h1>
        </div>
        <div
          style={{ viewTransitionName: "sandbox-artwork" }}
          className="group relative aspect-video w-full max-h-[420px] overflow-hidden rounded-xl border border-border/60 bg-card/80 shadow-sm transition-[box-shadow,border-color,background-color] duration-200 ease-out hover:border-primary/50"
        >
          {artwork}
        </div>
        {hub?.description && (
          <div>
            <p
              id="sandbox-description"
              className={cn(
                "max-w-3xl text-sm leading-7 text-muted-foreground",
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
                className="mt-2 text-sm font-medium text-primary transition-colors duration-150 hover:text-primary/80 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {t(expanded ? "sandboxCatalog.readLess" : "sandboxCatalog.readMore")}
              </button>
            )}
          </div>
        )}
      </div>
      <aside
        aria-label={t("sandboxCatalog.details")}
        className="flex min-w-0 flex-col gap-5 self-start rounded-xl border border-border/60 bg-card/80 p-5 shadow-sm transition-[box-shadow,border-color,background-color] duration-200 ease-out hover:border-border lg:mt-0"
      >
        <div className="flex flex-wrap gap-2">
          {releaseStatus && (
            <Badge
              variant="secondary"
              className="border border-border/50 transition-colors duration-150 hover:border-primary/50"
            >
              {releaseStatus}
            </Badge>
          )}
          {sandbox?.status && (
            <Badge
              variant="outline"
              className="border-border/60 transition-colors duration-150 hover:border-primary/50"
            >
              {sandbox.status}
            </Badge>
          )}
        </div>
        <NamespaceCopy key={id} id={id} />
        <dl className="divide-y divide-border/60 text-sm">
          {[
            { label: t("sandboxCatalog.developer"), value: hub?.developer },
            { label: t("sandboxCatalog.publisher"), value: hub?.publisher },
            { label: t("sandboxCatalog.platforms"), value: hub?.platforms?.join(", ") },
          ]
            .filter((entry) => entry.value)
            .map((entry) => (
              <div key={entry.label} className="flex justify-between gap-4 py-3">
                <dt className="text-muted-foreground">{entry.label}</dt>
                <dd className="min-w-0 break-words text-right font-medium text-foreground/95">
                  {entry.value}
                </dd>
              </div>
            ))}
        </dl>
        {hub?.seller?.id && (
          <Link
            to="/{-$locale}/sellers/$id"
            params={{ id: hub.seller.id }}
            className="inline-flex items-center self-start text-sm font-medium text-primary underline-offset-4 transition-colors duration-150 hover:text-primary/80 hover:underline"
          >
            {hub.seller.name}
          </Link>
        )}
        {!!hub?.genres?.length && (
          <div className="flex flex-wrap gap-2">
            {hub.genres.filter(Boolean).map((genre) => (
              <Badge
                key={genre?.id ?? genre?.name}
                variant="outline"
                className="border-border/60 transition-colors duration-150 hover:border-primary/50 hover:text-foreground"
              >
                {genre?.name}
              </Badge>
            ))}
          </div>
        )}
        {updated && (
          <p className="text-xs tabular-nums text-muted-foreground">
            {t("components.sandboxShell.updated", { date: formatDate(updated, locale || "en-US") })}
          </p>
        )}
        {primaryOffer && (
          <div className="flex flex-col gap-3 border-t border-border/60 pt-5">
            <PriceBlock price={primaryOffer.price} />
            <Link
              to="/{-$locale}/offers/$id"
              params={{ id: primaryOffer.id }}
              className={cn(
                buttonVariants({ variant: "outline" }),
                "border-border/60 transition-[box-shadow,border-color,background-color,color] duration-200 ease-out hover:border-primary/50 hover:bg-accent",
              )}
            >
              {t("sandboxCatalog.primaryOffer")}
            </Link>
            <StoreActions offer={primaryOffer} />
          </div>
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
          className="h-10 gap-2"
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
    <div className="flex min-h-10 flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-background/60 px-4 py-2.5 backdrop-blur tabular-nums transition-colors duration-150 hover:border-primary/50 md:gap-3 md:py-0">
      <span className={cn("text-lg font-semibold tabular-nums", discounted && "text-primary")}>
        {discountPrice === 0 ? t("common.free") : formatter.format(discountPrice)}
      </span>
      {discounted && (
        <>
          <span className="text-sm tabular-nums text-muted-foreground line-through">
            {formatter.format(originalPrice)}
          </span>
          <Badge className="bg-badge text-black tabular-nums">-{discountPercent}%</Badge>
        </>
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
