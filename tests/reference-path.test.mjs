import assert from "node:assert/strict";
import test from "node:test";

import {
  getReferenceDefaultIframeSrc,
  getReferenceIframeSrc,
  getReferenceTargetPath,
  getReferenceViewerHref,
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

test("keeps the Rustdoc fragment inside the encoded viewer path", () => {
  assert.equal(
    getReferenceViewerHref(
      "host",
      "virtual_file_system/struct.File.html#method.open",
    ),
    "/reference/host/?path=virtual_file_system%2Fstruct.File.html%23method.open",
  );
});

test("restores the Rustdoc fragment when building the iframe URL", () => {
  assert.equal(
    getReferenceIframeSrc("guest", "wasm/struct.Example.html#method.run"),
    "/rustdoc/guest/wasm/struct.Example.html#method.run",
  );
  assert.equal(
    getReferenceDefaultIframeSrc("host"),
    "/rustdoc/host/xila/index.html",
  );
  assert.equal(
    getReferenceDefaultIframeSrc("guest"),
    "/rustdoc/guest/wasm/index.html",
  );
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
