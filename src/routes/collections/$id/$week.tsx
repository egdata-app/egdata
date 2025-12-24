import { getQueryClient } from "@/lib/client";
import { getFetchedQuery } from "@/lib/get-fetched-query";
import { type Collections, getCollection } from "@/queries/collection";
import { dehydrate } from "@tanstack/react-query";
import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/collections/$id/$week")({
  component: RouteComponent,

  // @ts-expect-error - loader return type
  beforeLoad: async ({ params, context }) => {
    const { id, week } = params;
    const { queryClient, country } = context;

    await queryClient.prefetchInfiniteQuery({
      queryKey: [
        "collection",
        {
          id,
          country,
          limit: 20,
          week,
        },
      ],
      queryFn: ({ pageParam }) =>
        getCollection({
          slug: id,
          limit: 20,
          page: pageParam as number,
          country: country ?? "US",
          week,
        }),
      initialPageParam: 1,
      getNextPageParam: (lastPage: Collections, allPages: Collections[]) => {
        if (lastPage.page * lastPage.limit + 20 > lastPage.total) {
          return undefined;
        }

        return allPages?.length + 1;
      },
    });

    return {
      id,
      dehydratedState: dehydrate(queryClient),
      country,
    };
  },

  head: (ctx) => {
    const { params, match } = ctx;
    const queryClient = getQueryClient();

    const collectionPages = getFetchedQuery<{
      pages: Collections[];
    }>(queryClient, match.context.dehydratedState, [
      "collection",
      {
        id: params.id,
        country: match.context.country,
        limit: 20,
        week: params.week,
      },
    ]);

    const collection = collectionPages?.pages[0];

    if (!collection) {
      return {
        meta: [
          {
            title: "Collection not found",
            description: "Collection not found",
          },
        ],
      };
    }

    return {
      meta: [
        {
          title: `${collection.title} | egdata.app`,
        },
        {
          name: "description",
          content: `Check out the ${collection.title} from the Epic Games Store.`,
        },
        {
          name: "og:title",
          content: `${collection.title} | egdata.app`,
        },
        {
          name: "og:description",
          content: `Check out the ${collection.title} from the Epic Games Store.`,
        },
        {
          property: "twitter:title",
          content: `${collection.title} | egdata.app`,
        },
        {
          property: "twitter:description",
          content: `Check out the ${collection.title} from the Epic Games Store.`,
        },
        {
          name: "og:image",
          content: `https://api.egdata.app/collections/${params.id}/${params.week}/og?direct=true&country=${match.context.country}`,
        },
        {
          name: "og:type",
          content: "website",
        },
        {
          property: "twitter:card",
          content: "summary_large_image",
        },
        {
          property: "twitter:image",
          content: `https://api.egdata.app/collections/${params.id}/${params.week}/og?direct=true&country=${match.context.country}`,
        },
        {
          property: "twitter:site",
          content: "@EpicGamesData",
        },
        {
          property: "twitter:creator",
          content: "@EpicGamesData",
        },
      ],
    };
  },
});

function RouteComponent() {
  return <Outlet />;
}
