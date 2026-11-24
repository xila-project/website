import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const SCRIPT = fs.readFileSync(
  new URL("../scripts/api-shell/shell.js", import.meta.url),
  "utf8",
);

// Runs the theme script with the given storage and returns the storage and
// the event listeners that it registered.
function run(initial) {
  const storage = new Map(Object.entries(initial));
  const listeners = {};
  vm.runInNewContext(SCRIPT, {
    localStorage: {
      getItem: (key) => (storage.has(key) ? storage.get(key) : null),
      setItem: (key, value) => storage.set(key, String(value)),
    },
    addEventListener: (name, listener) => (listeners[name] = listener),
  });
  return { storage, listeners };
}

test("copies an explicit site theme to rustdoc", () => {
  const { storage } = run({ "starlight-theme": "dark" });
  assert.equal(storage.get("rustdoc-use-system-theme"), "false");
  assert.equal(storage.get("rustdoc-theme"), "dark");
});

test("makes rustdoc follow the system when the site does", () => {
  const { storage } = run({
    "starlight-theme": "",
    "rustdoc-use-system-theme": "false",
    "rustdoc-theme": "light",
  });
  assert.equal(storage.get("rustdoc-use-system-theme"), "true");
});

test("keeps a dark rustdoc theme on a dark site", () => {
  const { storage } = run({
    "starlight-theme": "dark",
    "rustdoc-use-system-theme": "false",
    "rustdoc-theme": "ayu",
  });
  assert.equal(storage.get("rustdoc-theme"), "ayu");
});

test("copies a theme chosen in rustdoc back to the site on page hide", () => {
  const { storage, listeners } = run({ "starlight-theme": "light" });
  storage.set("rustdoc-theme", "ayu");
  listeners.pagehide();
  assert.equal(storage.get("starlight-theme"), "dark");
  storage.set("rustdoc-use-system-theme", "true");
  listeners.pagehide();
  assert.equal(storage.get("starlight-theme"), "");
});

test("applies the site theme again to a page restored from the cache", () => {
  const { storage, listeners } = run({ "starlight-theme": "light" });
  storage.set("starlight-theme", "dark");
  listeners.pageshow({ persisted: true });
  assert.equal(storage.get("rustdoc-theme"), "dark");
});

test("works without storage", () => {
  assert.doesNotThrow(() =>
    vm.runInNewContext(SCRIPT, {
      localStorage: {
        getItem() {
          throw new Error("denied");
        },
        setItem() {
          throw new Error("denied");
        },
      },
      addEventListener() {},
    }),
  );
});
