import type { SingleOffer } from "@/types/single-offer";
import type { SingleSandbox } from "@/types/single-sandbox";
import type { SingleItem } from "@/types/single-item";

export const generateSandboxMeta = (
  sandbox: SingleSandbox,
  offer: SingleOffer | (SingleItem & { isItem: true }) | null,
  section?: string,
): Array<React.JSX.IntrinsicElements["meta"]> => {
  const ogImageUrl = `https://api.egdata.app/sandboxes/${sandbox._id}/og.webp?v=${new Date(sandbox.updated).getTime()}`;

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
      content: ogImageUrl,
    },
  ];
};
