import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const SCRIPT = fs.readFileSync(
  new URL("../scripts/api-shell/shell.js", import.meta.url),
  "utf8",
);

// Runs the frame script with the given environment and returns the recorded
// actions, the storage and the event listeners that it registered.
function run({
  framed = true,
  pathname = "/api/host/xila/index.html",
  hash = "",
  storage = {},
  switchTheme = null,
  brokenStorage = false,
  userAgent = "Mozilla/5.0 (X11; Linux x86_64)",
  parentPathname = "/reference/api/",
} = {}) {
  const calls = { replace: [], replaceState: [], titles: [], themes: [] };
  const listeners = {};
  const parent = {
    location: {
      get pathname() {
        // A parent on another origin denies access to its location.
        if (parentPathname === null) throw new Error("SecurityError");
        return parentPathname;
      },
    },
    history: {
      replaceState: (data, unused, url) => calls.replaceState.push(String(url)),
    },
    document: {
      title: "API reference",
      set title(value) {
        calls.titles.push(value);
      },
    },
  };
  const localStorage = brokenStorage
    ? {
        getItem() {
          throw new Error("denied");
        },
        setItem() {
          throw new Error("denied");
        },
      }
    : {
        getItem: (key) => (key in storage ? storage[key] : null),
        setItem: (key, value) => {
          storage[key] = String(value);
        },
      };
  const sandbox = {
    location: {
      pathname,
      hash,
      origin: "https://www.xila.dev",
      replace: (url) => calls.replace.push(String(url)),
    },
    localStorage,
    navigator: { userAgent },
    document: { title: "xila::task - Rust" },
    addEventListener: (name, listener) => {
      (listeners[name] ??= []).push(listener);
    },
    matchMedia: () => ({ matches: false }),
    URL,
  };
  if (switchTheme) sandbox.switchTheme = (name) => calls.themes.push(name);
  sandbox.window = sandbox;
  sandbox.self = sandbox;
  sandbox.top = framed ? {} : sandbox;
  sandbox.parent = framed ? parent : sandbox;
  vm.runInNewContext(SCRIPT, sandbox);
  const fire = (name, event = {}) =>
    (listeners[name] ?? []).forEach((listener) => listener(event));
  return { calls, listeners, fire, storage, sandbox };
}

test("sends a direct visit to the frame page, with the fragment", () => {
  const { calls } = run({
    framed: false,
    pathname: "/api/host/task/struct.Manager.html",
    hash: "#method.spawn",
  });
  assert.deepEqual(calls.replace, [
    "https://www.xila.dev/reference/api/?path=host%2Ftask%2Fstruct.Manager.html%23method.spawn",
  ]);
});

test("does not redirect a page outside the host and guest directories", () => {
  for (const pathname of [
    "/api/other/index.html",
    "/api/host/../guest/wasm/index.html",
    "/api/host/..%2F..%2Findex.html",
    "/other/index.html",
  ]) {
    const { calls } = run({ framed: false, pathname });
    assert.deepEqual(calls.replace, [], pathname);
  }
});

test("syncs the wrapper URL and title when framed", () => {
  const { calls, fire, sandbox } = run({
    framed: true,
    pathname: "/api/guest/wasm/index.html",
  });
  assert.deepEqual(calls.replaceState, [
    "https://www.xila.dev/reference/api/?path=guest%2Fwasm%2Findex.html",
  ]);
  assert.deepEqual(calls.titles, ["xila::task - Rust"]);

  sandbox.location.hash = "#method.run";
  fire("hashchange");
  assert.equal(
    calls.replaceState[1],
    "https://www.xila.dev/reference/api/?path=guest%2Fwasm%2Findex.html%23method.run",
  );
  assert.equal(calls.replaceState.length, 2);
});

