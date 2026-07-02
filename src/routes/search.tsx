import { createFileRoute } from "@tanstack/react-router";
import { zodSearchValidator } from "@tanstack/router-zod-adapter";
import { httpClient } from "@/lib/http-client";
import { formSchema } from "@/stores/searchStore";
import { SearchContainer } from "@/components/search/SearchContainer";
import i18n from "@/lib/i18n";

export const Route = createFileRoute("/search")({
  component: RouteComponent,

  loader: async (ctx) => {
    const { context } = ctx;
    const { country, queryClient } = context;

    // Only prefetch tags on initial load - SearchContainer handles search results client-side
    await queryClient.ensureQueryData({
      queryKey: ["all-tags"],
      queryFn: () => httpClient.get("/search/tags?raw=true").catch(() => null),
    });

    return {
      country,
    };
  },

  validateSearch: zodSearchValidator(formSchema),

  head() {
    return {
      meta: [
        {
          title: i18n.t("search.meta.title"),
        },
        {
          name: "description",
          content: i18n.t("search.meta.description"),
        },
        {
          name: "og:title",
          content: i18n.t("search.meta.title"),
        },
        {
          name: "og:description",
          content: i18n.t("search.meta.description"),
        },
        {
          property: "twitter:title",
          content: i18n.t("search.meta.title"),
        },
        {
          property: "twitter:description",
          content: i18n.t("search.meta.description"),
        },
      ],
    };
  },
});

function RouteComponent() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  return (
    <SearchContainer
      contextId="search"
      initialSearch={search}
      onSearchChange={(s) => {
        navigate({
          search: s,
          resetScroll: false,
        });
      }}
    />
  );
}
