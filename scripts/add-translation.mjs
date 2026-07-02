import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const sourceLocale = "en-US";
const localesDir = path.join(process.cwd(), "src", "locales");
const translationFile = "translation.json";

function usage() {
  console.error('Usage: node scripts/add-translation.mjs <locale> <dot.key> "<localized string>"');
  console.error(
    'Example: node scripts/add-translation.mjs es-ES "notifications.meta.title" "Notificaciones | egdata.app"',
  );
}

function fail(message) {
  console.error(`Error: ${message}`);
  process.exit(1);
}

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function isRecord(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function extractPlaceholders(value) {
  return [...value.matchAll(/{{\s*([\w.-]+)\s*}}/g)].map((match) => match[1]).sort();
}

function extractTags(value) {
  return [...value.matchAll(/<\/?([A-Za-z][\w:-]*|\d+)(?:\s[^>]*)?>/g)]
    .map((match) => match[0])
    .sort();
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

function formatList(values) {
  return values.length ? values.join(", ") : "(none)";
}

function validateValue(sourceValue, targetValue, key) {
  const placeholderDiff = compareLists(
    extractPlaceholders(sourceValue),
    extractPlaceholders(targetValue),
  );

  if (placeholderDiff.missing.length || placeholderDiff.extra.length) {
    fail(
      `${key} placeholder mismatch; missing ${formatList(placeholderDiff.missing)}; extra ${formatList(
        placeholderDiff.extra,
      )}`,
    );
  }

  const tagDiff = compareLists(extractTags(sourceValue), extractTags(targetValue));

  if (tagDiff.missing.length || tagDiff.extra.length) {
    fail(
      `${key} tag mismatch; missing ${formatList(tagDiff.missing)}; extra ${formatList(
        tagDiff.extra,
      )}`,
    );
  }
}

function parseStringLiteral(content, start) {
  let index = start + 1;

  while (index < content.length) {
    const char = content[index];

    if (char === "\\") {
      index += 2;
      continue;
    }

    if (char === '"') {
      const raw = content.slice(start, index + 1);

      return {
        index: index + 1,
        value: JSON.parse(raw),
      };
    }

    index += 1;
  }

  throw new Error("Unterminated string literal");
}

function skipWhitespace(content, index) {
  while (index < content.length && /\s/.test(content[index])) {
    index += 1;
  }

  return index;
}

function findDuplicateJsonKeys(content) {
  const duplicates = [];

  function parseValue(index, currentPath) {
    index = skipWhitespace(content, index);

    if (content[index] === "{") {
      return parseObject(index, currentPath);
    }

    if (content[index] === "[") {
      return parseArray(index, currentPath);
    }

    if (content[index] === '"') {
      return parseStringLiteral(content, index).index;
    }

    while (index < content.length && !/[\s,\]}]/.test(content[index])) {
      index += 1;
    }

    return index;
  }

  function parseObject(index, currentPath) {
    const keys = new Set();

    index += 1;

    while (index < content.length) {
      index = skipWhitespace(content, index);

      if (content[index] === "}") {
        return index + 1;
      }

      const key = parseStringLiteral(content, index);
      const nextPath = currentPath ? `${currentPath}.${key.value}` : key.value;

      if (keys.has(key.value)) {
        duplicates.push(nextPath);
      }

      keys.add(key.value);
      index = skipWhitespace(content, key.index);

      if (content[index] !== ":") {
        throw new Error(`Expected ":" after ${nextPath}`);
      }

      index = parseValue(index + 1, nextPath);
      index = skipWhitespace(content, index);

      if (content[index] === ",") {
        index += 1;
        continue;
      }

      if (content[index] === "}") {
        return index + 1;
      }
    }

    throw new Error(`Unterminated object at ${currentPath || "<root>"}`);
  }

  function parseArray(index, currentPath) {
    let itemIndex = 0;

    index += 1;

    while (index < content.length) {
      index = skipWhitespace(content, index);

      if (content[index] === "]") {
        return index + 1;
      }

      index = parseValue(index, `${currentPath}[${itemIndex}]`);
      itemIndex += 1;
      index = skipWhitespace(content, index);

      if (content[index] === ",") {
        index += 1;
        continue;
      }

      if (content[index] === "]") {
        return index + 1;
      }
    }

    throw new Error(`Unterminated array at ${currentPath}`);
  }

  parseValue(0, "");

  return duplicates;
}

