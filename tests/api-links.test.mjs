import assert from "node:assert/strict";
import test from "node:test";

import { buildApiIndex } from "../scripts/api-index.mjs";
import { resolveApiLink, setApiIndex } from "../scripts/api-links.mjs";
import { remarkApiLinks } from "../scripts/remark-api-links.mjs";
import {
  createDirectory,
  writeRustdocFixture,
} from "./helpers/rustdoc-fixture.mjs";

function useFixture(t) {
  const directory = createDirectory(t, "xila-api-links-");
  writeRustdocFixture(directory);
  const index = buildApiIndex(directory);
  setApiIndex(index);
  t.after(() => setApiIndex(undefined));
  return index;
}

test("labels functions, methods, macros and crates", (t) => {
  const index = useFixture(t);
  assert.equal(resolveApiLink("task::sleep", index).label, "task::sleep()");
  assert.equal(
    resolveApiLink("task::Manager::spawn", index).label,
    "task::Manager::spawn()",
  );
  assert.equal(
    resolveApiLink("task::instantiate", index).label,
    "task::instantiate!",
  );
  assert.equal(resolveApiLink("task::Manager", index).label, "task::Manager");
  assert.equal(resolveApiLink("task", index).crate, true);
  assert.equal(resolveApiLink("task::metrics", index).crate, false);
  assert.equal(
    resolveApiLink("task::Manager", index).api,
    "host:task::Manager",
  );
});

test("links an unresolved target to the search and reports it", (t) => {
  const index = useFixture(t);
  const link = resolveApiLink("task::Missing", index);
  assert.equal(link.href, "/api/host/xila/index.html?search=task%3A%3AMissing");
  assert.match(link.error, /unknown API item/);
  const missing = resolveApiLink("task::Manager", null);
  assert.equal(missing.error, undefined);
  assert.match(missing.unchecked, /no api-index\.json/);
});

function link(url, children) {
  return { type: "link", url, children };
}

test("resolves rust: links in Markdown, with an empty target from the text", (t) => {
  useFixture(t);
  const tree = {
    type: "root",
    children: [
      {
        type: "paragraph",
        children: [
          link("rust:task::Manager::spawn", [
            { type: "inlineCode", value: "spawn" },
          ]),
          link("rust:", [{ type: "inlineCode", value: "task::sleep()" }]),
          link("rust:guest:wasm::Window", [{ type: "text", value: "window" }]),
          link("rust:task::Missing", [{ type: "text", value: "missing" }]),
          link("/docs/", [{ type: "text", value: "documentation" }]),
        ],
      },
      { type: "definition", identifier: "manager", url: "rust:task::Manager" },
    ],
  };
  remarkApiLinks()(tree);
  const [spawn, sleep, window, missing, other] = tree.children[0].children;
  assert.equal(spawn.url, "/api/host/task/struct.Manager.html#method.spawn");
  assert.deepEqual(spawn.data.hProperties, {
    "data-api": "host:task::Manager",
  });
  assert.equal(sleep.url, "/api/host/task/fn.sleep.html");
  assert.equal(window.url, "/api/guest/wasm/struct.Window.html");
  assert.match(missing.url, /\?search=/);
  assert.match(missing.data.hProperties["data-api-error"], /unknown API item/);
  assert.equal(other.url, "/docs/");
  assert.equal(other.data, undefined);
  assert.equal(tree.children[1].url, "/api/host/task/struct.Manager.html");
});

test("names a crate only when the path is the crate name", (t) => {
  const index = useFixture(t);
  assert.equal(resolveApiLink("xila::task", index).crate, false);
  assert.equal(resolveApiLink("xila", index).crate, true);
});

test("marks rust: links of a build without an index as unchecked", (t) => {
  setApiIndex(null);
  t.after(() => setApiIndex(undefined));
  const node = link("rust:task::Manager", [{ type: "text", value: "manager" }]);
  remarkApiLinks()({ type: "root", children: [node] });
  assert.match(node.url, /\?search=task%3A%3AManager$/);
  assert.match(node.data.hProperties["data-api-unchecked"], /api-index\.json/);
});
