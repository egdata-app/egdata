import { useQuery } from "@tanstack/react-query";
import { httpClient } from "@/lib/http-client";

export const useRegions = () => {
  const { data } = useQuery({
    queryKey: ["regions"],
    queryFn: () =>
      httpClient.get<
        Record<
          string,
          {
            currencyCode: string;
            description: string;
            countries: string[];
          }
        >
      >("/regions"),
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
  });

  return {
    regions: data,
  };
};