async function readJsonFile(file) {
  const content = await readFile(file, "utf8");
  let data;

  try {
    data = JSON.parse(content);
  } catch (error) {
    fail(`${file} is not valid JSON: ${error.message}`);
  }

  const duplicates = findDuplicateJsonKeys(content);

  if (duplicates.length) {
    fail(`${file} has duplicate keys: ${duplicates.join(", ")}`);
  }

  return data;
}

function getPathValue(data, segments) {
  let node = data;

  for (const segment of segments) {
    if (!isRecord(node) || !hasOwn(node, segment)) {
      return { exists: false, value: undefined };
    }

    node = node[segment];
  }

  return { exists: true, value: node };
}

function validateTargetParents(target, segments) {
  let node = target;
  const parents = segments.slice(0, -1);
  const pathSegments = [];

  for (const segment of parents) {
    pathSegments.push(segment);

    if (!isRecord(node) || !hasOwn(node, segment)) {
      return;
    }

    node = node[segment];

    if (!isRecord(node)) {
      fail(`${pathSegments.join(".")} exists in target locale but is not an object`);
    }
  }
}

function updateInSourceOrder(sourceNode, targetNode, segments, value) {
  if (!segments.length) {
    return value;
  }

  const [segment, ...rest] = segments;

  if (!isRecord(sourceNode)) {
    fail(`${segment} is not inside an object in ${sourceLocale}`);
  }

  if (typeof targetNode !== "undefined" && !isRecord(targetNode)) {
    fail(`${segment} cannot be added because the target parent is not an object`);
  }

  const targetObject = targetNode ?? {};
  const result = {};

  for (const sourceKey of Object.keys(sourceNode)) {
    if (sourceKey === segment) {
      result[sourceKey] = updateInSourceOrder(
        sourceNode[sourceKey],
        targetObject[sourceKey],
        rest,
        value,
      );
    } else if (hasOwn(targetObject, sourceKey)) {
      result[sourceKey] = targetObject[sourceKey];
    }
  }

  for (const targetKey of Object.keys(targetObject)) {
    if (!hasOwn(result, targetKey)) {
      result[targetKey] = targetObject[targetKey];
    }
  }

  return result;
}

function assertSourceKey(source, segments, key) {
  const sourceValue = getPathValue(source, segments);

  if (!sourceValue.exists) {
    fail(`${key} does not exist in ${sourceLocale}/${translationFile}`);
  }

  if (typeof sourceValue.value !== "string") {
    fail(`${key} exists in ${sourceLocale}, but it is not a string translation`);
  }

  return sourceValue.value;
}

const [locale, key, ...valueParts] = process.argv.slice(2);

if (!locale || !key || !valueParts.length) {
  usage();
  process.exit(1);
}

if (locale === sourceLocale) {
  fail(`Refusing to edit source locale ${sourceLocale}`);
}

const translation = valueParts.join(" ");
const keySegments = key.split(".");

if (keySegments.some((segment) => !segment)) {
  fail(`Invalid key path: ${key}`);
}

const sourceFile = path.join(localesDir, sourceLocale, translationFile);
const targetFile = path.join(localesDir, locale, translationFile);
const source = await readJsonFile(sourceFile);
const target = await readJsonFile(targetFile);
const sourceValue = assertSourceKey(source, keySegments, key);
const existingTargetValue = getPathValue(target, keySegments);

if (existingTargetValue.exists && typeof existingTargetValue.value !== "string") {
  fail(`${key} exists in ${locale}, but it is not a string translation`);
}

validateTargetParents(target, keySegments);
validateValue(sourceValue, translation, key);

const updated = updateInSourceOrder(source, target, keySegments, translation);

await writeFile(targetFile, `${JSON.stringify(updated, null, 2)}\n`, "utf8");

console.log(`${existingTargetValue.exists ? "Updated" : "Added"} ${locale}.${key}`);
