interface RawSourceMap {
  version: number;
  sources: string[];
  names?: string[];
  mappings: string;
}

interface MappingSegment {
  generatedColumn: number;
  sourceIndex: number;
  originalLine: number;
  originalColumn: number;
  nameIndex?: number;
}

interface ResolvedLocation {
  source: string;
  line: number;
  column: number;
  name?: string;
}

const BASE64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const BASE64_MAP = new Map<string, number>(
  Array.from(BASE64_CHARS).map((char, index) => [char, index]),
);

const sourceMapCache = new Map<string, Promise<MappingSegment[][] | null>>();
const rawMapMetadata = new WeakMap<MappingSegment[][], { sources: string[]; names: string[] }>();

function decodeVlq(encoded: string, startIndex: number): [value: number, nextIndex: number] {
  let result = 0;
  let shift = 0;
  let index = startIndex;

  while (index < encoded.length) {
    const digit = BASE64_MAP.get(encoded[index]);
    if (digit === undefined) {
      return [0, index + 1];
    }

    index += 1;
    const continuation = digit & 32;
    result += (digit & 31) << shift;
    shift += 5;

    if (continuation === 0) {
      break;
    }
  }

  const isNegative = (result & 1) === 1;
  const shifted = result >> 1;
  return [isNegative ? -shifted : shifted, index];
}

function parseMappings(mappings: string): MappingSegment[][] {
  const lines = mappings.split(";");
  const parsed: MappingSegment[][] = [];

  let sourceIndex = 0;
  let originalLine = 0;
  let originalColumn = 0;
  let nameIndex = 0;

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx += 1) {
    const line = lines[lineIdx];
    const segments: MappingSegment[] = [];
    let generatedColumn = 0;
    let i = 0;

    while (i < line.length) {
      if (line[i] === ",") {
        i += 1;
        continue;
      }

      const [colDelta, afterCol] = decodeVlq(line, i);
      generatedColumn += colDelta;
      i = afterCol;

      if (i >= line.length || line[i] === ",") {
        continue;
      }

      const [srcDelta, afterSrc] = decodeVlq(line, i);
      const [lineDelta, afterLine] = decodeVlq(line, afterSrc);
      const [origColDelta, afterOrigCol] = decodeVlq(line, afterLine);

      sourceIndex += srcDelta;
      originalLine += lineDelta;
      originalColumn += origColDelta;
      i = afterOrigCol;

      let segmentNameIndex: number | undefined;
      if (i < line.length && line[i] !== ",") {
        const [nameDelta, afterName] = decodeVlq(line, i);
        nameIndex += nameDelta;
        segmentNameIndex = nameIndex;
        i = afterName;
      }

      segments.push({
        generatedColumn,
        sourceIndex,
        originalLine,
        originalColumn,
        nameIndex: segmentNameIndex,
      });
    }

    parsed.push(segments);
  }

  return parsed;
}

