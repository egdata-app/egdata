import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useCountry } from "@/hooks/use-country";
import { getImage } from "@/lib/get-image";
import { cn } from "@/lib/utils";
import { getCollection } from "@/queries/collection";
import { dehydrate, HydrationBoundary, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

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

export const Route = createFileRoute("/collections/")({
  component: () => {
    const { dehydratedState } = Route.useLoaderData();

    return (
      <HydrationBoundary state={dehydratedState}>
        <CollectionsOverview />
      </HydrationBoundary>
    );
  },

  loader: async ({ context }) => {
    const { queryClient, country } = context;

    await Promise.all(
      collections.map((collection) =>
        queryClient.prefetchQuery({
          queryKey: ["collection", { slug: collection.slug, limit: 5, page: 1 }],
          queryFn: () =>
            getCollection({
              slug: collection.slug,
              limit: 5,
              page: 1,
              country,
            }),
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
          title: "Collections | egdata.app",
          description: "Collections on egdata.app",
        },
        {
          name: "og:title",
          content: "Collections | egdata.app",
        },
        {
          name: "og:description",
          content: "Collections on egdata.app",
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
          content: "Collections | egdata.app",
        },
        {
          name: "twitter:description",
          content: "Collections on egdata.app",
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
  return (
    <main className="flex flex-col items-start justify-start h-full gap-1 px-4 w-full">
      <h1 className="text-4xl font-semibold">Collections</h1>
      <h2 className="text-xl font-thin">
        The top sellers, most played, and most popular games on the Epic Games Store
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 w-full">
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
    return <Skeleton className="w-full h-40" />;
  }

  if (!collectionData) {
    return (
      <Link to={`/collections/${collection.slug}`} className="w-full">
        <Card
          key={collection.slug}
          className="flex flex-col gap-4 w-full relative overflow-hidden rounded-xl"
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-xl font-semibold inline-flex items-center gap-2">
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

  return (
    <Link to={`/collections/${collection.slug}`}>
      <Card
        key={collection.slug}
        className="flex flex-col gap-4 relative rounded-xl overflow-hidden"
      >
        <div
          className="absolute inset-0 bg-gradient-to-b from-card/90 via-card/95 to-card rounded-xl"
          style={{
            backgroundImage: `url(${getImage(collectionData.elements[0]?.keyImages ?? [], ["DieselGameBoxWide", "DieselStoreFrontWide", "Featured", "OfferImageWide"])?.url ?? "/placeholder.webp"})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-bl from-card/50 via-card/90 to-card rounded-xl" />

        <div className="relative p-4">
          <CardHeader className="flex flex-col items-start justify-between space-y-0 pb-2">
            <h3 className="text-xl font-semibold inline-flex items-center gap-2">
              {collection.title}
            </h3>
            <p className="text-sm text-muted-foreground">{collection.description}</p>
          </CardHeader>
          <CardContent className="text-sm flex flex-col gap-4">
            {collectionData.elements.map((game) => (
              <div key={game.id} className="flex flex-col gap-2 items-start justify-start">
                <div className="flex flex-row gap-2 items-center justify-start">
                  <span className={cn("text-xs", game.position === 1 && "text-xl font-bold")}>
                    {game.position}
                  </span>
                  <h3
                    className={cn(
                      "text-sm font-semibold text-muted-foreground",
                      game.position === 1 && "text-2xl font-bold text-white",
                    )}
                  >
                    {game.title}
                  </h3>
                </div>
                <Separator
                  orientation="horizontal"
                  className={cn("my-0", game.position === 1 && "my-2 bg-badge")}
                />
              </div>
            ))}
          </CardContent>
        </div>
      </Card>
    </Link>
  );
}
