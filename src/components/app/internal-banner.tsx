import { ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { Link } from "@tanstack/react-router";
import { httpClient } from "@/lib/http-client";
import { internalNamespaces } from "@/lib/internal-namespaces";
import { Alert, AlertTitle, AlertDescription } from "../ui/alert";
import type { SingleOffer } from "@/types/single-offer";
import { useQuery } from "@tanstack/react-query";

export const InternalBanner: React.FC<{
  offer: SingleOffer;
}> = ({ offer }) => {
  const { namespace, title } = offer;

  const manualOfferId = offer.customAttributes?.["com.epicgames.app.offerId"]?.value;

  const productSlug = offer.customAttributes?.["com.epicgames.app.productSlug"]?.value?.replace(
    "/home",
    "",
  );

  if (!internalNamespaces.includes(namespace)) {
    return null;
  }

  const { data: results = [] } = useQuery({
    queryKey: ["autocomplete", title, manualOfferId, productSlug],
    queryFn: async () => {
      if (manualOfferId) {
        return [{ id: manualOfferId, title }];
      }

      const response = await httpClient.get<{
        elements: SingleOffer[];
        total: number;
      }>(`/autocomplete?query=${title}`);

      return response.elements
        .filter(({ namespace }) => !internalNamespaces.includes(namespace))
        .filter(({ title: t, customAttributes }) => {
          const titleSimilarity = compareTitleSimilarity(title, t);
          const targetSlug = customAttributes?.["com.epicgames.app.productSlug"]?.value?.replace(
            "/home",
            "",
          );
          const slugMatch = productSlug && targetSlug && productSlug === targetSlug;

          return titleSimilarity > 0.5 || slugMatch;
        })
        .map((e) => {
          const titleSimilarity = compareTitleSimilarity(title, e.title);
          const targetSlug = e.customAttributes?.["com.epicgames.app.productSlug"]?.value?.replace(
            "/home",
            "",
          );
          const slugMatch = productSlug && targetSlug && productSlug === targetSlug;

          return {
            id: e.id,
            title: e.title,
            similarity: slugMatch ? 1 : titleSimilarity,
            slugMatch,
          };
        })
        .sort((a, b) => {
          // First sort by slug match
          if (a.slugMatch && !b.slugMatch) return -1;
          if (!a.slugMatch && b.slugMatch) return 1;
          // Then by similarity
          return b.similarity - a.similarity;
        });
    },
    enabled: !!title,
  });

  return (
    <Alert variant="destructive" className="mt-1">
      <ExclamationTriangleIcon className="h-4 w-4" />
      <AlertTitle className="font-bold">Epic Internal Offer</AlertTitle>
      <AlertDescription>
        This offer is an internal entry from Epic Games and may not be available to the general
        public.
      </AlertDescription>
      {results.length > 0 && (
        <Link to="/offers/$id" params={{ id: results[0].id }} className="underline">
          Go to public offer
        </Link>
      )}
    </Alert>
  );
};

const compareTitleSimilarity = (a: string, b: string): number => {
  const aTitle = a.toLowerCase();
  const bTitle = b.toLowerCase();

  const aTitleWords = aTitle.split(" ");
  const bTitleWords = bTitle.split(" ");

  const intersection = aTitleWords.filter((word) => bTitleWords.includes(word));

  return intersection.length / Math.max(aTitleWords.length, bTitleWords.length);
};
