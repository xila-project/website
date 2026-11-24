import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { validateDocs } from "../scripts/check-docs.mjs";

function createSite(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "xila-starlight-docs-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const source = path.join(root, "src", "content", "docs");
  const output = path.join(root, "dist");
  fs.mkdirSync(source, { recursive: true });
  fs.mkdirSync(output, { recursive: true });
  return { root, source, output };
}

function writeFile(file, contents) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, contents);
}

test("validates Starlight content metadata and Astro route links and anchors", (t) => {
  const { root, source, output } = createSite(t);
  writeFile(
    path.join(source, "reference", "guide.mdx"),
    `---\ndocType: reference\ndescription: A fixture page\n---\n<CodeReference path="Cargo.toml" />\n`,
  );
  writeFile(
    path.join(output, "reference", "guide", "index.html"),
    '<a href="../target/?view=full#hello%20world">target</a>',
  );
  writeFile(
    path.join(output, "reference", "target", "index.html"),
    '<h2 id="hello world">Target</h2>',
  );

  const result = validateDocs({ root, source, output, environment: {} });
  assert.deepEqual(result.errors, []);
  assert.equal(result.pages, 1);
  assert.equal(result.links, 1);
  assert.equal(result.anchors, 1);
  assert.equal(result.references, 1);
  assert.deepEqual(result.omittedRepositories, ["core"]);
});

test("reports metadata and rendered-route failures", (t) => {
  const { root, source, output } = createSite(t);
  writeFile(
    path.join(source, "tutorials", "first.md"),
    "---\ndocType: reference\n---\n",
  );
  writeFile(
    path.join(output, "tutorials", "first", "index.html"),
    '<a href="/missing/#absent">missing</a>',
  );

  const result = validateDocs({ root, source, output, environment: {} });
  assert.match(result.errors.join("\n"), /expected docType tutorial/);
  assert.match(result.errors.join("\n"), /missing description/);
  assert.match(result.errors.join("\n"), /missing link \/missing\/#absent/);
});

test("strict source checkout mode fails while optional mode reports a skip", (t) => {
  const { root, source, output } = createSite(t);
  writeFile(
    path.join(source, "reference", "source.md"),
    `---\ndocType: reference\ndescription: Source fixture\n---\n<CodeReference path="Cargo.toml" />\n`,
  );

  const optional = validateDocs({ root, source, output, environment: {} });
  assert.deepEqual(optional.errors, []);
  assert.deepEqual(optional.omittedRepositories, ["core"]);

  const strict = validateDocs({
    root,
    source,
    output,
    environment: { XILA_STRICT_SOURCE_REFERENCES: "1" },
  });
  assert.match(
    strict.errors.join("\n"),
    /Missing source checkout for repository core/,
  );
});

test("checks API links only when the API pages are staged", (t) => {
  const { root, source, output } = createSite(t);
  writeFile(
    path.join(output, "reference", "host", "index.html"),
    [
      '<a href="/api/host/task/struct.Manager.html#method.spawn">ok</a>',
      '<a href="/api/host/task/struct.Manager.html#method.absent">anchor</a>',
      '<a href="/api/host/abi_declarations/index.html">page</a>',
    ].join(""),
  );

  const unstaged = validateDocs({ root, source, output, environment: {} });
  assert.deepEqual(unstaged.errors, []);
  assert.equal(unstaged.skippedApiLinks, 3);
  assert.equal(unstaged.apiLinks, 0);

  writeFile(
    path.join(output, "api", "host", "task", "struct.Manager.html"),
    '<section id="method.spawn"></section>',
  );
  const staged = validateDocs({ root, source, output, environment: {} });
  assert.deepEqual(staged.errors, []);
  assert.equal(staged.apiLinks, 3);
  assert.deepEqual(staged.warnings, [
    "reference/host/index.html: missing API anchor /api/host/task/struct.Manager.html#method.absent",
    "reference/host/index.html: missing API link /api/host/abi_declarations/index.html",
  ]);

  const strict = validateDocs({
    root,
    source,
    output,
    environment: { XILA_STRICT_API_LINKS: "1" },
  });
  assert.equal(strict.errors.length, 2);
});

test("checks API links and rust: links against the API index", (t) => {
  const { root, source, output } = createSite(t);
  writeFile(
    path.join(output, "api", "api-index.json"),
    JSON.stringify({
      version: 1,
      apis: {
        host: {
          items: {
            xila: { url: "/api/host/xila/index.html", kind: "mod" },
            "task::Manager": {
              url: "/api/host/task/struct.Manager.html",
              kind: "struct",
              anchors: ["method.spawn"],
            },
          },
          aliases: {},
        },
      },
    }),
  );
  writeFile(
    path.join(output, "reference", "host", "index.html"),
    [
      '<a href="/api/host/task/struct.Manager.html#method.spawn" data-api="host:task::Manager">ok</a>',
      '<a href="/api/host/task/struct.Manager.html#method.stop">anchor</a>',
      '<a href="/api/host/task/struct.Missing.html">page</a>',
      '<a href="/api/host/xila/index.html?search=task%3A%3AStop" data-api-error="unknown API item &quot;task::Stop&quot; in &quot;task::Stop&quot;">stop</a>',
    ].join(""),
  );

  const result = validateDocs({ root, source, output, environment: {} });
  assert.deepEqual(result.errors, []);
  assert.equal(result.apiTargets, 2);
  assert.deepEqual(result.warnings.sort(), [
    "reference/host/index.html: missing API anchor /api/host/task/struct.Manager.html#method.stop",
    "reference/host/index.html: missing API link /api/host/task/struct.Missing.html",
    'reference/host/index.html: unknown API item "task::Stop" in "task::Stop"',
  ]);

  const strict = validateDocs({
    root,
    source,
    output,
    environment: { XILA_STRICT_API_LINKS: "1" },
  });
  assert.equal(strict.errors.length, 3);
});

test("counts rust: and Api links of a build without an index as skipped", (t) => {
  const { root, source, output } = createSite(t);
  writeFile(
    path.join(output, "reference", "host", "index.html"),
    '<a href="/api/host/xila/index.html?search=task" data-api-unchecked="no api-index.json">task</a>',
  );
  const result = validateDocs({
    root,
    source,
    output,
    environment: { XILA_STRICT_API_LINKS: "1" },
  });
  assert.deepEqual(result.errors, []);
  assert.equal(result.skippedApiTargets, 1);
  assert.equal(result.skippedApiLinks, 1);
});
