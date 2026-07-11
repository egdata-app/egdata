import assert from "node:assert/strict";
import test from "node:test";
import { formatBuildVersion } from "../../src/lib/format-build-version.ts";

test("returns the version before metadata", () => {
  assert.equal(
    formatBuildVersion("41.10-CL-55227503-Windows+metadata"),
    "41.10-CL-55227503-Windows",
  );
});

test("removes a Fortnite release prefix", () => {
  assert.equal(
    formatBuildVersion("++Fortnite+Release-41.10-CL-55227503-Windows"),
    "41.10-CL-55227503-Windows",
  );
});

test("removes a release prefix with a hash app name", () => {
  assert.equal(
    formatBuildVersion("++aa31f9e94e844b299ca757d1d0b97a09+Release-41.10-CL-55227503-Windows"),
    "41.10-CL-55227503-Windows",
  );
});

test("preserves versions without metadata or a release prefix", () => {
  assert.equal(formatBuildVersion("1.02"), "1.02");
});
