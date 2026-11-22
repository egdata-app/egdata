import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { toast } from "sonner";
import buildImageUrl from "@/lib/build-image-url";

const STORAGE_ENABLED_KEY = "egdata:offer-ascii-bg";
const STORAGE_PALETTE_KEY = "egdata:offer-ascii-palette";
const TRIGGER_WORDS = ["ascii", "pastoral"] as const;
const MAX_BUFFER_LENGTH = Math.max(...TRIGGER_WORDS.map((w) => w.length));

// Ordered from airy pastoral marks to dense typographic anchors
const ASCII_RAMP = " .·'`:-~=+*#%@";

const CELL_WIDTH = 8;
const CELL_HEIGHT = 13;
const HISTOGRAM_SAMPLE_W = 64;
const HISTOGRAM_SAMPLE_H = 36;
const TARGET_FPS = 24;
const FRAME_INTERVAL_MS = 1000 / TARGET_FPS;

export type AsciiPalette = "pastoral" | "chromatic" | "mono";

const PALETTE_ORDER: AsciiPalette[] = ["pastoral", "chromatic", "mono"];

const PALETTE_LABELS: Record<AsciiPalette, string> = {
  pastoral: "Pastoral",
  chromatic: "Chromatic",
  mono: "Mono",
};

const PALETTE_INDEX: Record<AsciiPalette, number> = {
  pastoral: 0,
  chromatic: 1,
  mono: 2,
};

const VERTEX_SHADER_SOURCE = `
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER_SOURCE = `
precision mediump float;

uniform sampler2D u_image;
uniform sampler2D u_glyphs;
uniform vec2 u_resolution;
uniform vec2 u_imageSize;
uniform vec2 u_cellSize;
uniform float u_glyphCount;
uniform float u_minLum;
uniform float u_lumRange;
uniform float u_time;
uniform float u_motion;
uniform int u_palette;

