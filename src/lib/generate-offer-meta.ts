import type { SingleOffer } from "@/types/single-offer";

export const generateOfferMeta = (
  offer: SingleOffer,
  section?: string,
  country?: string,
): Array<React.JSX.IntrinsicElements["meta"]> => {
  const ogImageUrl = `https://api.egdata.app/offers/${offer.id}/og.webp?v=${new Date(offer.lastModifiedDate).getTime()}${country ? `&country=${country}` : ""}`;

  return [
    {
      title: `${offer?.title}${section ? ` - ${section}` : ""} | egdata.app`,
    },
    {
      name: "description",
      content: section
        ? `Explore ${offer?.title} ${section.toLowerCase()}.`
        : `Explore detailed information about ${offer?.title}. Discover the current and historical price, achievements, reviews and more.`,
    },
    {
      name: "og:title",
      content: `${offer?.title}${section ? ` - ${section}` : ""} | egdata.app`,
    },
    {
      name: "og:description",
      content: section
        ? `Explore ${offer?.title} ${section.toLowerCase()}.`
        : `Explore detailed information about ${offer?.title}. Discover the current and historical price, achievements, reviews and more.`,
    },
    {
      name: "og:image",
      content: ogImageUrl,
    },
    {
      name: "og:image:type",
      content: "image/webp",
    },
    {
      name: "og:image:width",
      content: "1200",
    },
    {
      name: "og:image:height",
      content: "630",
    },
    {
      name: "og:type",
      content: "website",
    },
    {
      name: "twitter:card",
      content: "summary_large_image",
    },
    {
      name: "twitter:title",
      content: `${offer?.title}${section ? ` - ${section}` : ""} | egdata.app`,
    },
    {
      name: "twitter:description",
      content: section
        ? `Explore ${offer?.title} ${section.toLowerCase()}.`
        : `Explore detailed information about ${offer?.title}. Discover the current and historical price, achievements, reviews and more.`,
    },
    {
      name: "twitter:image",
      content: ogImageUrl,
    },
  ];
};
