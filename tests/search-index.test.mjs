import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import { buildApiIndex, writeApiIndex } from "../scripts/api-index.mjs";
import {
  apiSearchRecords,
  buildApiSearchIndex,
  getPagefindOptions,
} from "../scripts/search-index.mjs";
import {
  createDirectory,
  writeFile,
  writeRustdocFixture,
} from "./helpers/rustdoc-fixture.mjs";

function fixture(t) {
  const output = createDirectory(t, "xila-search-");
  const api = path.join(output, "api");
  writeRustdocFixture(api);
  writeFile(
    path.join(api, "host", "task", "struct.Manager.html"),
    '<meta name="description" content="A manager for &lt;tasks&gt; of `Task`.">' +
      '<section id="method.spawn"></section>',
  );
  writeFile(
    path.join(api, "host", "task", "fn.sleep.html"),
    '<meta name="description" content="API documentation for the Rust `sleep` fn in crate `task`.">',
  );
  return { output, api };
}

test("builds one record for each API item", (t) => {
  const { output, api } = fixture(t);
  const index = buildApiIndex(api);
  const records = apiSearchRecords(index, output);
  const count =
    Object.keys(index.apis.host.items).length +
    Object.keys(index.apis.guest.items).length;
  assert.equal(records.length, count);

  const manager = records.find(
    (record) => record.url === "/api/host/task/struct.Manager.html",
  );
  assert.match(manager.content, /<h1>task::Manager<\/h1>/);
  assert.match(
    manager.content,
    /<p>Struct in the host API\. A manager for &lt;tasks&gt; of Task\.<\/p>/,
  );
  assert.doesNotMatch(manager.content, /spawn/);
});

test("leaves out the description that rustdoc generates", (t) => {
  const { output, api } = fixture(t);
  const records = apiSearchRecords(buildApiIndex(api), output);
  const sleep = records.find(
    (record) => record.url === "/api/host/task/fn.sleep.html",
  );
  assert.match(sleep.content, /<p>Function in the host API\.<\/p>/);
  const window = records.find(
    (record) => record.url === "/api/guest/wasm/struct.Window.html",
  );
  assert.match(window.content, /Struct in the guest API\./);
});

function fakePagefind() {
  const calls = { files: [], output: undefined, closed: false };
  return {
    calls,
    module: {
      createIndex: async () => ({
        errors: [],
        index: {
          addHTMLFile: async (file) => {
            calls.files.push(file);
            return { errors: [] };
          },
          writeFiles: async ({ outputPath }) => {
            calls.output = outputPath;
            return { errors: [] };
          },
        },
      }),
      close: async () => {
        calls.closed = true;
      },
    },
  };
}

test("writes the API bundle in api/pagefind", async (t) => {
  const { output, api } = fixture(t);
  writeApiIndex(api);
  const { calls, module } = fakePagefind();
  const result = await buildApiSearchIndex(output, { pagefind: module });
  assert.equal(result.apiItems, calls.files.length);
  assert.ok(calls.files.length > 5);
  assert.equal(calls.output, path.join(output, "api", "pagefind"));
  assert.equal(calls.closed, true);
});

test("writes no bundle and merges none without an API index", async (t) => {
  const output = createDirectory(t, "xila-search-");
  const { calls, module } = fakePagefind();
  assert.deepEqual(await buildApiSearchIndex(output, { pagefind: module }), {
    apiItems: 0,
  });
  assert.equal(calls.output, undefined);
  assert.deepEqual(getPagefindOptions(output), {});

  writeFile(path.join(output, "public", "api", "api-index.json"), "{}");
  const [merged] = getPagefindOptions(output).mergeIndex;
  assert.equal(merged.bundlePath, "/api/pagefind/");
  assert.ok(merged.indexWeight < 0.1);
});
