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
      queryFn: () => httpClient.get<GenreResponse[]>("/offers/genres").catch(() => []),
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
    queryFn: () => httpClient.get<GenreResponse[]>("/offers/genres"),
  });

  if (!genres) {
    return null;
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen py-2">
      <h1 className="text-2xl font-bold">{t("genres.heading")}</h1>
      <hr className="w-1/2 bg-muted my-4" />
      <div className="flex flex-wrap justify-center">
        {genres
          .filter((genre) => genre.genre?.id)
          .map((genre) => (
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
      className="genre-card relative w-72 h-[300px] mx-auto text-foreground overflow-hidden rounded-lg shadow-lg m-4 bg-muted/40 hover:bg-muted/60 transition group"
    >
      <div className="title absolute bottom-2 w-full text-center font-light text-xl z-10 truncate max-w-full mx-2">
        {genre.genre.name}
      </div>
      <span className="absolute top-0 left-0 w-full h-full backdrop-blur-[1px] bg-black/10 z-[5] group-hover:opacity-0 transition duration-300 ease-in-out" />
      {genre.offers.map((offer, index) => (
        <img
          key={offer.id}
          src={offer.image.url}
          alt={offer.title}
          className={cn(
            "absolute w-40 h-56 object-cover rounded shadow-2xl antialiased",
            index === 1 && "left-2 z-0 opacity-35 backdrop-filter backdrop-blur-lg top-4",
            index === 0 &&
              "left-1/2 transform -translate-x-1/2 z-[9] w-44 h-60 top-2 group-hover:scale-[1.03] transition duration-200 ease-in-out",
            index === 2 && "right-2 z-0 opacity-35 backdrop-filter backdrop-blur-lg top-4",
          )}
        />
      ))}
    </Link>
  );
}
