import { readFileSync, readdirSync } from "node:fs";
import { extname, join, relative } from "node:path";

const root = "src";
const checkedExtensions = new Set([".css", ".ts", ".tsx"]);
const allowedFiles = new Set([
  "src/components/aria/chart.tsx",
  "src/components/app/discord-bot.tsx",
  "src/components/icons/egs.tsx",
  "src/routes/__root.tsx",
]);

const bannedPatterns = [
  {
    name: "raw gray/slate/neutral Tailwind color",
    pattern: /\b(?:text|bg|border)-(?:gray|slate|neutral)-\d{2,3}(?:\/\d+)?\b/,
  },
  {
    name: "raw semantic Tailwind color",
    pattern:
      /\b(?:text|bg|border|fill|from|via|to|hover:bg|hover:text)-(?:red|blue|sky|cyan|violet|purple|pink|green|yellow|amber|orange)-\d{2,3}(?:\/\d+)?\b/,
  },
  {
    name: "legacy white/black opacity color",
    pattern: /\b(?:text-white|bg-black\/\d+|border-white\/\d+)\b/,
  },
  {
    name: "unapproved large radius",
    pattern: /\brounded-(?:xl|2xl|3xl)\b/,
  },
  {
    name: "raw Tailwind shadow",
    pattern: /\bshadow-(?:xs|sm|md|lg|xl|2xl)\b/,
  },
  {
    name: "raw gradient utility",
    pattern: /\bbg-gradient-to-[trbl]{1,2}\b/,
  },
  {
    name: "arbitrary hex color",
    pattern: /#[0-9a-fA-F]{3,8}\b/,
  },
];

function walk(dir, files = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      walk(fullPath, files);
      continue;
    }

    if (entry.name === "routeTree.gen.ts") continue;
    if (checkedExtensions.has(extname(entry.name))) files.push(fullPath);
  }

  return files;
}

const violations = [];

for (const file of walk(root)) {
  const normalized = relative(".", file).replaceAll("\\", "/");
  if (allowedFiles.has(normalized)) continue;

  const lines = readFileSync(file, "utf8").split(/\r?\n/);
  lines.forEach((line, index) => {
    for (const rule of bannedPatterns) {
      if (rule.pattern.test(line)) {
        violations.push(`${normalized}:${index + 1} ${rule.name}: ${line.trim()}`);
      }
    }
  });
}

if (violations.length) {
  console.error("Design audit failed. Use EGDATA tokens/components instead of raw visual classes.");
  console.error(violations.join("\n"));
  process.exit(1);
}

console.log("Design audit passed.");
