import { queryOptions } from "@tanstack/react-query";
import { getTechnologyProfile, TechnologyApiError } from "@/lib/technology-api-client";

export const technologyProfileQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ["technology-profile", id],
    queryFn: ({ signal }) => getTechnologyProfile(id, signal),
    staleTime: 60_000,
    retry: (failureCount, error) =>
      !(error instanceof TechnologyApiError && error.status === 404) && failureCount < 1,
  });
