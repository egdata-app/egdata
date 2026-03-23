export type ImageQuality = "original" | "low" | "medium" | "high";

export default (src: string, height: number, quality: ImageQuality = "medium") =>
  src.startsWith("http") || src.startsWith("//")
    ? `${src}?w=${height}&quality=${quality}&resize=1`
    : "/placeholder.webp";
