import defaultPlayerTheme from "@vidstack/react/player/styles/default/theme.css?url";
import defaultAudioPlayer from "@vidstack/react/player/styles/default/layouts/audio.css?url";
import defaultVideoPlayer from "@vidstack/react/player/styles/default/layouts/video.css?url";
import { BaseGame } from "@/components/app/base-game";
import { OfferInBundle } from "@/components/app/bundle-game";
import { FranchiseBanner } from "@/components/app/franchise-banner";
import { InternalBanner } from "@/components/app/internal-banner";
import { OfferHero } from "@/components/app/offer-hero";
import { SectionsNav } from "@/components/app/offer-sections";
import { OpenLauncher } from "@/components/app/open-launcher";
import { platformIcons } from "@/components/app/platform-icons";
import { PrepurchasePopup } from "@/components/app/prepurchase-popup";
import { StoreDropdown } from "@/components/app/store-dropdown";
import { AddIcon } from "@/components/icons/add";
import { RemoveIcon } from "@/components/icons/remove";
import { Bundle } from "@/components/modules/bundle";
import { CollectionOffers } from "@/components/modules/collection-offers";
import { SellerOffers } from "@/components/modules/seller-offers";
import { SuggestedOffers } from "@/components/modules/suggested-offers";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { useCompare } from "@/hooks/use-compare";
import { useLocale } from "@/hooks/use-locale";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { ClientOnly } from "@/lib/cllient-only";
import { generateOfferMeta } from "@/lib/generate-offer-meta";
import buildImageUrl from "@/lib/build-image-url";
import { getImage } from "@/lib/get-image";
import { Seller } from "@/lib/get-seller";
import {
  offerFranchisesQueryOptions,
  offerOnlyQueryOptions,
  offerTechnologiesQueryOptions,
  resolveQueryLocale,
} from "@/queries/offer";
import { internalNamespaces } from "@/lib/internal-namespaces";
import { offersDictionary } from "@/lib/offers-dictionary";
import { compareDates, timeAgo } from "@/lib/time-ago";
import { cn } from "@/lib/utils";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Outlet, useLocation } from "@tanstack/react-router";
import { Link } from "@/components/app/localized-link";
import { FabIcon } from "@/components/icons/fab";
import { DateTime } from "luxon";
import { Bell } from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { useCookies } from "react-cookie";
import { OffersHomeSkeleton } from "@/components/skeletons/offers-home";
import { TechnologyLink } from "@/components/technology/TechnologyLink";
import { useTranslation } from "@/lib/paraglide-react";
import i18n from "@/lib/i18n";

const offerHeadLinks = [
  {
    rel: "stylesheet",
    href: defaultPlayerTheme,
  },
  {
    rel: "stylesheet",
    href: defaultAudioPlayer,
  },
  {
    rel: "stylesheet",
    href: defaultVideoPlayer,
  },
  // Preload all the styles for the video player
  {
    rel: "preload",
    href: defaultPlayerTheme,
    as: "style",
  },
  {
    rel: "preload",
    href: defaultAudioPlayer,
    as: "style",
  },
  {
    rel: "preload",
    href: defaultVideoPlayer,
    as: "style",
  },
];

