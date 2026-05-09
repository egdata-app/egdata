const SAMPLE_WIDTH = 32;
const SAMPLE_HEIGHT = 18;
const BUCKET_SIZE = 32;

type ColorBucket = {
  r: number;
  g: number;
  b: number;
  count: number;
  chroma: number;
};

const shouldUsePixel = (r: number, g: number, b: number, alpha: number) => {
  if (alpha < 128) return false;

  const brightness = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  if (brightness < 24 || brightness > 238) return false;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const chroma = max - min;

  return chroma >= 10 || (brightness >= 80 && brightness <= 180);
};

export const extractDominantVideoColors = (
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  maxColors = 4,
) => {
  if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || !video.videoWidth) {
    return [];
  }

  if (canvas.width !== SAMPLE_WIDTH) canvas.width = SAMPLE_WIDTH;
  if (canvas.height !== SAMPLE_HEIGHT) canvas.height = SAMPLE_HEIGHT;

  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return [];

  context.drawImage(video, 0, 0, SAMPLE_WIDTH, SAMPLE_HEIGHT);
  const { data } = context.getImageData(0, 0, SAMPLE_WIDTH, SAMPLE_HEIGHT);
  const buckets = new Map<string, ColorBucket>();

  for (let index = 0; index < data.length; index += 4) {
    const r = data[index];
    const g = data[index + 1];
    const b = data[index + 2];
    const alpha = data[index + 3];

    if (!shouldUsePixel(r, g, b, alpha)) continue;

    const key = [
      Math.floor(r / BUCKET_SIZE),
      Math.floor(g / BUCKET_SIZE),
      Math.floor(b / BUCKET_SIZE),
    ].join(":");
    const bucket = buckets.get(key);
    const chroma = Math.max(r, g, b) - Math.min(r, g, b);

    if (bucket) {
      bucket.r += r;
      bucket.g += g;
      bucket.b += b;
      bucket.count += 1;
      bucket.chroma += chroma;
    } else {
      buckets.set(key, { r, g, b, count: 1, chroma });
    }
  }

  return [...buckets.values()]
    .sort((a, b) => {
      const aScore = a.count * (1 + a.chroma / a.count / 255);
      const bScore = b.count * (1 + b.chroma / b.count / 255);
      return bScore - aScore;
    })
    .slice(0, maxColors)
    .map((bucket) => {
      const r = Math.round(bucket.r / bucket.count);
      const g = Math.round(bucket.g / bucket.count);
      const b = Math.round(bucket.b / bucket.count);

      return `rgb(${r}, ${g}, ${b})`;
    });
};
