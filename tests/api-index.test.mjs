import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  buildApiIndex,
  checkApiUrl,
  getApiSearchHref,
  parseApiTarget,
  readApiIndex,
  resolveApiTarget,
  writeApiIndex,
} from "../scripts/api-index.mjs";
import {
  createDirectory,
  writeRustdocFixture,
} from "./helpers/rustdoc-fixture.mjs";

function fixtureIndex(t) {
  const directory = createDirectory(t, "xila-api-index-");
  writeRustdocFixture(directory);
  return { directory, index: buildApiIndex(directory) };
}

test("indexes modules, items and member anchors from the sidebars", (t) => {
  const { index } = fixtureIndex(t);
  const host = index.apis.host;
  assert.deepEqual(host.items["task::Manager"], {
    url: "/api/host/task/struct.Manager.html",
    kind: "struct",
    anchors: ["method.spawn", "associatedconstant.ROOT"],
  });
  assert.equal(
    host.items["task::metrics"].url,
    "/api/host/task/metrics/index.html",
  );
  assert.equal(host.items["task::instantiate"].kind, "macro");
  assert.equal(host.items["xila"].kind, "mod");
  assert.equal(
    index.apis.guest.items["wasm::Window"].url,
    "/api/guest/wasm/struct.Window.html",
  );
});

test("maps re-exports and private module paths to canonical paths", (t) => {
  const { index } = fixtureIndex(t);
  assert.deepEqual(index.apis.host.aliases, {
    "task::environment_variable::EnvironmentVariable":
      "task::EnvironmentVariable",
    "xila::task": "task",
  });
});

test("writes and reads the index file", (t) => {
  const { directory } = fixtureIndex(t);
  const written = writeApiIndex(directory);
  assert.deepEqual(
    readApiIndex(path.join(directory, "api-index.json")),
    written,
  );
  assert.equal(readApiIndex(path.join(directory, "missing.json")), null);
  fs.writeFileSync(path.join(directory, "old.json"), '{"version":0}');
  assert.throws(
    () => readApiIndex(path.join(directory, "old.json")),
    /version/,
  );
});

test("parses targets and link texts", () => {
  assert.deepEqual(parseApiTarget("guest:wasm::Window#method.close"), {
    architecture: "guest",
    path: "wasm::Window",
    anchor: "method.close",
  });
  assert.deepEqual(parseApiTarget("`task::sleep()`"), {
    architecture: undefined,
    path: "task::sleep",
    anchor: undefined,
  });
  assert.equal(parseApiTarget("log::information!").path, "log::information");
});

test("resolves canonical paths, members, aliases and suffixes", (t) => {
  const { index } = fixtureIndex(t);
  const href = (target) => resolveApiTarget(index, target).href;
  assert.equal(href("task"), "/api/host/task/index.html");
  assert.equal(href("task::Manager"), "/api/host/task/struct.Manager.html");
  assert.equal(
    href("task::Manager::spawn"),
    "/api/host/task/struct.Manager.html#method.spawn",
  );
  assert.equal(
    href("task::Manager::ROOT"),
    "/api/host/task/struct.Manager.html#associatedconstant.ROOT",
  );
  assert.equal(
    href("xila::task::metrics::Metrics::spawned"),
    "/api/host/task/metrics/struct.Metrics.html#structfield.spawned",
  );
  assert.equal(
    href("task::environment_variable::EnvironmentVariable::get_name"),
    "/api/host/task/struct.EnvironmentVariable.html#method.get_name",
  );
  assert.equal(href("Metrics"), "/api/host/task/metrics/struct.Metrics.html");
  assert.equal(
    href("Window::close"),
    "/api/guest/wasm/struct.Window.html#method.close",
  );
  assert.equal(href("task::sleep()"), "/api/host/task/fn.sleep.html");
  assert.equal(
    href("task::Manager#implementations"),
    "/api/host/task/struct.Manager.html#implementations",
  );
});

test("reports unknown items, anchors and ambiguous paths", (t) => {
  const { index } = fixtureIndex(t);
  const error = (target) => resolveApiTarget(index, target).error;
  assert.match(error("task::Missing"), /unknown API item "task::Missing"/);
  assert.match(error("task::Manager::missing"), /unknown API item/);
  assert.match(error("task::Manager#method.missing"), /unknown anchor/);
  assert.match(
    error("task::Manager::spawn#method.spawn"),
    /member and an anchor/,
  );
  assert.match(
    error("Manager"),
    /ambiguous API path "Manager".*host:task::Manager, guest:wasm::Manager/,
  );
  assert.equal(
    resolveApiTarget(index, "guest:Manager").href,
    "/api/guest/wasm/struct.Manager.html",
  );
  assert.match(error("browser:task"), /unknown API item/);
  assert.match(error(""), /empty API path/);
});

test("checks API URLs and anchors", (t) => {
  const { index } = fixtureIndex(t);
  assert.equal(
    checkApiUrl(index, "/api/host/task/struct.Manager.html", "method.spawn"),
    null,
  );
  assert.equal(
    checkApiUrl(index, "/api/host/task/struct.Manager.html", "impl-Manager"),
    null,
  );
  assert.equal(
    checkApiUrl(index, "/api/host/task/struct.Manager.html", "method.stop"),
    "unknown anchor #method.stop",
  );
  assert.equal(
    checkApiUrl(index, "/api/host/abi_declarations/index.html"),
    "unknown API page",
  );
});

test("falls back to the rustdoc search", () => {
  assert.equal(
    getApiSearchHref("guest:wasm::Missing"),
    "/api/guest/wasm/index.html?search=wasm%3A%3AMissing",
  );
  assert.equal(
    getApiSearchHref("task::Missing"),
    "/api/host/xila/index.html?search=task%3A%3AMissing",
  );
});

test("links a required trait method to its declaration, not to an implementor", () => {
  const index = {
    version: 1,
    apis: {
      host: {
        items: {
          "task::Spawn": {
            url: "/api/host/task/trait.Spawn.html",
            kind: "trait",
            anchors: ["method.run", "tymethod.run", "method.provided"],
          },
          "task::Manager": {
            url: "/api/host/task/struct.Manager.html",
            kind: "struct",
            anchors: ["method.run", "tymethod.run"],
          },
        },
        aliases: {},
      },
    },
  };
  assert.equal(
    resolveApiTarget(index, "task::Spawn::run").href,
    "/api/host/task/trait.Spawn.html#tymethod.run",
  );
  assert.equal(
    resolveApiTarget(index, "task::Spawn::provided").href,
    "/api/host/task/trait.Spawn.html#method.provided",
  );
  assert.equal(
    resolveApiTarget(index, "task::Manager::run").href,
    "/api/host/task/struct.Manager.html#method.run",
  );
});
