import { httpClient } from "@/lib/http-client";
import { cn } from "@/lib/utils";
import {
  dehydrate,
  type DehydratedState,
  HydrationBoundary,
  useQuery,
} from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@/components/app/localized-link";
import { useTranslation } from "@/lib/paraglide-react";
import i18n from "@/lib/i18n";

export interface GenreResponse {
  genre: Genre;
  offers: Offer[];
}

export interface Genre {
  id: string;
  name: string;
  aliases: string[];
}

export interface Offer {
  id: string;
  title: string;
  image: Image;
}

export interface Image {
  type: string;
  url: string;
  md5: string;
}

export const Route = createFileRoute("/{-$locale}/genres")({
  component: () => {
    const { dehydratedState } = Route.useLoaderData() as {
      dehydratedState: DehydratedState;
    };

    return (
      <HydrationBoundary state={dehydratedState}>
        <GenresPage />
      </HydrationBoundary>
    );
  },

  head: () => {
    return {
      meta: [
        {
          title: i18n.t("genres.meta.title"),
          description: i18n.t("genres.meta.description"),
        },
      ],
    };
  },

  loader: async ({ context }) => {
    const { queryClient } = context;

    await queryClient.prefetchQuery({
      queryKey: ["genres-list"],
      queryFn: () => httpClient.v1Get<GenreResponse[]>("/offers/genres").catch(() => []),
    });

    return {
      dehydratedState: dehydrate(queryClient),
    };
  },
});

function GenresPage() {
  const { t } = useTranslation();
  const { data: genres } = useQuery({
    queryKey: ["genres-list"],
    queryFn: () => httpClient.v1Get<GenreResponse[]>("/offers/genres"),
  });

  if (!genres) {
    return null;
  }

  const validGenres = genres.filter((genre) => genre.genre?.id);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6">
      <header className="flex items-baseline justify-between gap-4 border-b border-border/60 pb-4">
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {t("genres.heading")}
        </h1>
        <span className="text-sm font-medium text-muted-foreground tabular-nums">
          {validGenres.length}
        </span>
      </header>
      <div className="grid w-full grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {validGenres.map((genre) => (
          <GenreCard key={genre.genre?.id} genre={genre} />
        ))}
      </div>
    </main>
  );
}

function GenreCard({ genre }: { genre: GenreResponse }) {
  return (
    <Link
      to={"/{-$locale}/search"}
      search={{ tags: [genre.genre.id], sortBy: "releaseDate" }}
      className="genre-card group relative flex h-[300px] w-full flex-col justify-end overflow-hidden rounded-xl border border-white/10 bg-card/80 text-foreground shadow-sm transition-[box-shadow,border-color,background-color] duration-200 ease-out hover:bg-card hover:border-primary/60 hover:shadow-lg hover:shadow-black/35 focus-visible:outline-none focus-visible:border-ring"
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {genre.offers.slice(0, 3).map((offer, index) => (
          <img
            key={offer.id}
            src={offer.image.url}
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
        <h2 className="truncate text-center font-display text-lg font-semibold tracking-tight text-foreground transition-colors duration-200 group-hover:text-primary">
          {genre.genre.name}
        </h2>
      </div>
    </Link>
  );
}
