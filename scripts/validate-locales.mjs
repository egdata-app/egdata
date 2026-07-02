import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const sourceLocale = "en-US";
const localesDir = path.join(process.cwd(), "src", "locales");
const translationFile = "translation.json";

function extractPlaceholders(value) {
  return [...value.matchAll(/{{\s*([\w.-]+)\s*}}/g)].map((match) => match[1]).sort();
}

function extractTags(value) {
  return [...value.matchAll(/<\/?([A-Za-z][\w:-]*|\d+)(?:\s[^>]*)?>/g)]
    .map((match) => match[0])
    .sort();
}

function formatList(values, limit = 25) {
  if (!values.length) {
    return "(none)";
  }

  const visibleValues = values.slice(0, limit);
  const remainingCount = values.length - visibleValues.length;
  const suffix = remainingCount > 0 ? `, ...and ${remainingCount} more` : "";

  return `${visibleValues.join(", ")}${suffix}`;
}

function countValues(values) {
  const counts = new Map();

  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return counts;
}

function compareLists(source, target) {
  const sourceCounts = countValues(source);
  const targetCounts = countValues(target);
  const missing = [];
  const extra = [];

  for (const [item, sourceCount] of sourceCounts) {
    const targetCount = targetCounts.get(item) ?? 0;

    for (let index = targetCount; index < sourceCount; index += 1) {
      missing.push(item);
    }
  }

  for (const [item, targetCount] of targetCounts) {
    const sourceCount = sourceCounts.get(item) ?? 0;

    for (let index = sourceCount; index < targetCount; index += 1) {
      extra.push(item);
    }
  }

  return { missing, extra };
}

function flattenTranslations(value, prefix = []) {
  if (typeof value === "string") {
    return [{ key: prefix.join("."), value, type: "string" }];
  }

  if (value && typeof value === "object" && !Array.isArray(value)) {
    return Object.entries(value).flatMap(([key, child]) =>
      flattenTranslations(child, [...prefix, key]),
    );
  }

  return [{ key: prefix.join("."), value, type: Array.isArray(value) ? "array" : typeof value }];
}

async function readTranslation(locale) {
  const file = path.join(localesDir, locale, translationFile);
  const content = await readFile(file, "utf8");

  return JSON.parse(content);
}

function validateLocale(locale, sourceEntries, targetEntries) {
  const errors = [];
  const sourceKeys = sourceEntries.map((entry) => entry.key);
  const targetKeys = targetEntries.map((entry) => entry.key);
  const targetByKey = new Map(targetEntries.map((entry) => [entry.key, entry]));
  const { missing, extra } = compareLists(sourceKeys, targetKeys);

  if (missing.length) {
    errors.push(`Missing keys: ${formatList(missing)}`);
  }

  if (extra.length) {
    errors.push(`Extra keys: ${formatList(extra)}`);
  }

  if (!missing.length && !extra.length) {
    for (let index = 0; index < sourceKeys.length; index += 1) {
      if (sourceKeys[index] !== targetKeys[index]) {
        errors.push(
          `Key order differs at position ${index + 1}: expected ${sourceKeys[index]}, found ${
            targetKeys[index]
          }`,
        );
        break;
      }
    }
  }

  for (const sourceEntry of sourceEntries) {
    const targetEntry = targetByKey.get(sourceEntry.key);

    if (!targetEntry) continue;

    if (sourceEntry.type !== targetEntry.type) {
      errors.push(
        `${sourceEntry.key}: expected ${sourceEntry.type} value, found ${targetEntry.type}`,
      );
      continue;
    }

    if (sourceEntry.type !== "string") continue;

    const sourcePlaceholders = extractPlaceholders(sourceEntry.value);
    const targetPlaceholders = extractPlaceholders(targetEntry.value);
    const placeholderDiff = compareLists(sourcePlaceholders, targetPlaceholders);

    if (placeholderDiff.missing.length || placeholderDiff.extra.length) {
      errors.push(
        `${sourceEntry.key}: placeholder mismatch; missing ${formatList(
          placeholderDiff.missing,
        )}; extra ${formatList(placeholderDiff.extra)}`,
      );
    }

    const sourceTags = extractTags(sourceEntry.value);
    const targetTags = extractTags(targetEntry.value);
    const tagDiff = compareLists(sourceTags, targetTags);

    if (tagDiff.missing.length || tagDiff.extra.length) {
      errors.push(
        `${sourceEntry.key}: tag mismatch; missing ${formatList(tagDiff.missing)}; extra ${formatList(
          tagDiff.extra,
        )}`,
      );
    }
  }

  if (errors.length) {
    console.error(`\n${locale}: ${errors.length} validation error(s)`);
    for (const error of errors) {
      console.error(`- ${error}`);
    }
  } else {
    console.log(`${locale}: ok`);
  }

  return errors.length;
}

async function getLocalesToValidate() {
  const requestedLocales = process.argv.slice(2);

  if (requestedLocales.length) {
    return requestedLocales;
  }

  const entries = await readdir(localesDir, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((locale) => locale !== sourceLocale)
    .sort();
}

const source = await readTranslation(sourceLocale);
const sourceEntries = flattenTranslations(source);
const locales = await getLocalesToValidate();
let errorCount = 0;

for (const locale of locales) {
  const target = await readTranslation(locale);
  const targetEntries = flattenTranslations(target);
  errorCount += validateLocale(locale, sourceEntries, targetEntries);
}

if (errorCount > 0) {
  console.error(`\nLocale validation failed with ${errorCount} error(s).`);
  process.exitCode = 1;
} else {
  console.log(`\nLocale validation passed for ${locales.length} locale(s).`);
}