test("leaves a search engine crawler on the API page", () => {
  for (const userAgent of [
    "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
    "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)",
  ]) {
    const { calls } = run({
      framed: false,
      pathname: "/api/host/task/struct.Manager.html",
      userAgent,
    });
    assert.deepEqual(calls.replace, [], userAgent);
  }
});

test("does not sync a parent that is not the frame page", () => {
  for (const parentPathname of ["/reference/host/", null]) {
    const { calls } = run({ framed: true, parentPathname });
    assert.deepEqual(calls.replaceState, [], String(parentPathname));
    assert.deepEqual(calls.titles, [], String(parentPathname));
  }
});

test("opens links that leave the API in the top window", () => {
  const { fire } = run({ framed: true });
  const click = (href, target = "") => {
    const url = new URL(href, "https://www.xila.dev/api/host/xila/index.html");
    const link = { origin: url.origin, pathname: url.pathname, target };
    fire("click", { target: { closest: () => link } });
    return link.target;
  };
  assert.equal(click("https://doc.rust-lang.org/std/index.html"), "_top");
  assert.equal(click("/reference/"), "_top");
  assert.equal(click("../src/xila/lib.rs.html#1-10"), "");
  assert.equal(click("../task/index.html"), "");
  assert.equal(click("https://doc.rust-lang.org/", "_blank"), "_blank");
  assert.doesNotThrow(() => fire("click", { target: { closest: () => null } }));
});

test("copies an explicit site theme to rustdoc", () => {
  const { storage } = run({ storage: { "starlight-theme": "dark" } });
  assert.equal(storage["rustdoc-use-system-theme"], "false");
  assert.equal(storage["rustdoc-theme"], "dark");
});

test("makes rustdoc follow the system when the site does", () => {
  const { storage } = run({
    storage: {
      "starlight-theme": "",
      "rustdoc-use-system-theme": "false",
      "rustdoc-theme": "light",
    },
  });
  assert.equal(storage["rustdoc-use-system-theme"], "true");
});

test("keeps a dark rustdoc theme on a dark site", () => {
  const { storage } = run({
    storage: {
      "starlight-theme": "dark",
      "rustdoc-use-system-theme": "false",
      "rustdoc-theme": "ayu",
    },
  });
  assert.equal(storage["rustdoc-theme"], "ayu");
});

test("applies a site theme change to the framed page without a reload", () => {
  const { calls, storage, fire } = run({
    storage: { "starlight-theme": "light" },
    switchTheme: true,
  });
  assert.equal(storage["rustdoc-theme"], "light");
  // The browser updates the stored value before the other documents of the
  // origin receive the storage event.
  storage["starlight-theme"] = "dark";
  fire("storage", { key: "starlight-theme", newValue: "dark" });
  assert.equal(storage["rustdoc-theme"], "dark");
  assert.deepEqual(calls.themes, ["dark"]);
});

test("ignores storage events of other keys", () => {
  const { storage, fire } = run({
    storage: { "starlight-theme": "light" },
    switchTheme: true,
  });
  fire("storage", { key: "other-key", newValue: "dark" });
  assert.equal(storage["rustdoc-theme"], "light");
});

test("copies a theme chosen in rustdoc back to the site on page hide", () => {
  const { storage, fire } = run({ storage: { "starlight-theme": "light" } });
  storage["rustdoc-theme"] = "ayu";
  fire("pagehide");
  assert.equal(storage["starlight-theme"], "dark");
  storage["rustdoc-use-system-theme"] = "true";
  fire("pagehide");
  assert.equal(storage["starlight-theme"], "");
});

test("applies the site theme again to a page restored from the cache", () => {
  const { storage, fire } = run({ storage: { "starlight-theme": "light" } });
  storage["starlight-theme"] = "dark";
  fire("pageshow", { persisted: true });
  assert.equal(storage["rustdoc-theme"], "dark");
});

test("works without storage", () => {
  assert.doesNotThrow(() => run({ brokenStorage: true, framed: false }));
});
