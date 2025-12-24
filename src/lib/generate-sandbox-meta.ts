import type { SingleOffer } from "@/types/single-offer";
import type { SingleSandbox } from "@/types/single-sandbox";
import type { SingleItem } from "@/types/single-item";
import { getImage } from "./get-image";

export const generateSandboxMeta = (
  sandbox: SingleSandbox,
  offer: SingleOffer | (SingleItem & { isItem: true }) | null,
  section?: string,
): Array<React.JSX.IntrinsicElements["meta"]> => {
  return [
    {
      title: `${offer?.title ?? sandbox?.displayName ?? (sandbox?.name as string)}${section ? ` - ${section}` : ""} | Sandbox`,
    },
    {
      name: "description",
      content: section
        ? `Explore ${offer?.title ?? sandbox?.displayName ?? (sandbox?.name as string)} Sandbox ${section.toLowerCase()}`
        : `Explore ${offer?.title ?? sandbox?.displayName ?? (sandbox?.name as string)} in this sandbox.`,
    },
    {
      name: "og:title",
      content: `${offer?.title ?? sandbox?.displayName ?? (sandbox?.name as string)}${section ? ` - ${section}` : ""} | Sandbox`,
    },
    {
      name: "og:description",
      content: section
        ? `Explore ${offer?.title ?? sandbox?.displayName ?? (sandbox?.name as string)} Sandbox ${section.toLowerCase()}`
        : `Explore ${offer?.title ?? sandbox?.displayName ?? (sandbox?.name as string)} in this sandbox.`,
    },
    {
      name: "og:image",
      content:
        getImage(offer?.keyImages ?? [], [
          "OfferImageWide",
          "DieselGameBoxWide",
          "DieselStoreFrontWide",
          "DieselGameBox",
        ])?.url ?? "/placeholder.webp",
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
      content: `${offer?.title ?? sandbox?.displayName ?? (sandbox?.name as string)}${section ? ` - ${section}` : ""} | Sandbox`,
    },
    {
      name: "twitter:description",
      content: section
        ? `Explore ${offer?.title ?? sandbox?.displayName ?? (sandbox?.name as string)} Sandbox ${section.toLowerCase()}`
        : `Explore ${offer?.title ?? sandbox?.displayName ?? (sandbox?.name as string)} in this sandbox.`,
    },
    {
      name: "twitter:image",
      content:
        getImage(offer?.keyImages ?? [], [
          "OfferImageWide",
          "DieselGameBoxWide",
          "DieselStoreFrontWide",
          "DieselGameBox",
        ])?.url ?? "/placeholder.webp",
    },
  ];
};
