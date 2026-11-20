import assert from "node:assert/strict";
import test from "node:test";
import { hasMessage, translate, type Catalog } from "../../src/i18n/catalog.ts";

const catalog: Catalog = {
  common: {
    appName: "EGDATA",
    search: "Search",
    greeting: "Hello {{name}}, welcome to {{place}}",
    untouched: "Hi {{name}}",
  },
  builds: {
    timeline: {
      clusteredBuilds_one: "{{count}} build observed near this time",
      clusteredBuilds_other: "{{count}} builds observed near this time",
    },
  },
  plural: {
    builds_one: "{{count}} сборка",
    builds_few: "{{count}} сборки",
    builds_many: "{{count}} сборок",
  },
  incomplete: {
    onlyOther_other: "other form",
  },
};

test("resolves nested dot paths", () => {
  assert.equal(translate(catalog, "en-US", "common.appName"), "EGDATA");
  assert.equal(
    translate(catalog, "en-US", "builds.timeline.clusteredBuilds_one"),
    "{{count}} build observed near this time",
  );
});

test("interpolates placeholders and leaves unknown ones alone", () => {
  assert.equal(
    translate(catalog, "en-US", "common.greeting", { name: "Ada", place: "EGDATA" }),
    "Hello Ada, welcome to EGDATA",
  );
  assert.equal(translate(catalog, "en-US", "common.untouched"), "Hi {{name}}");
  assert.equal(translate(catalog, "en-US", "common.untouched", { name: "Ada" }), "Hi Ada");
});

test("returns undefined for missing keys", () => {
  assert.equal(translate(catalog, "en-US", "common.missing"), undefined);
  assert.equal(translate(catalog, "en-US", "common.search.deeper"), undefined);
  assert.equal(hasMessage(catalog, "common.search"), true);
  assert.equal(hasMessage(catalog, "common.missing"), false);
});

test("selects the plural category for the locale", () => {
  assert.equal(
    translate(catalog, "en-US", "builds.timeline.clusteredBuilds", { count: 1 }),
    "1 build observed near this time",
  );
  assert.equal(
    translate(catalog, "en-US", "builds.timeline.clusteredBuilds", { count: 3 }),
    "3 builds observed near this time",
  );
  assert.equal(translate(catalog, "ru", "plural.builds", { count: 1 }), "1 сборка");
  assert.equal(translate(catalog, "ru", "plural.builds", { count: 2 }), "2 сборки");
  assert.equal(translate(catalog, "ru", "plural.builds", { count: 5 }), "5 сборок");
});

test("falls back to the _other form and then the plain key", () => {
  assert.equal(translate(catalog, "ru", "incomplete.onlyOther", { count: 2 }), "other form");
  assert.equal(translate(catalog, "en-US", "common.search", { count: 2 }), "Search");
});

test("ignores non numeric counts", () => {
  assert.equal(translate(catalog, "en-US", "common.search", { count: "2" }), "Search");
});
