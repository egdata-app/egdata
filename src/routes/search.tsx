import { createFileRoute } from "@tanstack/react-router";
import { zodSearchValidator } from "@tanstack/router-zod-adapter";
import { httpClient } from "@/lib/http-client";
import { formSchema } from "@/stores/searchStore";
import { SearchContainer } from "@/components/search/SearchContainer";

export const Route = createFileRoute("/search")({
  component: RouteComponent,

  loader: async (ctx) => {
    const { context } = ctx;
    const { country, queryClient } = context;

    // Only prefetch tags on initial load - SearchContainer handles search results client-side
    await queryClient.ensureQueryData({
      queryKey: ["all-tags"],
      queryFn: () => httpClient.get("/search/tags?raw=true"),
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
