import { getImage } from "./get-image";
import type { SingleItem } from "@/types/single-item";

export const generateItemMeta = (
  item: SingleItem,
  section?: string,
): Array<React.JSX.IntrinsicElements["meta"]> => {
  return [
    {
      title: `${item?.title}${section ? ` - ${section}` : ""} | Item`,
    },
    {
      name: "description",
      content: section
        ? `Explore ${item?.title} item ${section.toLowerCase()}.`
        : `Explore ${item?.title} information.`,
    },
    {
      name: "og:title",
      content: `${item?.title}${section ? ` - ${section}` : ""} | Item`,
    },
    {
      name: "og:description",
      content: section
        ? `Explore ${item?.title} item ${section.toLowerCase()}.`
        : `Explore ${item?.title} information.`,
    },
    {
      name: "og:image",
      content:
        getImage(item.keyImages, ["DieselGameBoxWide", "DieselGameBox"])?.url ??
        "/placeholder.webp",
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
      content: `${item?.title}${section ? ` - ${section}` : ""} | Item`,
    },
    {
      name: "twitter:description",
      content: section
        ? `Explore ${item?.title} item ${section.toLowerCase()}.`
        : `Explore ${item?.title} information.`,
    },
    {
      name: "twitter:image",
      content:
        getImage(item.keyImages, ["DieselGameBoxWide", "DieselGameBox"])?.url ??
        "/placeholder.webp",
    },
  ];
};
