type SandboxMetaInput = {
  _id: string;
  displayName?: string | null;
  name?: string | null;
  updated?: string | null;
};

type SandboxMetaOfferInput = {
  title?: string | null;
};

export const generateSandboxMeta = (
  sandbox: SandboxMetaInput,
  offer: SandboxMetaOfferInput | null,
  section?: string,
): Array<React.JSX.IntrinsicElements["meta"]> => {
  const updatedAt = sandbox.updated ? new Date(sandbox.updated).getTime() : 0;
  const ogImageUrl = `https://api.egdata.app/sandboxes/${sandbox._id}/og.webp?v=${Number.isFinite(updatedAt) ? updatedAt : 0}`;
  const name = offer?.title ?? sandbox?.displayName ?? (sandbox?.name as string);

  return [
    {
      title: `${name}${section ? ` - ${section}` : ""} | Sandbox`,
    },
    {
      name: "description",
      content: section
        ? `Explore ${name} Sandbox ${section.toLowerCase()}`
        : `Explore ${name} in this sandbox.`,
    },
    {
      name: "og:title",
      content: `${name}${section ? ` - ${section}` : ""} | Sandbox`,
    },
    {
      name: "og:description",
      content: section
        ? `Explore ${name} Sandbox ${section.toLowerCase()}`
        : `Explore ${name} in this sandbox.`,
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
      content: `${name}${section ? ` - ${section}` : ""} | Sandbox`,
    },
    {
      name: "twitter:description",
      content: section
        ? `Explore ${name} Sandbox ${section.toLowerCase()}`
        : `Explore ${name} in this sandbox.`,
    },
    {
      name: "twitter:image",
      content: ogImageUrl,
    },
  ];
};