function cleanSourcePath(source: string): string {
  return source
    .replace(/^(webpack|rspack):\/\/[^/]*\//, "")
    .replace(/^(\.\.\/)+/, "")
    .replace(/^\.\//, "");
}

function lookupPosition(
  lines: MappingSegment[][],
  lineNumber: number,
  columnNumber: number,
): ResolvedLocation | null {
  const lineIndex = lineNumber - 1;
  if (lineIndex < 0 || lineIndex >= lines.length) return null;

  const segments = lines[lineIndex];
  if (!segments || segments.length === 0) return null;

  const targetCol = Math.max(0, columnNumber - 1);
  let low = 0;
  let high = segments.length - 1;
  let best: MappingSegment | null = null;

  while (low <= high) {
    const mid = (low + high) >> 1;
    const seg = segments[mid];
    if (seg.generatedColumn <= targetCol) {
      best = seg;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  if (!best) return null;

  const meta = rawMapMetadata.get(lines);
  if (!meta) return null;

  const source = meta.sources[best.sourceIndex];
  if (!source) return null;

  return {
    source: cleanSourcePath(source),
    line: best.originalLine + 1,
    column: best.originalColumn + 1,
    name: best.nameIndex !== undefined ? meta.names[best.nameIndex] : undefined,
  };
}

async function loadSourceMap(scriptUrl: string): Promise<MappingSegment[][] | null> {
  const cached = sourceMapCache.get(scriptUrl);
  if (cached) return cached;

  const promise = (async () => {
    try {
      const response = await fetch(`${scriptUrl}.map`, {
        signal: AbortSignal.timeout(4000),
      });
      if (!response.ok) return null;

      const json = (await response.json()) as RawSourceMap;
      if (!json || typeof json.mappings !== "string" || !Array.isArray(json.sources)) {
        return null;
      }

      const parsed = parseMappings(json.mappings);
      rawMapMetadata.set(parsed, {
        sources: json.sources,
        names: Array.isArray(json.names) ? json.names : [],
      });
      return parsed;
    } catch {
      return null;
    }
  })();

  sourceMapCache.set(scriptUrl, promise);
  return promise;
}

const V8_FRAME_WITH_FN = /^(\s*at\s+)(.+?)\s+\((https?:\/\/[^\s)]+):(\d+):(\d+)\)$/;
const V8_FRAME_ANON = /^(\s*at\s+)(https?:\/\/[^\s)]+):(\d+):(\d+)$/;
const GECKO_FRAME = /^(.*?)@(https?:\/\/[^\s)]+):(\d+):(\d+)$/;

interface ParsedFrame {
  prefix: string;
  fnName?: string;
  url: string;
  line: number;
  column: number;
  style: "v8" | "gecko";
}

function parseFrame(rawLine: string): ParsedFrame | null {
  const v8Fn = rawLine.match(V8_FRAME_WITH_FN);
  if (v8Fn) {
    return {
      prefix: v8Fn[1],
      fnName: v8Fn[2],
      url: v8Fn[3],
      line: Number(v8Fn[4]),
      column: Number(v8Fn[5]),
      style: "v8",
    };
  }

  const v8Anon = rawLine.match(V8_FRAME_ANON);
  if (v8Anon) {
    return {
      prefix: v8Anon[1],
      url: v8Anon[2],
      line: Number(v8Anon[3]),
      column: Number(v8Anon[4]),
      style: "v8",
    };
  }

  const gecko = rawLine.match(GECKO_FRAME);
  if (gecko) {
    return {
      prefix: "",
      fnName: gecko[1] || undefined,
      url: gecko[2],
      line: Number(gecko[3]),
      column: Number(gecko[4]),
      style: "gecko",
    };
  }

  return null;
}

export async function resolveStackTrace(
  stack: string,
): Promise<{ stack: string; resolvedCount: number }> {
  const rawLines = stack.split("\n");
  const parsedFrames = rawLines.map(parseFrame);

  const uniqueUrls = new Set<string>();
  for (const frame of parsedFrames) {
    if (frame?.url.startsWith("http")) {
      uniqueUrls.add(frame.url);
    }
  }

  if (uniqueUrls.size === 0) {
    return { stack, resolvedCount: 0 };
  }

  await Promise.all(Array.from(uniqueUrls).map((url) => loadSourceMap(url)));

  let resolvedCount = 0;
  const outputLines = await Promise.all(
    rawLines.map(async (rawLine, idx) => {
      const frame = parsedFrames[idx];
      if (!frame) return rawLine;

      const map = await loadSourceMap(frame.url);
      if (!map) return rawLine;

      const loc = lookupPosition(map, frame.line, frame.column);
      if (!loc) return rawLine;

      resolvedCount += 1;
      const fn = frame.fnName || loc.name;

      if (frame.style === "gecko") {
        return `${fn ?? ""}@${loc.source}:${loc.line}:${loc.column}`;
      }

      return fn
        ? `${frame.prefix}${fn} (${loc.source}:${loc.line}:${loc.column})`
        : `${frame.prefix}${loc.source}:${loc.line}:${loc.column}`;
    }),
  );

  return {
    stack: outputLines.join("\n"),
    resolvedCount,
  };
}