export const Route = createFileRoute("/{-$locale}/offers/$id")({
  component: () => {
    const { id } = Route.useParams();
    return (
      <Suspense key={id} fallback={<OffersHomeSkeleton />}>
        <OfferPage />
      </Suspense>
    );
  },

  headers: () => ({
    "Cache-Control": "public, s-maxage=60, stale-while-revalidate=600",
  }),

  loader: async ({ params, context }) => {
    const { country, locale, cookies, queryClient } = context;
    const { id } = params;
    const resolvedLocale = resolveQueryLocale(
      import.meta.env.SSR ? locale : (locale ?? cookies?.user_locale),
    );
    const offerQuery = offerOnlyQueryOptions(id, resolvedLocale);

    if (import.meta.env.SSR) {
      const offer = await queryClient.ensureQueryData(offerQuery).catch(() => null);
      return {
        id,
        country,
        locale: resolvedLocale,
        offer,
        isOfferLoaded: true,
      };
    }

    const cachedOffer = queryClient.getQueryData(offerQuery.queryKey);
    void queryClient.prefetchQuery(offerQuery);

    return {
      id,
      country,
      locale: resolvedLocale,
      offer: cachedOffer ?? null,
      isOfferLoaded: cachedOffer !== undefined,
    };
  },

  head: (ctx) => {
    const { loaderData } = ctx;

    if (!loaderData) {
      return {
        links: offerHeadLinks,
      };
    }

    const { offer, country, isOfferLoaded } = loaderData;

    if (!offer) {
      if (!isOfferLoaded) {
        return {
          links: offerHeadLinks,
        };
      }

      return {
        meta: [
          {
            title: i18n.t("offerDetail.common.offerNotFound"),
            description: i18n.t("offerDetail.common.offerNotFound"),
          },
        ],
        links: offerHeadLinks,
      };
    }

    return {
      meta: generateOfferMeta(offer, undefined, country || "US"),
      links: offerHeadLinks,
    };
  },
});

