import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  applyShell,
  applyShellToPage,
  renderShellBar,
  writeShellAssets,
} from "../scripts/api-shell.mjs";

const PAGE =
  '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">' +
  '<link rel="stylesheet" href="../static.files/rustdoc.css">' +
  '<meta name="rustdoc-vars" data-root-path="../">' +
  '<script src="../static.files/storage.js"></script>' +
  '<link rel="alternate icon" type="image/png" href="../static.files/favicon.png">' +
  '<link rel="icon" type="image/svg+xml" href="../static.files/favicon.svg">' +
  '</head><body class="rustdoc struct"><main></main></body></html>';

test("runs the theme script before rustdoc's storage script", () => {
  const html = applyShellToPage(PAGE, "host");
  const theme = html.indexOf('<script src="/api/xila-shell/shell.js">');
  const storage = html.indexOf("storage.js");
  assert.ok(theme > 0 && theme < storage);
});

test("adds the shell style sheet after rustdoc's and replaces the icons", () => {
  const html = applyShellToPage(PAGE, "host");
  assert.ok(
    html.indexOf("/api/xila-shell/shell.css") > html.indexOf("rustdoc.css"),
  );
  assert.ok(html.includes("/fonts/montserrat.css"));
  assert.ok(!html.includes("static.files/favicon"));
  assert.ok(html.includes('href="/images/favicon.svg"'));
});

test("puts the bar first in the body", () => {
  const html = applyShellToPage(PAGE, "guest");
  assert.match(html, /<body class="rustdoc struct"><header class="xila-shell"/);
});

test("marks the current API in the switch and links its reference page", () => {
  const bar = renderShellBar("guest");
  assert.match(
    bar,
    /<a href="\/api\/guest\/wasm\/index.html" aria-current="true">Guest<\/a>/,
  );
  assert.match(bar, /<a href="\/api\/host\/xila\/index.html">Host<\/a>/);
  assert.match(bar, /href="\/reference\/guest\/"/);
  assert.match(bar, /href="\/docs\/">Documentation/);
  assert.match(bar, /href="\/packages\/">Packages/);
  assert.throws(() => renderShellBar("browser"));
});

test("leaves files that are not rustdoc pages unchanged", () => {
  const redirect =
    '<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0;URL=../x.html"></head><body></body></html>';
  assert.equal(applyShellToPage(redirect, "host"), null);
});

test("applies the shell to a directory and writes the shared files", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "xila-api-shell-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const page = path.join(root, "host", "task", "index.html");
  const redirect = path.join(root, "host", "task", "redirect.html");
  fs.mkdirSync(path.dirname(page), { recursive: true });
  fs.writeFileSync(page, PAGE);
  fs.writeFileSync(redirect, "<html><body>moved</body></html>");

  assert.equal(applyShell(path.join(root, "host"), "host"), 1);
  assert.match(fs.readFileSync(page, "utf8"), /xila-shell/);
  assert.equal(
    fs.readFileSync(redirect, "utf8"),
    "<html><body>moved</body></html>",
  );

  writeShellAssets(root);
  assert.ok(fs.existsSync(path.join(root, "xila-shell", "shell.css")));
  assert.ok(fs.existsSync(path.join(root, "xila-shell", "shell.js")));
});

test("links the site pages of the header", () => {
  const bar = renderShellBar("host");
  assert.match(bar, /href="\/demonstration\/">Demonstration/);
});