void main() {
  vec2 px = vec2(gl_FragCoord.x, u_resolution.y - gl_FragCoord.y);
  vec2 cell = floor(px / u_cellSize);
  vec2 cellLocal = fract(px / u_cellSize);
  vec2 cellCenter = (cell + 0.5) * u_cellSize / u_resolution;

  // Preserve hero image aspect ratio (object-cover)
  float viewAspect = u_resolution.x / max(u_resolution.y, 1.0);
  float imgAspect = u_imageSize.x / max(u_imageSize.y, 1.0);
  vec2 imgUv = cellCenter;
  if (imgAspect > viewAspect) {
    float scale = viewAspect / imgAspect;
    imgUv.x = (imgUv.x - 0.5) * scale + 0.5;
  } else {
    float scale = imgAspect / viewAspect;
    imgUv.y = (imgUv.y - 0.5) * scale + 0.5;
  }

  vec3 rgb = texture2D(u_image, clamp(imgUv, 0.0, 1.0)).rgb;

  // Auto-leveled luminance
  float rawLum = dot(rgb, vec3(0.2126, 0.7152, 0.0722));
  float normLum = clamp((rawLum - u_minLum) / u_lumRange, 0.0, 1.0);
  float shaped = pow(normLum, 0.88);

  // Subtle organic pastoral breeze shimmer
  float wave = u_motion * sin(cell.x * 0.09 + u_time * 1.4) * cos(cell.y * 0.12 - u_time * 0.9);
  float rampMax = u_glyphCount - 1.0;
  float baseIdx = floor(shaped * rampMax + 0.5);
  float waveStep = step(0.65, wave) - step(0.65, -wave);
  float glyphIdx = clamp(baseIdx + waveStep, 0.0, rampMax);

  if (glyphIdx < 0.5) {
    gl_FragColor = vec4(0.0);
    return;
  }

  vec2 glyphUv = vec2((glyphIdx + cellLocal.x) / u_glyphCount, cellLocal.y);
  float glyphMask = texture2D(u_glyphs, glyphUv).a;
  if (glyphMask < 0.02) {
    gl_FragColor = vec4(0.0);
    return;
  }

  vec3 color;
  if (u_palette == 2) {
    float l = 0.48 + shaped * 0.38;
    color = vec3(l * 0.62, l * 0.86, min(1.0, l * 1.12));
  } else if (u_palette == 1) {
    color = clamp(rgb * 0.88 + vec3(34.0 / 255.0), 0.0, 1.0);
  } else {
    float gray = dot(rgb, vec3(0.299, 0.587, 0.114));
    vec3 sat = mix(vec3(gray), rgb, 0.52);
    color = clamp(sat * vec3(0.78, 0.82, 0.74) + vec3(56.0, 62.0, 54.0) / 255.0, 0.0, 1.0);
  }

  float baseAlpha = clamp(0.16 + shaped * 0.42 + wave * 0.04, 0.08, 0.66);

  // Soft pastoral vignette so foreground UI remains crisp
  vec2 uv = px / u_resolution;
  vec2 radial = (uv - vec2(0.5, 0.25)) / vec2(0.85, 0.75);
  float radialFade = 1.0 - smoothstep(0.15, 1.15, length(radial)) * 0.78;
  float verticalFade = (smoothstep(0.0, 0.18, uv.y) * 0.35 + 0.65)
    * (1.0 - smoothstep(0.65, 1.0, uv.y) * 0.82);

  float finalAlpha = baseAlpha * glyphMask * radialFade * verticalFade;
  gl_FragColor = vec4(color * finalAlpha, finalAlpha);
}
`;

const isEditableElement = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable ||
    Boolean(target.closest("[contenteditable='true']"))
  );
};

const listeners = new Set<() => void>();

const emitChange = () => {
  for (const listener of listeners) {
    listener();
  }
};

const subscribeStore = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const readStoredEnabled = () => {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_ENABLED_KEY) === "1";
  } catch {
    return false;
  }
};

const readStoredPalette = (): AsciiPalette => {
  if (typeof window === "undefined") return "pastoral";
  try {
    const raw = window.localStorage.getItem(STORAGE_PALETTE_KEY);
    if (raw === "pastoral" || raw === "chromatic" || raw === "mono") {
      return raw;
    }
  } catch {
    // Ignore storage errors
  }
  return "pastoral";
};

export function useOfferAsciiEasterEgg() {
  const enabled = useSyncExternalStore(subscribeStore, readStoredEnabled, () => false);
  const palette = useSyncExternalStore<AsciiPalette>(
    subscribeStore,
    readStoredPalette,
    () => "pastoral",
  );

  const setAndPersistEnabled = useCallback((next: boolean, notify = false) => {
    try {
      window.localStorage.setItem(STORAGE_ENABLED_KEY, next ? "1" : "0");
    } catch {
      // Ignore storage errors
    }
    emitChange();
    if (notify) {
      if (next) {
        toast("Pastoral ASCII backdrop unlocked", {
          description: "Type 'ascii' or triple-click the hero image anytime to toggle.",
        });
      } else {
        toast("Pastoral ASCII backdrop disabled");
      }
    }
  }, []);

  const toggle = useCallback(
    (notify = true) => {
      setAndPersistEnabled(!readStoredEnabled(), notify);
    },
    [setAndPersistEnabled],
  );

  const cyclePalette = useCallback(() => {
    const prev = readStoredPalette();
    const next = PALETTE_ORDER[(PALETTE_ORDER.indexOf(prev) + 1) % PALETTE_ORDER.length];
    try {
      window.localStorage.setItem(STORAGE_PALETTE_KEY, next);
    } catch {
      // Ignore storage errors
    }
    emitChange();
  }, []);

  useEffect(() => {
    let buffer = "";
    let resetTimer: ReturnType<typeof setTimeout> | null = null;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.key.length !== 1) return;
      if (isEditableElement(event.target)) return;

      const char = event.key.toLowerCase();
      if (!/[a-z]/.test(char)) {
        buffer = "";
        return;
      }

      buffer = (buffer + char).slice(-MAX_BUFFER_LENGTH);

      if (resetTimer) clearTimeout(resetTimer);
      resetTimer = setTimeout(() => {
        buffer = "";
      }, 2200);

      if (TRIGGER_WORDS.some((word) => buffer.endsWith(word))) {
        buffer = "";
        toggle(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (resetTimer) clearTimeout(resetTimer);
    };
  }, [toggle]);

  return {
    enabled,
    palette,
    toggle,
    disable: useCallback(() => setAndPersistEnabled(false, false), [setAndPersistEnabled]),
    cyclePalette,
  };
}

/**
 * Computes 5th..95th percentile luminance in O(N + 256) using a tiny 64x36 sample.
 * Returns null if the image is CORS-tainted.
 */
function computeLuminanceBounds(
  image: HTMLImageElement,
): { minLum: number; lumRange: number } | null {
  const sample = document.createElement("canvas");
  sample.width = HISTOGRAM_SAMPLE_W;
  sample.height = HISTOGRAM_SAMPLE_H;
  const ctx = sample.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;

  ctx.drawImage(image, 0, 0, HISTOGRAM_SAMPLE_W, HISTOGRAM_SAMPLE_H);

  let data: Uint8ClampedArray;
  try {
    data = ctx.getImageData(0, 0, HISTOGRAM_SAMPLE_W, HISTOGRAM_SAMPLE_H).data;
  } catch {
    return null;
  }

  const histogram = new Uint32Array(256);
  const total = HISTOGRAM_SAMPLE_W * HISTOGRAM_SAMPLE_H;

  for (let i = 0; i < total; i++) {
    const o = i * 4;
    const lum = Math.min(
      255,
      Math.round(0.2126 * data[o] + 0.7152 * data[o + 1] + 0.0722 * data[o + 2]),
    );
    histogram[lum] += 1;
  }

  const p5Target = Math.floor(total * 0.05);
  const p95Target = Math.floor(total * 0.95);
  let cumulative = 0;
  let minBin = 0;
  let maxBin = 255;
  let foundMin = false;

  for (let bin = 0; bin < 256; bin++) {
    cumulative += histogram[bin];
    if (!foundMin && cumulative >= p5Target) {
      minBin = bin;
      foundMin = true;
    }
    if (cumulative >= p95Target) {
      maxBin = bin;
      break;
    }
  }

  const minLum = minBin / 255;
  const maxLum = maxBin / 255;
  return {
    minLum,
    lumRange: Math.max(maxLum - minLum, 0.18),
  };
}

function buildGlyphAtlasCanvas(cellW: number, cellH: number, dpr: number): HTMLCanvasElement {
  const atlas = document.createElement("canvas");
  atlas.width = cellW * ASCII_RAMP.length;
  atlas.height = cellH;

  const ctx = atlas.getContext("2d");
  if (!ctx) return atlas;

  const fontSize = Math.round(12 * dpr);
  ctx.clearRect(0, 0, atlas.width, atlas.height);
  ctx.font = `${fontSize}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace`;
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  for (let i = 0; i < ASCII_RAMP.length; i++) {
    ctx.fillText(ASCII_RAMP[i], i * cellW + cellW / 2, cellH / 2 + dpr * 0.5);
  }

  return atlas;
}

function compileShader(
  gl: WebGLRenderingContext,
  type: number,
  source: string,
): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createTexture(
  gl: WebGLRenderingContext,
  source: TexImageSource,
  filter: number,
): WebGLTexture | null {
  const texture = gl.createTexture();
  if (!texture) return null;
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
  try {
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
  } catch {
    gl.deleteTexture(texture);
    return null;
  }
  return texture;
}

/**
 * Static Canvas2D fallback used only when WebGL is unavailable (0% idle CPU).
 */
function renderStaticCanvas2DFallback(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  bounds: { minLum: number; lumRange: number },
  palette: AsciiPalette,
) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = window.innerWidth;
  const height = window.innerHeight;
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const cols = Math.max(24, Math.ceil(width / CELL_WIDTH));
  const rows = Math.max(16, Math.ceil(height / CELL_HEIGHT));

  const offscreen = document.createElement("canvas");
  offscreen.width = cols;
  offscreen.height = rows;
  const offCtx = offscreen.getContext("2d", { willReadFrequently: true });
  if (!offCtx) return;

  const imgW = image.naturalWidth || image.width;
  const imgH = image.naturalHeight || image.height;
  const viewAspect = width / Math.max(height, 1);
  const imgAspect = imgW / Math.max(imgH, 1);
  let srcX = 0;
  let srcY = 0;
  let srcW = imgW;
  let srcH = imgH;
  if (imgAspect > viewAspect) {
    srcW = imgH * viewAspect;
    srcX = (imgW - srcW) / 2;
  } else {
    srcH = imgW / viewAspect;
    srcY = (imgH - srcH) / 2;
  }

  offCtx.drawImage(image, srcX, srcY, srcW, srcH, 0, 0, cols, rows);

  let data: Uint8ClampedArray;
  try {
    data = offCtx.getImageData(0, 0, cols, rows).data;
  } catch {
    return;
  }

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  ctx.font = `12px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace`;
  ctx.textBaseline = "top";

  const rampMax = ASCII_RAMP.length - 1;
  for (let row = 0; row < rows; row++) {
    const y = row * CELL_HEIGHT;
    const uvY = (row + 0.5) / rows;
    const vFade =
      (Math.min(1, uvY / 0.18) * 0.35 + 0.65) *
      (1 - Math.max(0, Math.min(1, (uvY - 0.65) / 0.35)) * 0.82);

    for (let col = 0; col < cols; col++) {
      const o = (row * cols + col) * 4;
      const r = data[o];
      const g = data[o + 1];
      const b = data[o + 2];
      const rawLum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
      const norm = Math.min(1, Math.max(0, (rawLum - bounds.minLum) / bounds.lumRange));
      const shaped = Math.pow(norm, 0.88);
      const idx = Math.round(shaped * rampMax);
      if (idx === 0) continue;

      const alpha = (0.16 + shaped * 0.42) * vFade;
      if (palette === "mono") {
        const l = Math.round(48 + shaped * 38);
        ctx.fillStyle = `hsla(204, 48%, ${l}%, ${alpha.toFixed(3)})`;
      } else if (palette === "chromatic") {
        ctx.fillStyle = `rgba(${Math.min(255, Math.round(r * 0.88 + 34))}, ${Math.min(255, Math.round(g * 0.88 + 34))}, ${Math.min(255, Math.round(b * 0.88 + 34))}, ${alpha.toFixed(3)})`;
      } else {
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        const sr = gray + (r - gray) * 0.52;
        const sg = gray + (g - gray) * 0.52;
        const sb = gray + (b - gray) * 0.52;
        ctx.fillStyle = `rgba(${Math.min(255, Math.round(sr * 0.78 + 56))}, ${Math.min(255, Math.round(sg * 0.82 + 62))}, ${Math.min(255, Math.round(sb * 0.74 + 54))}, ${alpha.toFixed(3)})`;
      }
      ctx.fillText(ASCII_RAMP[idx], col * CELL_WIDTH, y);
    }
  }
}

type LoadedHero = {
  url: string;
  image: HTMLImageElement;
  bounds: { minLum: number; lumRange: number };
};

export function OfferAsciiBackground({
  imageUrl,
  palette,
  onCyclePalette,
  onClose,
}: {
  imageUrl: string;
  palette: AsciiPalette;
  onCyclePalette: () => void;
  onClose: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const paletteRef = useRef<AsciiPalette>(palette);
  const redrawOnPaletteChangeRef = useRef<(() => void) | null>(null);
  const [loadedHero, setLoadedHero] = useState<LoadedHero | null>(null);
  const ready = loadedHero?.url === imageUrl;

  useEffect(() => {
    paletteRef.current = palette;
    redrawOnPaletteChangeRef.current?.();
  }, [palette]);

  // Load CORS-safe hero image & compute fast 256-bin luminance bounds once
  useEffect(() => {
    let cancelled = false;
    const optimizedUrl = buildImageUrl(imageUrl, 480, "medium");

    const loadImage = (src: string, fallbackSrc?: string) => {
      const img = new window.Image();
      img.crossOrigin = "anonymous";
      img.decoding = "async";

      img.onload = () => {
        if (cancelled) return;
        const bounds = computeLuminanceBounds(img);
        if (bounds) {
          setLoadedHero({ url: imageUrl, image: img, bounds });
        }
      };

      img.onerror = () => {
        if (cancelled) return;
        if (fallbackSrc && fallbackSrc !== src) {
          loadImage(fallbackSrc);
        }
      };

      img.src = src;
    };

    loadImage(optimizedUrl, imageUrl);

    return () => {
      cancelled = true;
    };
  }, [imageUrl]);

  // GPU-accelerated WebGL ASCII renderer (with static Canvas2D fallback)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !ready || !loadedHero) return;

    const gl = canvas.getContext("webgl", {
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: "low-power",
      preserveDrawingBuffer: false,
    });

    if (!gl) {
      // Fallback: static single-frame Canvas2D render (0% idle CPU)
      let resizeTimer: ReturnType<typeof setTimeout> | null = null;
      const drawFallback = () => {
        renderStaticCanvas2DFallback(
          canvas,
          loadedHero.image,
          loadedHero.bounds,
          paletteRef.current,
        );
      };
      drawFallback();
      redrawOnPaletteChangeRef.current = drawFallback;

      const onResize = () => {
        if (resizeTimer) clearTimeout(resizeTimer);
        resizeTimer = setTimeout(drawFallback, 150);
      };
      window.addEventListener("resize", onResize);
      return () => {
        redrawOnPaletteChangeRef.current = null;
        if (resizeTimer) clearTimeout(resizeTimer);
        window.removeEventListener("resize", onResize);
      };
    }

    const vertShader = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER_SOURCE);
    const fragShader = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SOURCE);
    if (!vertShader || !fragShader) {
      if (vertShader) gl.deleteShader(vertShader);
      if (fragShader) gl.deleteShader(fragShader);
      return;
    }

    const program = gl.createProgram();
    if (!program) {
      gl.deleteShader(vertShader);
      gl.deleteShader(fragShader);
      return;
    }

    gl.attachShader(program, vertShader);
    gl.attachShader(program, fragShader);
    gl.linkProgram(program);
    gl.deleteShader(vertShader);
    gl.deleteShader(fragShader);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteProgram(program);
      return;
    }

    // Single full-screen triangle covering clip space [-1, 1]
    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

    const posLoc = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    const imageTexture = createTexture(gl, loadedHero.image, gl.LINEAR);
    if (!imageTexture) {
      gl.deleteBuffer(vertexBuffer);
      gl.deleteProgram(program);
      return;
    }

    const initialDpr = Math.min(window.devicePixelRatio || 1, 2);
    let currentDpr = initialDpr;
    let cellW = Math.round(CELL_WIDTH * currentDpr);
    let cellH = Math.round(CELL_HEIGHT * currentDpr);
    let glyphTexture = createTexture(
      gl,
      buildGlyphAtlasCanvas(cellW, cellH, currentDpr),
      gl.NEAREST,
    );
    if (!glyphTexture) {
      gl.deleteTexture(imageTexture);
      gl.deleteBuffer(vertexBuffer);
      gl.deleteProgram(program);
      return;
    }

    const uImage = gl.getUniformLocation(program, "u_image");
    const uGlyphs = gl.getUniformLocation(program, "u_glyphs");
    const uResolution = gl.getUniformLocation(program, "u_resolution");
    const uImageSize = gl.getUniformLocation(program, "u_imageSize");
    const uCellSize = gl.getUniformLocation(program, "u_cellSize");
    const uGlyphCount = gl.getUniformLocation(program, "u_glyphCount");
    const uMinLum = gl.getUniformLocation(program, "u_minLum");
    const uLumRange = gl.getUniformLocation(program, "u_lumRange");
    const uTime = gl.getUniformLocation(program, "u_time");
    const uMotion = gl.getUniformLocation(program, "u_motion");
    const uPalette = gl.getUniformLocation(program, "u_palette");

    gl.useProgram(program);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, imageTexture);
    gl.uniform1i(uImage, 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, glyphTexture);
    gl.uniform1i(uGlyphs, 1);

    gl.uniform2f(
      uImageSize,
      loadedHero.image.naturalWidth || loadedHero.image.width,
      loadedHero.image.naturalHeight || loadedHero.image.height,
    );
    gl.uniform1f(uGlyphCount, ASCII_RAMP.length);
    gl.uniform1f(uMinLum, loadedHero.bounds.minLum);
    gl.uniform1f(uLumRange, loadedHero.bounds.lumRange);

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    gl.uniform1f(uMotion, reducedMotion ? 0 : 1);

    const syncViewport = () => {
      const nextDpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = window.innerWidth;
      const height = window.innerHeight;
      const pixelW = Math.floor(width * nextDpr);
      const pixelH = Math.floor(height * nextDpr);

      canvas.width = pixelW;
      canvas.height = pixelH;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      gl.viewport(0, 0, pixelW, pixelH);
      gl.uniform2f(uResolution, pixelW, pixelH);

      if (nextDpr !== currentDpr) {
        currentDpr = nextDpr;
        cellW = Math.round(CELL_WIDTH * currentDpr);
        cellH = Math.round(CELL_HEIGHT * currentDpr);
        const nextGlyphTex = createTexture(
          gl,
          buildGlyphAtlasCanvas(cellW, cellH, currentDpr),
          gl.NEAREST,
        );
        if (nextGlyphTex) {
          gl.deleteTexture(glyphTexture);
          glyphTexture = nextGlyphTex;
          gl.activeTexture(gl.TEXTURE1);
          gl.bindTexture(gl.TEXTURE_2D, glyphTexture);
        }
      }
      gl.uniform2f(uCellSize, cellW, cellH);
    };

    const drawFrame = (timeMs: number) => {
      gl.uniform1f(uTime, timeMs * 0.00055);
      gl.uniform1i(uPalette, PALETTE_INDEX[paletteRef.current]);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    syncViewport();
    drawFrame(0);

    let rafId = 0;
    let lastDrawTime = 0;
    let isHidden = document.hidden;

    const loop = (now: number) => {
      rafId = window.requestAnimationFrame(loop);
      if (isHidden) return;
      if (now - lastDrawTime < FRAME_INTERVAL_MS) return;
      lastDrawTime = now;
      drawFrame(now);
    };

    if (!reducedMotion) {
      rafId = window.requestAnimationFrame(loop);
    }

    const handleResize = () => {
      syncViewport();
      drawFrame(performance.now());
    };

    const handleVisibility = () => {
      isHidden = document.hidden;
    };

    redrawOnPaletteChangeRef.current = () => {
      drawFrame(reducedMotion ? 0 : performance.now());
    };

    window.addEventListener("resize", handleResize);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      redrawOnPaletteChangeRef.current = null;
      if (rafId) window.cancelAnimationFrame(rafId);
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("visibilitychange", handleVisibility);
      gl.deleteTexture(imageTexture);
      gl.deleteTexture(glyphTexture);
      gl.deleteBuffer(vertexBuffer);
      gl.deleteProgram(program);
    };
  }, [ready, loadedHero]);

  if (typeof document === "undefined") return null;

  return (
    <>
      {createPortal(
        <div
          aria-hidden="true"
          className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none transition-opacity duration-700"
          style={{ opacity: ready ? 1 : 0 }}
        >
          <canvas ref={canvasRef} className="block size-full" />
        </div>,
        document.body,
      )}
      {createPortal(
        <div className="fixed bottom-4 right-4 z-40 flex items-center gap-1 rounded-full border border-border/70 bg-card/85 px-2.5 py-1 font-mono text-[11px] text-muted-foreground shadow-lg shadow-black/40 backdrop-blur-md">
          <button
            type="button"
            onClick={onCyclePalette}
            className="inline-flex items-center gap-1.5 rounded-full px-1.5 py-0.5 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            title="Cycle ASCII palette"
          >
            <span className="text-primary" aria-hidden="true">
              ░
            </span>
            <span>ASCII · {PALETTE_LABELS[palette]}</span>
          </button>
          <span className="text-border" aria-hidden="true">
            |
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Disable ASCII background"
            title="Disable ASCII background"
            className="inline-flex size-5 items-center justify-center rounded-full transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="size-3" />
          </button>
        </div>,
        document.body,
      )}
    </>
  );
}
