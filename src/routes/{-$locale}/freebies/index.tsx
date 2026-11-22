import i18n from "@/lib/i18n";
import { EGSIcon } from "@/components/icons/egs";
import { GiveawaysCarousel } from "@/components/modules/giveaways";
import { MobileFreebiesCarousel } from "@/components/modules/mobile-freebies";
import { SearchContainer } from "@/components/search/SearchContainer";
import { Button } from "@/components/ui/button";
import { Dialog, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { httpClient } from "@/lib/http-client";
import {
  giveawaysQueryOptions,
  mobileGiveawaysQueryOptions,
  type GiveawayCardBase,
} from "@/queries/giveaways";
import { dehydrate, type DehydratedState, HydrationBoundary } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { formSchema } from "@/stores/searchStore";
import { getGiveawaysStats, GiveawaysStats } from "@/components/modules/giveaway-stats";
import { useTranslation } from "@/lib/paraglide-react";
import { useQuery } from "@tanstack/react-query";
import { useCountry } from "@/hooks/use-country";
import { getBuyLink, getRedeemableOffers } from "@/lib/build-buy-link";
import { useLocale } from "@/hooks/use-locale";
import { DEFAULT_LOCALE } from "@/lib/supported-locales";
import { useState } from "react";
import buildImageUrl from "@/lib/build-image-url";
import { getImage } from "@/lib/get-image";
import { RenderTextPlatformIcon } from "@/components/app/platform-icons";

export const Route = createFileRoute("/{-$locale}/freebies/")({
  component: () => {
    const { dehydratedState } = Route.useLoaderData() as {
      dehydratedState: DehydratedState;
      og: string;
    };
    return (
      <HydrationBoundary state={dehydratedState}>
        <FreeGames />
      </HydrationBoundary>
    );
  },

  headers: () => ({
    "Cache-Control": "public, s-maxage=60, stale-while-revalidate=600",
  }),

  validateSearch: (search) => formSchema.parse(search),

  beforeLoad: async () => {},

  loader: async ({ context }) => {
    const { country, queryClient } = context;

    await Promise.allSettled([
      queryClient.prefetchQuery({
        queryKey: ["giveaways-stats", { country }],
        queryFn: () => getGiveawaysStats({ country: country ?? "US" }).catch(() => null),
      }),
      queryClient.prefetchQuery(giveawaysQueryOptions(country ?? "US")),
      queryClient.prefetchQuery(mobileGiveawaysQueryOptions()),
    ]);

    const ogId = await httpClient.get<{ id: string }>("/free-games/og").catch(() => ({ id: "" }));

    return {
      dehydratedState: dehydrate(queryClient),
      og: ogId.id,
    };
  },

  head: (ctx) => {
    const { loaderData } = ctx;

    const ogImage =
      "https://cdn.egdata.app/cdn-cgi/imagedelivery/<ACCOUNT_HASH>/<IMAGE_ID>/<VARIANT_NAME>"
        .replace("<ACCOUNT_HASH>", "RlN2EBAhhGSZh5aeUaPz3Q")
        .replace("<IMAGE_ID>", String(loaderData?.og ?? ""))
        .replace("<VARIANT_NAME>", "og");

    return {
      meta: [
        {
          title: i18n.t("freebies.meta.title"),
        },
        {
          name: "description",
          content: i18n.t("freebies.meta.description"),
        },
        {
          name: "og:title",
          content: i18n.t("freebies.meta.title"),
        },
        {
          name: "og:description",
          content: i18n.t("freebies.meta.description"),
        },
        {
          property: "twitter:title",
          content: i18n.t("freebies.meta.title"),
        },
        {
          property: "twitter:description",
          content: i18n.t("freebies.meta.description"),
        },
        {
          property: "og:image",
          content: ogImage,
        },
        {
          property: "og:image:alt",
          content: i18n.t("freebies.meta.title"),
        },
        {
          property: "og:type",
          content: "website",
        },
        {
          property: "twitter:card",
          content: "summary_large_image",
        },
        {
          property: "twitter:image",
          content: ogImage,
        },
      ],
    };
  },
});

function FreeGames() {
  const { t } = useTranslation();
  const { country } = useCountry();
  const { locale } = useLocale();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [isRedeemDialogOpen, setIsRedeemDialogOpen] = useState(false);
  const [redeemOptions, setRedeemOptions] = useState<GiveawayCardBase[]>([]);
  const giveawaysQuery = useQuery({
    ...giveawaysQueryOptions(country),
    refetchInterval: 60 * 1000,
    refetchIntervalInBackground: true,
  });
  const mobileGiveawaysQuery = useQuery(mobileGiveawaysQueryOptions());
  const canSelectRedeemableOffers = giveawaysQuery.isSuccess && mobileGiveawaysQuery.isSuccess;
  const redeemableOffers = canSelectRedeemableOffers
    ? getRedeemableOffers({
        giveaways: giveawaysQuery.data,
        mobileOffers: mobileGiveawaysQuery.data,
      })
    : [];

  const openRedeemPopup = (offer: GiveawayCardBase) => {
    const popup = window.open(
      getBuyLink({
        offers: [offer],
        locale: locale ?? DEFAULT_LOCALE,
      }),
      "_blank",
      "width=1000,height=700",
    );

    popup?.focus();
  };

  return (
    <div className="mx-auto flex h-full w-full max-w-7xl flex-col items-start justify-start gap-8 px-4 py-6 sm:px-6">
      <div className="w-full border-b border-border/60 pb-6">
        <GiveawaysStats />
      </div>
      <section className="flex w-full flex-col gap-5">
        <header className="flex w-full flex-col items-start justify-between gap-3 border-b border-border/60 pb-4 sm:flex-row sm:items-center sm:gap-4">
          <h2 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {t("freebies.headings.current")}
          </h2>
          <Button
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex w-fit items-center gap-2 shadow-sm transition-[box-shadow,background-color,border-color] duration-200 ease-out hover:shadow-md hover:shadow-primary/20"
            isDisabled={redeemableOffers.length === 0}
            onPress={() => {
              if (!canSelectRedeemableOffers) {
                return;
              }

              const currentRedeemableOffers = getRedeemableOffers({
                giveaways: giveawaysQuery.data,
                mobileOffers: mobileGiveawaysQuery.data,
              });

              if (currentRedeemableOffers.length === 0) {
                return;
              }

              if (currentRedeemableOffers.length === 1) {
                openRedeemPopup(currentRedeemableOffers[0]);
                return;
              }

              setRedeemOptions(currentRedeemableOffers);
              setIsRedeemDialogOpen(true);
            }}
          >
            <EGSIcon className="w-5 h-5" />
            <span>{t("freebies.buttons.redeem")}</span>
          </Button>
          <Dialog
            isOpen={isRedeemDialogOpen}
            onOpenChange={setIsRedeemDialogOpen}
            className="sm:max-w-xl"
          >
            <DialogHeader>
              <DialogTitle>{t("freebies.redeemDialog.title")}</DialogTitle>
              <DialogDescription>{t("freebies.redeemDialog.description")}</DialogDescription>
            </DialogHeader>
            <div className="max-h-[min(65vh,32rem)] space-y-2.5 overflow-y-auto pr-1">
              {redeemOptions.map((offer) => {
                const platforms = [
                  ...new Set(
                    (offer.items ?? []).flatMap((item) =>
                      (item.releaseInfo ?? []).flatMap((info) => info?.platform ?? []),
                    ),
                  ),
                ];

                return (
                  <button
                    key={`${offer.namespace}:${offer.id}`}
                    type="button"
                    data-testid="redeem-offer-option"
                    className="group flex w-full items-center gap-3.5 rounded-xl border border-white/10 bg-card/80 p-3 text-left shadow-sm transition-[box-shadow,border-color,background-color] duration-200 ease-out hover:bg-card hover:border-primary/60 hover:shadow-lg hover:shadow-black/35 focus-visible:border-ring focus-visible:outline-none"
                    onClick={() => {
                      setIsRedeemDialogOpen(false);
                      openRedeemPopup(offer);
                    }}
                  >
                    <span className="h-16 w-12 shrink-0 overflow-hidden rounded-md ring-1 ring-white/10">
                      <img
                        src={buildImageUrl(
                          getImage(offer.keyImages, ["DieselGameBoxTall", "OfferImageTall"])?.url ??
                            "/placeholder.webp",
                          96,
                          "low",
                        )}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03]"
                      />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-display font-medium text-foreground transition-colors duration-200 group-hover:text-primary">
                        {offer.title}
                      </span>
                      <span className="mt-1 flex flex-wrap gap-1">
                        {platforms.map((platform) =>
                          RenderTextPlatformIcon({
                            platform,
                            className: "size-6 rounded-full bg-muted p-1",
                            key: `${platform}-${offer.namespace}-${offer.id}`,
                          }),
                        )}
                      </span>
                    </span>
                    <span className="text-primary shrink-0 text-sm font-medium transition-transform duration-200 group-hover:translate-x-0.5">
                      {t("freebies.buttons.redeem")}
                    </span>
                  </button>
                );
              })}
            </div>
          </Dialog>
        </header>
        <GiveawaysCarousel hideTitle={true} />
      </section>
      <Separator orientation="horizontal" className="bg-border/60" />
      <MobileFreebiesCarousel />
      <Separator orientation="horizontal" className="bg-border/60" />
      <SearchContainer
        contextId="freebies"
        initialSearch={search}
        fixedParams={{ pastGiveaways: true, sortBy: "giveawayDate" }}
        onSearchChange={(s) => {
          navigate({
            search: s,
            resetScroll: false,
          });
        }}
        title={t("freebies.headings.past")}
        controls={{
          showPastGiveaways: false,
        }}
      />
    </div>
  );
}
