const SITE_URL = "https://egdata.app";
const DEFAULT_IMAGE = "https://cdn.egdata.app/placeholder-1080.webp";
const SITE_NAME = "egdata.app";

type SeoMeta = React.JSX.IntrinsicElements["meta"] | { title: string };
type SeoLink = React.JSX.IntrinsicElements["link"];

type SeoOptions = {
  title: string;
  description: string;
  path?: string;
  image?: string | null;
  imageAlt?: string;
  type?: string;
};

const normalizePath = (path = "/") => {
  if (!path || path === "/") return "/";
  return path.startsWith("/") ? path : `/${path}`;
};

export const canonicalUrl = (path = "/") => {
  const normalizedPath = normalizePath(path);
  return `${SITE_URL}${normalizedPath === "/" ? "" : normalizedPath}`;
};

export const createCanonicalLink = (path = "/"): SeoLink => ({
  rel: "canonical",
  href: canonicalUrl(path),
});

export const createSeoMeta = ({
  title,
  description,
  path = "/",
  image = DEFAULT_IMAGE,
  imageAlt,
  type = "website",
}: SeoOptions): SeoMeta[] => {
  const url = canonicalUrl(path);
  const resolvedImage = image || DEFAULT_IMAGE;
  const resolvedImageAlt = imageAlt || title;

  return [
    { title },
    { name: "description", content: description },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:type", content: type },
    { property: "og:url", content: url },
    { property: "og:site_name", content: SITE_NAME },
    { property: "og:image", content: resolvedImage },
    { property: "og:image:alt", content: resolvedImageAlt },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:site", content: "@egdataapp" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: resolvedImage },
    { name: "twitter:image:alt", content: resolvedImageAlt },
  ];
};
