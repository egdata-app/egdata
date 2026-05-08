export type ImageQuality = "original" | "low" | "medium" | "high";

const isAbsolute = (src: string) => src.startsWith("http") || src.startsWith("//");

const buildImageUrl = (src: string, width: number, quality: ImageQuality = "medium") =>
  isAbsolute(src) ? `${src}?w=${width}&quality=${quality}&resize=1` : "/placeholder.webp";

export default buildImageUrl;

const DPR_MULTIPLIERS = [1, 1.5, 2];

export const buildSrcSet = (
  src: string,
  width: number,
  quality: ImageQuality = "medium",
): string | undefined => {
  if (!isAbsolute(src)) return undefined;
  const widths = DPR_MULTIPLIERS
    .map((m) => Math.round(width * m))
    .filter((w, i, arr) => arr.indexOf(w) === i);
  return widths
    .map((w) => `${src}?w=${w}&quality=${quality}&resize=1 ${w}w`)
    .join(", ");
};