function OfferPage() {
  const { t } = useTranslation();
  const { id } = Route.useParams();
  const { locale, timezone } = useLocale();
  const { addToCompare, removeFromCompare, compare } = useCompare();
  const location = useLocation();

  const { data: offer } = useSuspenseQuery(offerOnlyQueryOptions(id, locale));
  const { data: technologies = [] } = useQuery({
    ...offerTechnologiesQueryOptions(id),
    enabled: Boolean(offer),
  });
  const { data: franchises = [] } = useQuery({
    ...offerFranchisesQueryOptions(id),
    enabled: Boolean(offer),
  });
  const franchise = franchises[0];

  const subPath = location.pathname.split(`/${id}/`)[1];
  const normalizedSubPath = subPath?.replace(/\/$/, "") ?? "";

  useEffect(() => {
    if (typeof document === "undefined") return;

    if (!offer) {
      document.title = t("offerDetail.common.offerNotFound");
      return;
    }

    const sectionTitleMap: Record<string, string> = {
      price: t("offerDetail.price.title"),
      items: t("offerDetail.items.title"),
      builds: t("offerDetail.builds.title"),
      achievements: "Achievements",
      related: t("offerDetail.related.title"),
      metadata: "Metadata",
      changelog: "Changelog",
      media: "Media",
      reviews: "Reviews",
    };

    const section = normalizedSubPath ? sectionTitleMap[normalizedSubPath] : undefined;
    document.title = `${offer.title}${section ? ` - ${section}` : ""} | egdata.app`;
  }, [offer, normalizedSubPath, t]);

  if (!offer) {
    return <main>{t("offerDetail.common.offerNotFound")}</main>;
  }

  if (offer.title === "Error") {
    return <main>{offer.description}</main>;
  }

  const isFabItem = offer.customAttributes.FabListingId;
  const expiryDateValue = offer.expiryDate;
  const expiryDate = expiryDateValue ? DateTime.fromISO(expiryDateValue).toUTC() : null;
  const isUnavailableForPurchase = Boolean(expiryDate?.isValid && expiryDate < DateTime.utc());
  const platformTags = offer.tags
    .filter((tag) => tag !== null)
    .filter((tag) => platformIcons[tag.id]);
  const backdropUrl = getImage(offer.keyImages, [
    "DieselGameBoxWide",
    "OfferImageWide",
    "DieselStoreFrontWide",
    "OfferImageTall",
  ])?.url;

  return (
    <main className="flex flex-col items-start justify-start w-full min-h-screen gap-6 relative px-4 md:px-8 pb-12 max-w-[1600px] mx-auto">
      {backdropUrl && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 -top-6 z-0 h-80 select-none overflow-hidden rounded-2xl opacity-35"
        >
          <img
            src={buildImageUrl(backdropUrl, 640, "low")}
            alt=""
            className="size-full scale-110 object-cover blur-2xl"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/75 to-background" />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-background" />
        </div>
      )}
      <ClientOnly>
        <PrepurchasePopup id={offer.id} offer={offer} />
      </ClientOnly>
      <header className="relative z-10 grid w-full grid-cols-1 gap-6 md:grid-cols-2">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2 border-b border-border/60 pb-4">
            <div className="inline-flex min-w-0 flex-wrap items-center gap-3 md:gap-4">
              {isFabItem && <FabIcon className="size-10 shrink-0" />}
              <h1 className="min-w-0 font-display text-2xl font-bold leading-tight tracking-tight text-foreground md:text-4xl">
                {offer.title}
              </h1>
            </div>
            <h4
              className="inline-flex flex-wrap items-center gap-2 font-display text-base font-medium text-muted-foreground md:text-lg"
              aria-label={t("offerDetail.hero.offeredBy", { seller: offer.seller.name })}
            >
              <Seller
                developerDisplayName={offer.developerDisplayName as string}
                publisherDisplayName={offer.publisherDisplayName as string}
                seller={offer.seller.name}
                customAttributes={offer.customAttributes}
              />
              {offer.prePurchase && (
                <Badge
                  variant="outline"
                  className="border-border/60 transition-colors duration-150 hover:border-primary/50"
                >
                  {t("offerDetail.badges.prePurchase")}
                </Badge>
              )}
              {isUnavailableForPurchase && (
                <Badge variant="destructive" className="transition-colors duration-150">
                  {t("offerDetail.badges.unavailableForPurchase")}
                </Badge>
              )}
              {offer.tags.find((tag) => tag.id === "1310") && (
                <Badge
                  variant="outline"
                  className="border-border/60 transition-colors duration-150 hover:border-primary/50"
                >
                  {t("offerDetail.badges.earlyAccess")}
                </Badge>
              )}
            </h4>
          </div>

          <div className="overflow-hidden rounded-xl border border-border/60 bg-card/80 shadow-sm transition-[box-shadow,border-color,background-color] duration-200 ease-out hover:border-border">
            <Table className="min-w-[640px]">
              <TableHeader>
                <TableRow className="border-border/50 hover:bg-muted/30 transition-colors duration-150">
                  <TableHead className="w-[180px] md:w-[300px] text-muted-foreground">
                    {t("offerDetail.table.offerId")}
                  </TableHead>
                  <TableHead className="text-left font-mono tabular-nums text-foreground/95 border-l border-border/50">
                    {offer.id}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="border-border/50 transition-colors duration-150 hover:bg-muted/30">
                  <TableCell className="font-medium text-muted-foreground">
                    {t("offerDetail.table.namespace")}
                  </TableCell>
                  <TableCell className="text-left font-mono tabular-nums border-l border-border/50">
                    <Link
                      to={"/{-$locale}/sandboxes/$id"}
                      params={{
                        id: offer.namespace,
                      }}
                      className="rounded-sm underline decoration-dotted decoration-border underline-offset-4 transition-colors duration-150 hover:text-primary hover:decoration-primary/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {internalNamespaces.includes(offer.namespace) ? (
                        <TooltipTrigger>
                          <span tabIndex={0}>{offer.namespace}</span>
                          <Tooltip>
                            <p>{t("offerDetail.tooltip.internalNamespace")}</p>
                          </Tooltip>
                        </TooltipTrigger>
                      ) : (
                        offer.namespace
                      )}
                    </Link>
                  </TableCell>
                </TableRow>
                <TableRow className="border-border/50 transition-colors duration-150 hover:bg-muted/30">
                  <TableCell className="font-medium text-muted-foreground">
                    {t("offerDetail.table.offerType")}
                  </TableCell>
                  <TableCell className="text-left border-l border-border/50">
                    {offersDictionary[offer.offerType as keyof typeof offersDictionary] ||
                      offer.offerType}
                  </TableCell>
                </TableRow>
                <TableRow className="border-border/50 transition-colors duration-150 hover:bg-muted/30">
                  <TableCell className="font-medium text-muted-foreground">
                    {t("offerDetail.table.seller")}
                  </TableCell>
                  <TableCell className="text-left border-l border-border/50">
                    <Link
                      to="/{-$locale}/sellers/$id"
                      params={{ id: offer.seller.id }}
                      className="rounded-sm font-medium underline decoration-border underline-offset-4 transition-colors duration-150 hover:text-primary hover:decoration-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {offer.seller.name}
                    </Link>
                  </TableCell>
                </TableRow>
                <TableRow className="border-border/50 transition-colors duration-150 hover:bg-muted/30">
                  <TableCell className="font-medium text-muted-foreground">
                    {t("offerDetail.table.developer")}
                  </TableCell>
                  <TableCell className="text-left inline-flex items-center gap-1 border-l border-border/50">
                    <Seller
                      developerDisplayName={offer.developerDisplayName as string}
                      publisherDisplayName={offer.publisherDisplayName as string}
                      seller={offer.seller.name}
                      customAttributes={offer.customAttributes}
                    />
                  </TableCell>
                </TableRow>
                <TableRow className="border-border/50 transition-colors duration-150 hover:bg-muted/30">
                  <TableCell className="font-medium text-muted-foreground">
                    {t("offerDetail.table.supportedPlatforms")}
                  </TableCell>
                  <TableCell className="text-left border-l border-border/50 inline-flex items-center justify-start gap-1.5">
                    {platformTags.map((tag) => (
                      <span
                        key={tag.id}
                        className="text-sm text-foreground/90 transition-colors duration-150 hover:text-primary"
                      >
                        {platformIcons[tag.id]}
                      </span>
                    ))}

                    {!platformTags.length && <div>{t("offerDetail.common.na")}</div>}
                  </TableCell>
                </TableRow>
                <TableRow className="border-border/50 transition-colors duration-150 hover:bg-muted/30">
                  <TableCell className="font-medium text-muted-foreground">
                    {t("offerDetail.table.releaseDate")}
                  </TableCell>
                  <TableCell className="text-left inline-flex items-center gap-1.5 tabular-nums border-l border-border/50">
                    <ReleaseDate
                      releaseDate={offer.releaseDate}
                      pcReleaseDate={offer.pcReleaseDate}
                      timezone={timezone}
                    />
                  </TableCell>
                </TableRow>
                {expiryDateValue && expiryDate && (
                  <TableRow className="border-border/50 transition-colors duration-150 hover:bg-muted/30">
                    <TableCell className="font-medium text-muted-foreground">
                      {t("offerDetail.table.expirationDate")}
                    </TableCell>
                    <TableCell className="text-left inline-flex items-center gap-1.5 tabular-nums border-l border-border/50">
                      {expiryDate.setZone(timezone).setLocale("en-GB").toLocaleString({
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "numeric",
                        minute: "numeric",
                        timeZoneName: "short",
                      })}
                      <TimeAgo targetDate={expiryDateValue} />
                    </TableCell>
                  </TableRow>
                )}
                <TableRow className="border-border/50 transition-colors duration-150 hover:bg-muted/30">
                  <TableCell className="font-medium text-muted-foreground">
                    {t("offerDetail.table.lastUpdate")}
                  </TableCell>
                  <TableCell className="text-left inline-flex items-center gap-1.5 tabular-nums border-l border-border/50">
                    {offer.lastModifiedDate
                      ? DateTime.fromISO(offer.lastModifiedDate, {
                          zone: timezone,
                        })
                          .setLocale("en-GB")
                          .toLocaleString({
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                            hour: "numeric",
                            minute: "numeric",
                            timeZoneName: "short",
                          })
                      : t("offerDetail.common.notAvailable")}
                    <TimeAgo targetDate={offer.lastModifiedDate} />
                  </TableCell>
                </TableRow>
                <TableRow className="border-border/50 transition-colors duration-150 hover:bg-muted/30">
                  <TableCell className="font-medium text-muted-foreground">
                    {t("offerDetail.table.creationDate")}
                  </TableCell>
                  <TableCell className="text-left inline-flex items-center gap-1.5 tabular-nums border-l border-border/50">
                    {offer.creationDate
                      ? DateTime.fromISO(offer.creationDate, {
                          zone: timezone,
                        })
                          .setLocale("en-GB")
                          .toLocaleString({
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                            hour: "numeric",
                            minute: "numeric",
                            timeZoneName: "short",
                          })
                      : t("offerDetail.common.notAvailable")}
                    <TimeAgo targetDate={offer.creationDate} />
                  </TableCell>
                </TableRow>
                {technologies && technologies.length > 0 && (
                  <TableRow className="border-border/50 transition-colors duration-150 hover:bg-muted/30">
                    <TableCell className="font-medium text-muted-foreground">
                      <TooltipTrigger>
                        <span
                          tabIndex={0}
                          className="underline decoration-dotted decoration-border/60 underline-offset-4 cursor-help transition-colors duration-150 hover:text-foreground"
                        >
                          {t("offerDetail.table.technologies")}
                        </span>
                        <Tooltip>
                          <p className="text-sm max-w-md">
                            {t("offerDetail.tooltip.techSource")}{" "}
                            <a
                              href="https://steamdb.info/tech/"
                              className="text-primary font-semibold transition-colors duration-150 hover:underline"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {t("offerDetail.tooltip.techSourceSteamDb")}
                            </a>{" "}
                            {t("offerDetail.tooltip.techDescription")}
                            <br />
                            <a
                              href="https://github.com/SteamDatabase/FileDetectionRuleSets"
                              className="text-primary font-semibold transition-colors duration-150 hover:underline"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {t("offerDetail.tooltip.source")}
                            </a>
                          </p>
                        </Tooltip>
                      </TooltipTrigger>
                    </TableCell>
                    <TableCell className="text-left border-l border-border/50 flex flex-wrap flex-row gap-1">
                      {technologies
                        .filter(
                          (technology) =>
                            technology.section === "Engine" ||
                            technology.section === "AntiCheat" ||
                            technology.section === "Container" ||
                            technology.section === "Emulator" ||
                            technology.section === "Launcher" ||
                            technology.technology === "SteamworksNET" ||
                            technology.technology === "EpicOnlineServices" ||
                            technology.technology === "Steam_Networking",
                        )
                        // Sort by
                        // Engine
                        // Launcher
                        // Anti-cheat
                        .sort((a, b) => {
                          if (a.section === "Engine") {
                            return -1;
                          }

                          if (b.section === "Engine") {
                            return 1;
                          }

                          if (a.section === "Launcher") {
                            return -1;
                          }

                          if (b.section === "Launcher") {
                            return 1;
                          }

                          if (a.section === "AntiCheat") {
                            return -1;
                          }

                          if (b.section === "AntiCheat") {
                            return 1;
                          }

                          return 0;
                        })
                        .map((technology, index, array) => (
                          <span
                            key={`${technology.section}-${technology.technology}`}
                            className="font-mono"
                          >
                            <TechnologyLink
                              id={technology.technology}
                              className="rounded-sm underline-offset-4 transition-colors duration-150 hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              {technology.technology}
                            </TechnologyLink>
                            <sup className="ml-[2px] text-[0.68rem] text-muted-foreground">
                              {technology.section}
                            </sup>
                            {index < array.length - 1 && ","}
                          </span>
                        ))}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <InternalBanner offer={offer} />
          <BaseGame offer={offer} />
          <OfferInBundle offer={offer} />
        </div>
        <div className="flex justify-start items-start flex-col gap-4">
          <div className="flex h-auto w-full flex-wrap items-center justify-start gap-2 md:h-8 md:justify-end">
            <StoreDropdown offer={offer} />
            <OpenLauncher id={offer.id} />
            <Button
              onClick={() => {
                if (compare.includes(offer.id)) {
                  removeFromCompare(offer.id);
                } else {
                  addToCompare(offer.id);
                }
              }}
              className="inline-flex items-center gap-1.5 bg-card/80 text-card-foreground border border-border/60 transition-[box-shadow,border-color,background-color,color] duration-200 ease-out hover:bg-accent hover:border-primary/50 hover:text-foreground"
            >
              {compare.includes(offer.id) ? <RemoveIcon /> : <AddIcon />}
              <span>{t("offerDetail.actions.compare")}</span>
            </Button>
            <OfferNotificationPopover offerId={offer.id} />
          </div>
          <OfferHero offer={offer} />
          {franchise &&
            franchise.offers.length > 1 &&
            (!franchise.namespaces || franchise.namespaces.length > 1) && (
              <FranchiseBanner franchise={franchise} />
            )}
          {offer.description && (
            <p className="px-1 text-sm leading-7 text-muted-foreground">{offer.description}</p>
          )}
        </div>
      </header>

      {offer.categories.findIndex((category) => category === "collections") !== -1 && (
        <section className="w-full min-h-[50vh] flex flex-col gap-4">
          <CollectionOffers id={offer.id} />
        </section>
      )}

      {offer.offerType === "BUNDLE" || offer.offerType === "Bundle" ? (
        <section className="w-full min-h-[50vh] flex flex-col gap-4">
          <hr className="my-4 w-full border-border/60" />
          <Bundle id={offer.id} offer={offer} />
          <hr className="my-4 w-full border-border/60" />
        </section>
      ) : null}

      <section
        id="offer-information"
        className="w-full min-h-[50vh] flex flex-col gap-5 border-t border-border/60 pt-6"
      >
        <SectionsNav
          links={[
            {
              id: "",
              label: t("offerDetail.tabs.overview"),
              href: `/offers/${offer.id}`,
              to: "/{-$locale}/offers/$id",
              params: { id: offer.id },
              preload: "intent",
              resetScroll: false,
            },
            {
              id: "price",
              label: t("offerDetail.tabs.price"),
              href: `/offers/${offer.id}/price`,
              to: "/{-$locale}/offers/$id/price",
              params: { id: offer.id },
              preload: "intent",
              resetScroll: false,
            },
            {
              id: "items",
              label: t("offerDetail.tabs.items"),
              href: `/offers/${offer.id}/items`,
              to: "/{-$locale}/offers/$id/items",
              params: { id: offer.id },
              preload: "intent",
              resetScroll: false,
            },
            {
              id: "builds",
              label: t("offerDetail.tabs.builds"),
              href: `/offers/${offer.id}/builds`,
              to: "/{-$locale}/offers/$id/builds",
              params: { id: offer.id },
              preload: "intent",
              resetScroll: false,
            },
            {
              id: "achievements",
              label: t("offerDetail.tabs.achievements"),
              href: `/offers/${offer.id}/achievements`,
              to: "/{-$locale}/offers/$id/achievements",
              params: { id: offer.id },
              preload: "intent",
              resetScroll: false,
            },
            {
              id: "related",
              label: t("offerDetail.tabs.related"),
              href: `/offers/${offer.id}/related`,
              to: "/{-$locale}/offers/$id/related",
              params: { id: offer.id },
              preload: "intent",
              resetScroll: false,
            },
            {
              id: "metadata",
              label: t("offerDetail.tabs.metadata"),
              href: `/offers/${offer.id}/metadata`,
              to: "/{-$locale}/offers/$id/metadata",
              params: { id: offer.id },
              preload: "intent",
              resetScroll: false,
            },
            {
              id: "changelog",
              label: t("offerDetail.tabs.changelog"),
              href: `/offers/${offer.id}/changelog`,
              to: "/{-$locale}/offers/$id/changelog",
              params: { id: offer.id },
              preload: "intent",
              resetScroll: false,
            },
            {
              id: "media",
              label: t("offerDetail.tabs.media"),
              href: `/offers/${offer.id}/media`,
              to: "/{-$locale}/offers/$id/media",
              params: { id: offer.id },
              preload: "intent",
              resetScroll: false,
            },
            {
              id: "reviews",
              label: t("offerDetail.tabs.reviews"),
              href: `/offers/${offer.id}/reviews`,
              to: "/{-$locale}/offers/$id/reviews",
              params: { id: offer.id },
              preload: "intent",
              resetScroll: false,
            },
          ]}
          activeSection={normalizedSubPath}
        />

        <div className="mx-auto w-full max-w-7xl px-4">
          <Outlet />
        </div>
      </section>

      <hr className="my-4 w-full border-border/60" />

      <SellerOffers id={offer.seller.id} name={offer.seller.name} currentOffer={offer} />

      <SuggestedOffers id={offer.id} />
    </main>
  );
}

