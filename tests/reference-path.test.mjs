import assert from "node:assert/strict";
import test from "node:test";

import {
  getApiHref,
  getApiRedirectHref,
  getApiRootHref,
  getReferenceTargetPath,
} from "../scripts/reference-path.mjs";

test("builds a crate-only Rustdoc target", () => {
  assert.equal(getReferenceTargetPath("task"), "task/index.html");
});

test("builds a top-level Rustdoc target", () => {
  assert.equal(
    getReferenceTargetPath("virtual_file_system", "struct", "File"),
    "virtual_file_system/struct.File.html",
  );
});

test("appends an associated-item fragment to the Rustdoc target", () => {
  assert.equal(
    getReferenceTargetPath(
      "virtual_file_system",
      "struct",
      "File",
      "method.open",
    ),
    "virtual_file_system/struct.File.html#method.open",
  );
});

test("builds API page URLs under /api/", () => {
  assert.equal(
    getApiHref("guest", "wasm/struct.Example.html#method.run"),
    "/api/guest/wasm/struct.Example.html#method.run",
  );
  assert.equal(getApiRootHref("host"), "/api/host/xila/index.html");
  assert.equal(getApiRootHref("guest"), "/api/guest/wasm/index.html");
  assert.throws(() => getApiHref("browser", "x/index.html"));
});

test("redirects a viewer path to the API page and keeps the fragment", () => {
  const path = new URLSearchParams(
    "path=virtual_file_system%2Fstruct.File.html%23method.open",
  ).get("path");
  assert.equal(
    getApiRedirectHref("host", path),
    "/api/host/virtual_file_system/struct.File.html#method.open",
  );
});

test("does not redirect outside the API directory", () => {
  assert.equal(getApiRedirectHref("host", null), null);
  assert.equal(getApiRedirectHref("host", ""), null);
  assert.equal(getApiRedirectHref("host", "../../index.html"), null);
  assert.equal(getApiRedirectHref("host", "//example.com/x.html"), null);
  assert.equal(getApiRedirectHref("guest", "https://example.com/"), null);
});

test("rejects a member without a top-level symbol", () => {
  assert.throws(() =>
    getReferenceTargetPath("task", undefined, undefined, "method.run"),
  );
});

test("rejects kind without symbol", () => {
  assert.throws(() => getReferenceTargetPath("task", "struct"));
});

test("rejects symbol without kind", () => {
  assert.throws(() => getReferenceTargetPath("task", undefined, "Manager"));
});
