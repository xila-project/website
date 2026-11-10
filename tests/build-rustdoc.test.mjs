import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { buildRustdoc } from "../scripts/build-rustdoc.mjs";

function createRoot(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "xila-rustdoc-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}

function writeFile(file, contents) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, contents);
}

// Point both checkouts at missing directories so the fixture never picks up a
// real sibling checkout of Core or Applications.
function missingCheckouts(root) {
  return {
    XILA_CORE_PATH: path.join(root, "missing-core"),
    XILA_APPLICATIONS_PATH: path.join(root, "missing-applications"),
  };
}

test("stages prebuilt host and guest Rustdoc into separate directories", (t) => {
  const root = createRoot(t);
  const host = path.join(root, "host-doc");
  const guest = path.join(root, "guest-doc");
  writeFile(path.join(host, "xila", "index.html"), "host");
  writeFile(path.join(guest, "wasm", "index.html"), "guest");
  const output = path.join(root, "dist", "rustdoc");
  writeFile(path.join(output, "host", "stale.html"), "stale");

  const result = buildRustdoc({
    root,
    output,
    environment: {
      ...missingCheckouts(root),
      XILA_HOST_RUSTDOC_DIR: host,
      XILA_GUEST_RUSTDOC_DIR: guest,
    },
  });

  assert.deepEqual(result, { host: "copied", guest: "copied" });
  assert.equal(
    fs.readFileSync(path.join(output, "host", "xila", "index.html"), "utf8"),
    "host",
  );
  assert.equal(
    fs.readFileSync(path.join(output, "guest", "wasm", "index.html"), "utf8"),
    "guest",
  );
  assert.equal(fs.existsSync(path.join(output, "host", "stale.html")), false);
});

test("skips Rustdoc without checkouts unless strict mode is enabled", (t) => {
  const root = createRoot(t);
  const output = path.join(root, "dist", "rustdoc");

  assert.deepEqual(
    buildRustdoc({ root, output, environment: missingCheckouts(root) }),
    { host: "skipped", guest: "skipped" },
  );
  assert.equal(fs.existsSync(output), false);

  assert.throws(
    () =>
      buildRustdoc({
        root,
        output,
        environment: { ...missingCheckouts(root), XILA_STRICT_RUSTDOC: "1" },
      }),
    /Missing core checkout for host Rustdoc/,
  );
});

test("rejects a prebuilt directory without the expected crate index", (t) => {
  const root = createRoot(t);
  const host = path.join(root, "host-doc");
  writeFile(path.join(host, "other", "index.html"), "other");

  assert.throws(
    () =>
      buildRustdoc({
        root,
        output: path.join(root, "dist", "rustdoc"),
        environment: { ...missingCheckouts(root), XILA_HOST_RUSTDOC_DIR: host },
      }),
    /does not contain xila\/index\.html/,
  );
});