function OfferNotificationPopover({ offerId }: { offerId: string }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [cookies] = useCookies(["push-notifications-api-key"]);
  const { canPerformTopicOperations, subscribeToTopic, unsubscribeFromTopic, isSubscribedToTopic } =
    usePushNotifications(cookies["push-notifications-api-key"], { enabled: open });

  const allTopic = `offer:${offerId}:*`;
  const priceTopic = `offer:${offerId}:price`;
  const achievementsTopic = `offer:${offerId}:achievements`;
  const buildsTopic = `offer:${offerId}:builds`;
  const itemsTopic = `offer:${offerId}:items`;
  const requirementsTopic = `offer:${offerId}:requirements`;
  const metadataTopic = `offer:${offerId}:metadata`;
  const mediaTopic = `offer:${offerId}:media`;

  const all = isSubscribedToTopic(allTopic);
  const price = isSubscribedToTopic(priceTopic);
  const achievements = isSubscribedToTopic(achievementsTopic);
  const builds = isSubscribedToTopic(buildsTopic);
  const items = isSubscribedToTopic(itemsTopic);
  const requirements = isSubscribedToTopic(requirementsTopic);
  const metadata = isSubscribedToTopic(metadataTopic);
  const media = isSubscribedToTopic(mediaTopic);

  const handleNotificationChange = async (setting: string, checked: boolean) => {
    if (!canPerformTopicOperations) return;

    const topicMap = {
      all: allTopic,
      price: priceTopic,
      achievements: achievementsTopic,
      builds: buildsTopic,
      items: itemsTopic,
      requirements: requirementsTopic,
      metadata: metadataTopic,
      media: mediaTopic,
    };

    const specificTopics = [
      priceTopic,
      achievementsTopic,
      buildsTopic,
      itemsTopic,
      requirementsTopic,
      metadataTopic,
      mediaTopic,
    ];

    if (setting === "all") {
      if (checked) {
        await subscribeToTopic(allTopic);
        for (const topic of specificTopics) {
          if (isSubscribedToTopic(topic)) {
            await unsubscribeFromTopic(topic);
          }
        }
      } else {
        await unsubscribeFromTopic(allTopic);
      }
    } else {
      const topic = topicMap[setting as keyof typeof topicMap];
      if (topic) {
        if (checked) {
          if (isSubscribedToTopic(allTopic)) {
            await unsubscribeFromTopic(allTopic);
          }
          await subscribeToTopic(topic);
        } else {
          await unsubscribeFromTopic(topic);
        }
      }
    }
  };

  return (
    <PopoverTrigger isOpen={open} onOpenChange={setOpen}>
      <Button
        className="inline-flex items-center gap-1 bg-card/80 text-card-foreground border border-border/60 transition-[box-shadow,border-color,background-color,color] duration-200 ease-out hover:bg-accent hover:border-primary/50 hover:text-foreground"
        size="sm"
      >
        <Bell className="h-4 w-4" />
      </Button>
      <Popover className="w-80">
        <div className="space-y-4">
          <h4 className="font-display font-semibold leading-none tracking-tight">
            {t("offerDetail.notifications.title")}
          </h4>
          {canPerformTopicOperations ? (
            <>
              <p className="text-sm text-muted-foreground">
                {t("offerDetail.notifications.description")}
              </p>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="all"
                    isSelected={all}
                    onChange={(checked) => handleNotificationChange("all", checked)}
                    isDisabled={
                      price || achievements || builds || items || requirements || metadata || media
                    }
                  />
                  <label
                    htmlFor="all"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {t("offerDetail.notifications.all")}
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="price"
                    isSelected={price}
                    onChange={(checked) => handleNotificationChange("price", checked)}
                    isDisabled={all}
                  />
                  <label
                    htmlFor="price"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {t("offerDetail.notifications.price")}
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="achievements"
                    isSelected={achievements}
                    onChange={(checked) => handleNotificationChange("achievements", checked)}
                    isDisabled={all}
                  />
                  <label
                    htmlFor="achievements"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {t("offerDetail.notifications.achievements")}
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="builds"
                    isSelected={builds}
                    onChange={(checked) => handleNotificationChange("builds", checked)}
                    isDisabled={all}
                  />
                  <label
                    htmlFor="builds"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {t("offerDetail.notifications.builds")}
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="items"
                    isSelected={items}
                    onChange={(checked) => handleNotificationChange("items", checked)}
                    isDisabled={all}
                  />
                  <label
                    htmlFor="items"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {t("offerDetail.notifications.items")}
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="requirements"
                    isSelected={requirements}
                    onChange={(checked) => handleNotificationChange("requirements", checked)}
                    isDisabled={all}
                  />
                  <label
                    htmlFor="requirements"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {t("offerDetail.notifications.requirements")}
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="metadata"
                    isSelected={metadata}
                    onChange={(checked) => handleNotificationChange("metadata", checked)}
                    isDisabled={all}
                  />
                  <label
                    htmlFor="metadata"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {t("offerDetail.notifications.metadata")}
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="media"
                    isSelected={media}
                    onChange={(checked) => handleNotificationChange("media", checked)}
                    isDisabled={all}
                  />
                  <label
                    htmlFor="media"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {t("offerDetail.notifications.media")}
                  </label>
                </div>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                {t("offerDetail.notifications.enablePushDescription")}
              </p>
              <Link to="/{-$locale}/notifications" className={cn(buttonVariants(), "w-full")}>
                {t("offerDetail.notifications.enablePushAction")}
              </Link>
            </>
          )}
        </div>
      </Popover>
    </PopoverTrigger>
  );
}

