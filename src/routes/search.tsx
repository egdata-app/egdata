import { createFileRoute } from "@tanstack/react-router";
import { zodSearchValidator } from "@tanstack/router-zod-adapter";
import { httpClient } from "@/lib/http-client";
import { DEFAULT_LIMIT, formSchema } from "@/stores/searchStore";
import { SearchContainer } from "@/components/search/SearchContainer";

export const Route = createFileRoute("/search")({
  component: () => {
    const search = Route.useSearch();
    const navigate = Route.useNavigate();

    return (
      <SearchContainer
        contextId="search"
        initialSearch={search}
        onSearchChange={(s) => {
          navigate({
            search: s,
          });
        }}
      />
    );
  },

  loader: async (ctx) => {
    const { context, deps } = ctx;
    const search = deps.searchParams;

    const { country, queryClient } = context;
    const { page = 1, limit = DEFAULT_LIMIT } = search ?? {};
    const [tagsData] = await Promise.all([
      queryClient.ensureQueryData({
        queryKey: ["all-tags"],
        queryFn: () => httpClient.get("/search/tags?raw=true"),
      }),
      queryClient.ensureQueryData({
        queryKey: ["search", "search", search],
        queryFn: () => httpClient.post(`/search/v2/search?country=${country}`, search),
      }),
    ]);
    const tags = tagsData;
    return {
      tags,
      country,
      page,
      limit,
    };
  },

  validateSearch: zodSearchValidator(formSchema),

  loaderDeps(opts) {
    return {
      searchParams: opts.search,
    };
  },

  head() {
    return {
      meta: [
        {
          title: "Search | egdata.app",
        },
        {
          name: "description",
          content: "Search for offers from the Epic Games Store.",
        },
        {
          name: "og:title",
          content: "Search | egdata.app",
        },
        {
          name: "og:description",
          content: "Search for offers from the Epic Games Store.",
        },
        {
          property: "twitter:title",
          content: "Search | egdata.app",
        },
        {
          property: "twitter:description",
          content: "Search for offers from the Epic Games Store.",
        },
      ],
    };
  },
});
