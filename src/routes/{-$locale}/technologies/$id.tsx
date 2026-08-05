import { useEffect, useMemo } from "react";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { zodSearchValidator } from "@tanstack/router-zod-adapter";
import { SearchContainer } from "@/components/search/SearchContainer";
import {
  formatTechnologyKey,
  TechnologyProfileHeader,
} from "@/components/technology/TechnologyProfileHeader";
import i18n from "@/lib/i18n";
import { useTranslation } from "@/lib/paraglide-react";
import { technologyProfileQueryOptions } from "@/queries/technology-profile";
import { formSchema } from "@/stores/searchStore";

export const Route = createFileRoute("/{-$locale}/technologies/$id")({
  component: TechnologyRoute,
  validateSearch: zodSearchValidator(formSchema),
  headers: () => ({
    "Cache-Control": "public, s-maxage=60, stale-while-revalidate=600",
  }),
  loader: async ({ context, params }) => {
    const technology = await context.queryClient
      .fetchQuery(technologyProfileQueryOptions(params.id))
      .catch(() => null);

    return {
      id: params.id,
      technology,
      dehydratedState: dehydrate(context.queryClient),
    };
  },
  head: ({ params, loaderData }) => {
    const fallbackName = formatTechnologyKey(params.id);
    const name =
      loaderData?.technology?.status === "ready"
        ? loaderData.technology.profile.displayName
        : fallbackName;
    const description =
      loaderData?.technology?.status === "ready"
        ? loaderData.technology.profile.summary
        : i18n.t("technologies.meta.description", { name });
    const title = i18n.t("technologies.meta.title", { name });

    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
      ],
    };
  },
});

function TechnologyRoute() {
  const { dehydratedState } = Route.useLoaderData();
  return (
    <HydrationBoundary state={dehydratedState}>
      <TechnologyPage />
    </HydrationBoundary>
  );
}

function TechnologyPage() {
  const { t } = useTranslation();
  const { id } = Route.useParams();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const fallbackName = formatTechnologyKey(id);
  const initialSearch = useMemo(
    () => ({
      ...search,
      technologies: undefined,
    }),
    [search],
  );

  useEffect(() => {
    if (search.technologies === undefined) return;

    navigate({
      to: "/{-$locale}/technologies/$id",
      params: { id },
      search: initialSearch,
      replace: true,
      resetScroll: false,
    });
  }, [id, initialSearch, navigate, search.technologies]);

  return (
    <div className="flex min-h-[85vh] w-full flex-col gap-8 py-4">
      <TechnologyProfileHeader id={id} />

      <section>
        <SearchContainer
          contextId={`technology-${id}`}
          fixedParams={{ technologies: [id] }}
          controls={{ showTechnologies: false }}
          title={t("technologies.matchingGames", { name: fallbackName })}
          initialSearch={initialSearch}
          onSearchChange={(nextSearch) => {
            navigate({
              to: "/{-$locale}/technologies/$id",
              params: { id },
              search: {
                ...nextSearch,
                technologies: undefined,
              },
              resetScroll: false,
            });
          }}
        />
      </section>
    </div>
  );
}
