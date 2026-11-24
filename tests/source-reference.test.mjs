import assert from "node:assert/strict";
import test from "node:test";

import { getSourceHref } from "../scripts/source-reference.mjs";

test("Core code references preserve the original default repository", () => {
  assert.equal(
    getSourceHref("core", "subsystems/time/src/manager.rs"),
    "https://github.com/xila-project/core/tree/main/subsystems/time/src/manager.rs",
  );
});

test("moved source references link to the correct repository", () => {
  assert.equal(
    getSourceHref("applications", "executables/wasm/src/lib.rs"),
    "https://github.com/xila-project/applications/tree/main/executables/wasm/src/lib.rs",
  );
  assert.equal(
    getSourceHref("platforms", "examples/wasm/src/main.rs"),
    "https://github.com/xila-project/platforms/tree/main/examples/wasm/src/main.rs",
  );
});

test("source links reject unknown repositories and path traversal", () => {
  assert.throws(() => getSourceHref("unknown", "Cargo.toml"));
  assert.throws(() => getSourceHref("core", "../secret"));
  assert.throws(() => getSourceHref("core", "/etc/passwd"));
  assert.throws(() => getSourceHref("core", "foo//bar"));
});
