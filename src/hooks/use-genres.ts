import { useQuery } from "@tanstack/react-query";
import { httpClient as client } from "@/lib/http-client";
import type { Tag } from "@/types/tags";

export const useGenres = () => {
  const { data } = useQuery({
    queryKey: ["genres"],
    queryFn: () => client.get<Tag[]>("/tags?group=genre").then((res) => res),
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
  });

  return {
    genres: data,
  };
};
