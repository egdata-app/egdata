export type ImageQuality = "original" | "low" | "medium" | "high";

const isAbsolute = (src: string) => src.startsWith("http") || src.startsWith("//");
const shouldOptimize = (src: string) => isAbsolute(src) && !src.includes("/epic-achievements/");
const FALLBACK_BASE_URL = "https://egdata.app";

const withImageParams = (src: string, width: number, quality: ImageQuality): string => {
  const isProtocolRelative = src.startsWith("//");

  let url: URL;
  try {
    url = new URL(src);
  } catch {
    url = new URL(src, FALLBACK_BASE_URL);
  }

  url.searchParams.set("w", String(width));
  url.searchParams.set("quality", quality);
  url.searchParams.set("resize", "1");

  const result = url.toString();
  return isProtocolRelative ? result.replace(/^https?:/, "") : result;
};

const buildImageUrl = (src: string, width: number, quality: ImageQuality = "medium") => {
  if (!isAbsolute(src)) return "/placeholder.webp";
  if (!shouldOptimize(src)) return src;
  return withImageParams(src, width, quality);
};

export default buildImageUrl;

const DPR_MULTIPLIERS = [1, 1.5, 2];

export const buildSrcSet = (
  src: string,
  width: number,
  quality: ImageQuality = "medium",
): string | undefined => {
  if (!shouldOptimize(src)) return undefined;
  const widths = DPR_MULTIPLIERS.map((m) => Math.round(width * m)).filter(
    (w, i, arr) => arr.indexOf(w) === i,
  );
  return widths.map((w) => `${withImageParams(src, w, quality)} ${w}w`).join(", ");
};