const TimeAgo: React.FC<{
  targetDate: string;
}> = ({ targetDate }) => {
  const { t } = useTranslation();
  return (
    <span className="text-muted-foreground tabular-nums">
      ({targetDate ? timeAgo(new Date(targetDate)) : t("offerDetail.common.notAvailable")})
    </span>
  );
};

const ReleaseDate: React.FC<{
  releaseDate: string | null;
  pcReleaseDate: string | null;
  timezone: string | undefined;
}> = ({ releaseDate, pcReleaseDate, timezone }) => {
  const { t } = useTranslation();
  if (!releaseDate || releaseDate.includes("2099")) {
    return <span>{t("offerDetail.common.notAvailable")}</span>;
  }

  return (
    <>
      <TooltipTrigger isDisabled={!pcReleaseDate}>
        <span tabIndex={0} className="flex items-center gap-1 cursor-default">
          <span
            className={cn(
              pcReleaseDate &&
                releaseDate !== pcReleaseDate &&
                "underline decoration-dotted underline-offset-4",
            )}
          >
            {DateTime.fromISO(releaseDate)
              .setZone(timezone || "UTC")
              .setLocale("en-GB")
              .toLocaleString({
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "numeric",
                minute: "numeric",
                timeZoneName: "short",
              })}
          </span>
        </span>
        <Tooltip>
          {!pcReleaseDate || releaseDate === pcReleaseDate ? (
            t("offerDetail.releaseDate.releasedSameDay")
          ) : (
            <span>
              <span>{t("offerDetail.releaseDate.releasedOnPc")} </span>
              <span>{compareDates(new Date(pcReleaseDate), new Date(releaseDate))}</span>
              <span>{t("offerDetail.releaseDate.theEgs")}</span>
            </span>
          )}
        </Tooltip>
      </TooltipTrigger>
      <TimeAgo targetDate={releaseDate} />
    </>
  );
};
