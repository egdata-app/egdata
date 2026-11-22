import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCountry } from "@/hooks/use-country";
import i18n from "@/lib/i18n";
import { getImage } from "@/lib/get-image";
import { cn } from "@/lib/utils";
import { getCollection } from "@/queries/collection";
import {
  dehydrate,
  type DehydratedState,
  HydrationBoundary,
  useQuery,
} from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@/components/app/localized-link";
import { useTranslation } from "@/lib/paraglide-react";

const collections: {
  slug: string;
  title: string;
  description: string;
}[] = [
  {
    slug: "top-sellers",
    title: "Top Sellers",
    description: "Top sellers on the Epic Games Store",
  },
  {
    slug: "most-played",
    title: "Most Played",
    description: "Most played games on the Epic Games Store",
  },
  {
    slug: "top-wishlisted",
    title: "Top Wishlisted",
    description: "Top wishlisted games on the Epic Games Store",
  },
  {
    slug: "top-new-releases",
    title: "Top New Releases",
    description: "Top new releases on the Epic Games Store",
  },
  {
    slug: "most-popular",
    title: "Most Popular",
    description: "Most popular games on the Epic Games Store",
  },
  {
    slug: "top-player-reviewed",
    title: "Top Player Reviewed",
    description: "Top player reviewed games on the Epic Games Store",
  },
  {
    slug: "top-demos",
    title: "Top Demos",
    description: "Top demos on the Epic Games Store",
  },
  {
    slug: "top-free-to-play",
    title: "Top Free-to-Play",
    description: "Top free-to-play games on the Epic Games Store",
  },
  {
    slug: "top-add-ons",
    title: "Top Add-ons",
    description: "Top add-ons on the Epic Games Store",
  },
];

export const Route = createFileRoute("/{-$locale}/collections/")({
  component: () => {
    const { dehydratedState } = Route.useLoaderData() as {
      dehydratedState: DehydratedState;
    };

    return (
      <HydrationBoundary state={dehydratedState}>
        <CollectionsOverview />
      </HydrationBoundary>
    );
  },

  loader: async ({ context }) => {
    const { queryClient, country } = context;

    await Promise.allSettled(
      collections.map((collection) =>
        queryClient.prefetchQuery({
          queryKey: ["collection", { slug: collection.slug, limit: 5, page: 1 }],
          queryFn: () =>
            getCollection({
              slug: collection.slug,
              limit: 5,
              page: 1,
              country: country ?? "US",
            }).catch(() => null),
        }),
      ),
    );

    return {
      dehydratedState: dehydrate(queryClient),
    };
  },

  head: () => {
    return {
      meta: [
        {
          title: i18n.t("collections.metaIndex.title"),
          description: i18n.t("collections.metaIndex.description"),
        },
        {
          name: "og:title",
          content: i18n.t("collections.metaIndex.title"),
        },
        {
          name: "og:description",
          content: i18n.t("collections.metaIndex.description"),
        },
        {
          name: "og:image",
          content: "https://cdn.egdata.app/placeholder-1080.webp",
        },
        {
          name: "og:type",
          content: "website",
        },
        {
          name: "twitter:title",
          content: i18n.t("collections.metaIndex.title"),
        },
        {
          name: "twitter:description",
          content: i18n.t("collections.metaIndex.description"),
        },
        {
          name: "twitter:image",
          content: "https://cdn.egdata.app/placeholder-1080.webp",
        },
      ],
    };
  },
});

function CollectionsOverview() {
  const { t } = useTranslation();
  return (
    <main className="mx-auto flex h-full w-full max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6">
      <header className="flex flex-col gap-2 border-b border-border/60 pb-4">
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {t("collections.headings.main")}
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
          {t("collections.description.overview")}
        </p>
      </header>
      <div className="grid w-full grid-cols-1 gap-5 md:grid-cols-2">
        {collections.map((collection) => (
          <CollectionCard key={collection.slug} collection={collection} />
        ))}
      </div>
    </main>
  );
}

