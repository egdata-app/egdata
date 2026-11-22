import i18n from "@/lib/i18n";
import buildImageUrl from "@/lib/build-image-url";
import { getImage } from "@/lib/get-image";
import { useTranslation } from "@/lib/paraglide-react";
import { cn } from "@/lib/utils";
import { activeSalesQueryOptions, type ActiveSale } from "@/queries/active-sales";
import {
  dehydrate,
  type DehydratedState,
  HydrationBoundary,
  useQuery,
} from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@/components/app/localized-link";

export const Route = createFileRoute("/{-$locale}/sales/")({
  component: () => {
    const { dehydratedState } = Route.useLoaderData() as {
      dehydratedState: DehydratedState;
    };

    return (
      <HydrationBoundary state={dehydratedState}>
        <SalesPageIndex />
      </HydrationBoundary>
    );
  },

  loader: async ({ context }) => {
    const { queryClient } = context;

    await queryClient.prefetchQuery(activeSalesQueryOptions());

    return {
      dehydratedState: dehydrate(queryClient),
    };
  },

  head: () => {
    return {
      meta: [
        {
          title: i18n.t("sales.metaIndex.title"),
        },
        {
          name: "description",
          content: i18n.t("sales.metaIndex.description"),
        },
        {
          name: "og:title",
          content: i18n.t("sales.metaIndex.title"),
        },
        {
          name: "og:description",
          content: i18n.t("sales.metaIndex.description"),
        },
        {
          property: "twitter:title",
          content: i18n.t("sales.metaIndex.title"),
        },
        {
          property: "twitter:description",
          content: i18n.t("sales.metaIndex.description"),
        },
      ],
    };
  },
});

function SalesPageIndex() {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery(activeSalesQueryOptions());

  if (isLoading) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6">
        <p className="rounded-xl bg-card/80 p-6 text-sm text-muted-foreground ring-1 ring-white/10">
          {t("sales.status.loading")}
        </p>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6">
        <p className="rounded-xl bg-card/80 p-6 text-sm text-muted-foreground ring-1 ring-white/10">
          {t("sales.status.noData")}
        </p>
      </main>
    );
  }

  const activeSales = data.filter((sale) => sale.active);
  const pastSales = data.filter((sale) => !sale.active);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-10 px-4 py-6 sm:px-6">
      <section className="flex w-full flex-col gap-6">
        <header className="flex items-baseline justify-between gap-4 border-b border-border/60 pb-4">
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {t("sales.headings.active")}
          </h1>
          <span className="text-sm font-medium text-muted-foreground tabular-nums">
            {activeSales.length}
          </span>
        </header>
        <div className="grid w-full grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {activeSales.map((sale) => (
            <SaleCard key={sale.id} sale={sale} />
          ))}
        </div>
      </section>

      <section className="flex w-full flex-col gap-6">
        <header className="flex items-baseline justify-between gap-4 border-b border-border/60 pb-4">
          <h2 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {t("sales.headings.pastUpcoming")}
          </h2>
          <span className="text-sm font-medium text-muted-foreground tabular-nums">
            {pastSales.length}
          </span>
        </header>
        <div className="grid w-full grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {pastSales.map((sale) => (
            <SaleCard key={sale.id} sale={sale} />
          ))}
        </div>
      </section>
    </main>
  );
}

function SaleCard({ sale }: { sale: ActiveSale }) {
  return (
    <Link
      to="/{-$locale}/sales/$id"
      params={{ id: sale.id }}
      className="genre-card group relative flex h-[300px] w-full flex-col justify-end overflow-hidden rounded-xl border border-white/10 bg-card/80 text-foreground shadow-sm transition-[box-shadow,border-color,background-color] duration-200 ease-out hover:bg-card hover:border-primary/60 hover:shadow-lg hover:shadow-black/35 focus-visible:outline-none focus-visible:border-ring"
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {sale.offers.slice(0, 3).map((offer, index) => (
          <img
            key={offer.id}
            src={buildImageUrl(
              getImage(offer.keyImages, [
                "DieselGameBoxTall",
                "DieselStoreFrontTall",
                "OfferImageTall",
              ])?.url ?? "/placeholder.webp",
              300,
              "medium",
            )}
            alt={offer.title}
            loading="lazy"
            decoding="async"
            className={cn(
              "absolute rounded-lg object-cover antialiased ring-1 ring-white/10",
              index === 0 &&
                "left-1/2 top-3 z-[9] h-60 w-44 -translate-x-1/2 shadow-2xl ring-white/15 transition-transform duration-300 ease-out group-hover:scale-[1.03]",
              index === 1 &&
                "left-4 top-5 z-0 h-56 w-40 -rotate-3 opacity-45 shadow-md transition-[opacity,transform] duration-300 ease-out group-hover:-translate-x-1 group-hover:-rotate-6 group-hover:opacity-65",
              index === 2 &&
                "right-4 top-5 z-0 h-56 w-40 rotate-3 opacity-45 shadow-md transition-[opacity,transform] duration-300 ease-out group-hover:translate-x-1 group-hover:rotate-6 group-hover:opacity-65",
            )}
          />
        ))}
      </div>
      <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-t from-background via-background/75 via-35% to-transparent" />
      <div className="relative z-20 px-4 pb-3.5 pt-8">
        <h3 className="truncate text-center font-display text-lg font-semibold tracking-tight text-foreground transition-colors duration-200 group-hover:text-primary">
          {sale.name}
        </h3>
      </div>
    </Link>
  );
}
