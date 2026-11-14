import assert from "node:assert/strict";
import test from "node:test";
import {
  sandboxCatalogGroups,
  sandboxCatalogTypes,
  validateSandboxCatalogSearch,
  updateSandboxCatalogSearch,
} from "../../src/lib/sandbox-catalog.ts";

test("groups are disjoint and retain Epic's legacy bundle spelling", () => {
  const types = sandboxCatalogGroups.flatMap((group) => [...group.types]);
  assert.equal(new Set(types).size, types.length);
  assert.equal(sandboxCatalogTypes({ group: "bundles", types: "" }), "BUNDLE,Bundle");
  assert.equal(sandboxCatalogTypes({ group: "games", types: "" }), "BASE_GAME,EDITION");
  assert.equal(sandboxCatalogTypes({ group: "dlc", types: "" }), "DLC");
});

test("All offers does not filter missing or unfamiliar catalog types", () => {
  assert.equal(sandboxCatalogTypes({ group: "all", types: "" }), undefined);
  const raw = validateSandboxCatalogSearch({ types: "FUTURE_TYPE,DLC,DLC", group: "games" });
  assert.equal(raw.group, "all");
  assert.equal(sandboxCatalogTypes(raw), "DLC,FUTURE_TYPE");
});

test("URL validation handles invalid pagination and malformed filter values", () => {
  assert.deepEqual(
    validateSandboxCatalogSearch({
      page: -4,
      pageSize: 50000,
      group: "invalid",
      types: [],
      view: "invalid",
      q: {},
    }),
    {
      page: 1,
      pageSize: 20,
      group: "all",
      types: "",
      view: "cards",
      q: "",
    },
  );
  assert.equal(validateSandboxCatalogSearch({ page: "2", pageSize: "40" }).page, 2);
  assert.equal(validateSandboxCatalogSearch({ page: Infinity }).page, 1);
  assert.equal(
    validateSandboxCatalogSearch({ types: "DLC,&page=5,BASE_GAME" }).types,
    "BASE_GAME,DLC",
  );
});

test("search/filter/page-size changes reset pagination; view changes retain it", () => {
  const current = validateSandboxCatalogSearch({ page: 4, group: "dlc", q: "pack" });
  assert.equal(updateSandboxCatalogSearch(current, { q: "edition" }).page, 1);
  assert.equal(updateSandboxCatalogSearch(current, { group: "games" }).page, 1);
  assert.equal(updateSandboxCatalogSearch(current, { pageSize: 40 }).page, 1);
  assert.equal(updateSandboxCatalogSearch(current, { view: "table" }).page, 4);
  const raw = updateSandboxCatalogSearch(current, { types: "ADD_ON" });
  assert.equal(raw.group, "all");
  assert.equal(raw.page, 1);
  assert.equal(updateSandboxCatalogSearch(raw, { group: "bundles" }).types, "");
});
