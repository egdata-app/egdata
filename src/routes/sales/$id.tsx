import { checkCountryCode } from "@/lib/check-country";
import { getImage } from "@/lib/get-image";
import { httpClient } from "@/lib/http-client";
import type { SingleOffer } from "@/types/single-offer";
import { dehydrate, type DehydratedState, HydrationBoundary } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { zodSearchValidator } from "@tanstack/router-zod-adapter";
import { SearchContainer } from "@/components/search/SearchContainer";
import { formSchema } from "@/stores/searchStore";

export const Route = createFileRoute("/sales/$id")({
  component: () => {
    const { dehydratedState } = Route.useLoaderData() as {
      dehydratedState: DehydratedState;
      cover: Pick<SingleOffer, "_id" | "id" | "namespace" | "title" | "keyImages"> | null;
      id: string;
      promotion: {
        elements: SingleOffer[];
        title: string;
        start: number;
        page: number;
        count: number;
      } | null;
    };

    return (
      <HydrationBoundary state={dehydratedState}>
        <SalesPage />
      </HydrationBoundary>
    );
  },

  beforeLoad: async () => {},

  loader: async ({ params, context }) => {
    const { queryClient, country } = context;
    const { id } = params;

    if (!checkCountryCode(country ?? "US")) {
      console.warn(`Invalid country code: ${country}`);
      throw redirect({
        to: `/sales/${id}`,
        search: {
          country: "US",
          page: 1,
        },
        code: 302,
      });
    }

    const [coverData, promotionData] = await Promise.allSettled([
      queryClient.fetchQuery({
        queryKey: ["promotion-cover", { id }],
        queryFn: () =>
          httpClient
            .get<Pick<SingleOffer, "_id" | "id" | "namespace" | "title" | "keyImages">>(
              `/promotions/${id}/cover`,
            )
            .catch(() => null),
      }),
      queryClient.fetchQuery({
        queryKey: ["promotion-meta", { id, country }],
        queryFn: () =>
          httpClient
            .get<{
              elements: SingleOffer[];
              title: string;
              start: number;
              page: number;
              count: number;
            }>(`/promotions/${id}`, {
              params: {
                country,
                page: 1,
                limit: 1,
              },
            })
            .catch(() => null),
      }),
    ]);

    const cover = coverData.status === "fulfilled" ? coverData.value : null;
    const promotion = promotionData.status === "fulfilled" ? promotionData.value : null;

    return {
      cover,
      id,
      promotion,
      dehydratedState: dehydrate(queryClient),
    };
  },

  validateSearch: zodSearchValidator(formSchema),

  head: (ctx) => {
    if (!ctx.loaderData) {
      return {
        meta: [
          {
            title: "Promotion not found",
            description: "Promotion not found",
          },
        ],
      };
    }

    const { promotion } = ctx.loaderData;

    if (!promotion)
      return {
        meta: [
          {
            title: "Promotion not found",
            description: "Promotion not found",
          },
        ],
      };

    return {
      meta: [
        {
          title: `${promotion.title} | egdata.app`,
        },
        {
          name: "description",
          content: `Check out ${promotion.title} from the Epic Games Store.`,
        },
        {
          name: "og:title",
          content: `${promotion.title} | egdata.app`,
        },
        {
          name: "og:description",
          content: `Check out ${promotion.title} from the Epic Games Store.`,
        },
        {
          property: "twitter:title",
          content: `${promotion.title} | egdata.app`,
        },
        {
          property: "twitter:description",
          content: `Check out ${promotion.title} from the Epic Games Store.`,
        },
        {
          name: "og:image",
          content:
            getImage(ctx.loaderData.cover?.keyImages ?? [], [
              "OfferImageWide",
              "DieselGameBoxWide",
              "DieselStoreFrontWide",
            ])?.url ?? "/placeholder.webp",
        },
        {
          name: "og:type",
          content: "website",
        },
        {
          name: "twitter:image",
          content:
            getImage(ctx.loaderData.cover?.keyImages ?? [], [
              "OfferImageWide",
              "DieselGameBoxWide",
              "DieselStoreFrontWide",
            ])?.url ?? "/placeholder.webp",
        },
      ],
    };
  },
});

function SalesPage() {
  const { cover, id, promotion } = Route.useLoaderData() as {
    dehydratedState: DehydratedState;
    cover: Pick<SingleOffer, "_id" | "id" | "namespace" | "title" | "keyImages"> | null;
    id: string;
    promotion: {
      elements: SingleOffer[];
      title: string;
      start: number;
      page: number;
      count: number;
    } | null;
  };
  const navigate = Route.useNavigate();
  const search = Route.useSearch();

  if (!promotion) {
    return <div>Loading...</div>;
  }

  return (
    <main className="mx-auto">
      <div
        className="relative flex h-72 items-center overflow-hidden rounded-2xl bg-cover bg-center md:h-96"
        style={{
          backgroundImage: `url(${
            getImage(cover?.keyImages ?? [], [
              "OfferImageWide",
              "featuredMedia",
              "DieselGameBoxWide",
              "DieselStoreFrontWide",
            ])?.url ?? "/placeholder.webp"
          })`,
        }}
      >
        <div className="flex h-full w-full flex-col items-start justify-center bg-gradient-to-r from-black/80 to-black/30 p-5 text-foreground md:p-8">
          <h1 className="text-3xl font-bold leading-tight md:text-5xl">{promotion.title}</h1>
          <p className="mt-4 text-lg">{promotion.count} offers available in this event</p>
        </div>
      </div>

      <section className="mt-16">
        <SearchContainer
          contextId={`promotion-${id}`}
          fixedParams={{
            tags: [id],
          }}
          title={`${promotion.title} Offers`}
          initialSearch={search}
          onSearchChange={(search) => {
            navigate({
              search: {
                ...search,
                tags: search.tags ? search.tags.filter((tag) => tag === id) : undefined,
              },
            });
          }}
        />
      </section>
    </main>
  );
}
