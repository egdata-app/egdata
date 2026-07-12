import i18n from "@/lib/i18n";
import { EGSIcon } from "@/components/icons/egs";
import { GiveawaysCarousel } from "@/components/modules/giveaways";
import { MobileFreebiesCarousel } from "@/components/modules/mobile-freebies";
import { SearchContainer } from "@/components/search/SearchContainer";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { httpClient } from "@/lib/http-client";
import type { GiveawayOffer } from "@/types/giveaways";
import { dehydrate, type DehydratedState, HydrationBoundary } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { mobileFreebiesQuery } from "@/queries/mobile-freebies";
import { formSchema } from "@/stores/searchStore";
import { getGiveawaysStats, GiveawaysStats } from "@/components/modules/giveaway-stats";
import { mergeFreebies } from "@/utils/merge-freebies";
import { useTranslation } from "@/lib/paraglide-react";
import { useQuery } from "@tanstack/react-query";
import { useCountry } from "@/hooks/use-country";
import { getBuyLink, getRedeemableOffers } from "@/lib/build-buy-link";
import { useLocale } from "@/hooks/use-locale";
import { DEFAULT_LOCALE } from "@/lib/supported-locales";

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
      queryClient.prefetchQuery({
        queryKey: ["giveaways"],
        queryFn: () =>
          httpClient
            .get<GiveawayOffer[]>("/free-games", {
              params: {
                country,
              },
            })
            .then(mergeFreebies)
            .catch(() => []),
      }),
      queryClient.prefetchQuery(mobileFreebiesQuery),
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
  const giveawaysQuery = useQuery({
    queryKey: ["giveaways"],
    queryFn: () =>
      httpClient
        .get<GiveawayOffer[]>("/free-games", {
          params: {
            country,
          },
        })
        .then(mergeFreebies),
    refetchInterval: 60 * 1000,
    refetchIntervalInBackground: true,
  });
  const mobileGiveawaysQuery = useQuery(mobileFreebiesQuery);
  const canSelectRedeemableOffers = giveawaysQuery.isSuccess && mobileGiveawaysQuery.isSuccess;
  const redeemableOffers = canSelectRedeemableOffers
    ? getRedeemableOffers({
        giveaways: giveawaysQuery.data,
        mobileOffers: mobileGiveawaysQuery.data,
      })
    : [];

  return (
    <div className="flex flex-col items-start justify-start h-full gap-4 p-4">
      <GiveawaysStats />
      <div className="flex w-full flex-col items-start justify-between gap-3 sm:flex-row sm:items-center sm:gap-4">
        <h2 className="text-xl font-display font-semibold">{t("freebies.headings.current")}</h2>
        <Button
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 w-fit"
          disabled={redeemableOffers.length === 0}
          onClick={() => {
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

            const popup = window.open(
              getBuyLink({
                offers: currentRedeemableOffers,
                locale: locale ?? DEFAULT_LOCALE,
              }),
              "_blank",
              "width=1000,height=700",
            );

            popup?.focus();
          }}
        >
          <EGSIcon className="w-5 h-5" />
          <span>{t("freebies.buttons.redeem")}</span>
        </Button>
      </div>
      <GiveawaysCarousel hideTitle={true} />
      <Separator orientation="horizontal" className="my-4" />
      <MobileFreebiesCarousel />
      <Separator orientation="horizontal" className="my-4" />
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
