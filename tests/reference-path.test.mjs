import assert from "node:assert/strict";
import test from "node:test";

import {
  getApiFrameHref,
  getApiFrameRootHref,
  getApiFrameSource,
  getApiHref,
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

test("builds the source URL that the frame page loads for a path", () => {
  assert.equal(
    getApiFrameSource("host/xila/task/struct.Manager.html#method.spawn"),
    "/api/host/xila/task/struct.Manager.html#method.spawn",
  );
  assert.equal(
    getApiFrameSource("guest/wasm/index.html"),
    "/api/guest/wasm/index.html",
  );
});

test("rejects a path that does not address an API page", () => {
  for (const value of [
    null,
    "",
    "host",
    "other/index.html",
    "../index.html",
    "host/../../index.html",
    "host/..%2F..%2Findex.html",
    "//example.com/x.html",
    "https://example.com/",
  ]) {
    assert.equal(getApiFrameSource(value), null, String(value));
  }
});

test("sends a viewer path to the frame page and keeps the fragment", () => {
  const path = new URLSearchParams(
    "path=virtual_file_system%2Fstruct.File.html%23method.open",
  ).get("path");
  assert.equal(
    getApiFrameHref("host", path),
    "/reference/api/?path=host%2Fvirtual_file_system%2Fstruct.File.html%23method.open",
  );
});

test("does not send a path outside the API directory to the frame page", () => {
  assert.equal(getApiFrameHref("host", null), null);
  assert.equal(getApiFrameHref("host", ""), null);
  assert.equal(getApiFrameHref("host", "../../index.html"), null);
  assert.equal(getApiFrameHref("host", "../guest/wasm/index.html"), null);
  assert.equal(getApiFrameHref("host", "..%2F..%2Findex.html"), null);
  assert.equal(getApiFrameHref("host", "//example.com/x.html"), null);
  assert.equal(getApiFrameHref("guest", "https://example.com/"), null);
});

test("builds the frame page URL of the root crate page of an API", () => {
  assert.equal(
    getApiFrameRootHref("host"),
    "/reference/api/?path=host%2Fxila%2Findex.html",
  );
  assert.equal(
    getApiFrameRootHref("guest"),
    "/reference/api/?path=guest%2Fwasm%2Findex.html",
  );
  assert.throws(() => getApiFrameRootHref("browser"));
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