function CollectionCard({ collection }: { collection: (typeof collections)[0] }) {
  const { country } = useCountry();
  const { data: collectionData, isLoading } = useQuery({
    queryKey: ["collection", { slug: collection.slug, limit: 5, page: 1 }],
    queryFn: () =>
      getCollection({
        slug: collection.slug,
        limit: 5,
        page: 1,
        country,
      }),
  });

  if (isLoading) {
    return <Skeleton className="h-72 w-full rounded-xl bg-card/80 ring-1 ring-white/10" />;
  }

  if (!collectionData) {
    return (
      <Link
        to="/{-$locale}/collections/$id"
        params={{ id: collection.slug }}
        className="group block w-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Card
          key={collection.slug}
          className="relative flex h-full w-full flex-col gap-3 overflow-hidden rounded-xl border border-white/10 bg-card/80 shadow-sm transition-[box-shadow,border-color,background-color] duration-200 ease-out group-hover:bg-card group-hover:border-primary/60 group-hover:shadow-lg group-hover:shadow-black/35"
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="inline-flex items-center gap-2 font-display text-xl font-semibold tracking-tight text-foreground transition-colors duration-200 group-hover:text-primary">
              {collection.title}
            </h3>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p className="text-sm text-muted-foreground">{collection.description}</p>
          </CardContent>
        </Card>
      </Link>
    );
  }
  const offers = Array.isArray(collectionData.elements) ? collectionData.elements : [];
  const coverUrl =
    getImage(offers[0]?.keyImages ?? [], [
      "DieselGameBoxWide",
      "DieselStoreFrontWide",
      "Featured",
      "OfferImageWide",
    ])?.url ?? "/placeholder.webp";

  return (
    <Link
      to="/{-$locale}/collections/$id"
      params={{ id: collection.slug }}
      className="group block w-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Card
        key={collection.slug}
        className="relative flex h-full flex-col overflow-hidden rounded-xl border border-white/10 bg-card/80 shadow-sm transition-[box-shadow,border-color,background-color] duration-200 ease-out group-hover:bg-card group-hover:border-primary/60 group-hover:shadow-lg group-hover:shadow-black/35"
      >
        <img
          src={coverUrl}
          alt=""
          loading="lazy"
          decoding="async"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03]"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-card/75 via-card/90 to-card" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-background/95 via-background/70 to-transparent" />

        <div className="relative z-10 flex flex-1 flex-col p-2 sm:p-3">
          <CardHeader className="flex flex-col items-start justify-between space-y-1 pb-4">
            <h3 className="inline-flex items-center gap-2 font-display text-xl font-semibold tracking-tight text-foreground transition-colors duration-200 group-hover:text-primary">
              {collection.title}
            </h3>
            <p className="text-sm text-muted-foreground">{collection.description}</p>
          </CardHeader>
          <CardContent className="flex flex-col divide-y divide-border/50 text-sm">
            {offers.map((game) => (
              <div
                key={game.id}
                className={cn(
                  "flex items-center justify-start gap-3 py-2.5 first:pt-0 last:pb-0",
                  game.position === 1 && "pb-3.5",
                )}
              >
                <span
                  className={cn(
                    "w-6 shrink-0 text-right font-display text-xs font-semibold text-muted-foreground tabular-nums",
                    game.position === 1 && "text-xl font-bold text-primary",
                  )}
                >
                  {game.position}
                </span>
                <span
                  className={cn(
                    "min-w-0 truncate text-sm font-medium text-muted-foreground transition-colors duration-200 group-hover:text-foreground/90",
                    game.position === 1 &&
                      "font-display text-lg font-bold text-foreground sm:text-xl",
                  )}
                >
                  {game.title}
                </span>
              </div>
            ))}
          </CardContent>
        </div>
      </Card>
    </Link>
  );
}
