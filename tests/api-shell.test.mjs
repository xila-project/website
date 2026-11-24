import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  applyShell,
  applyShellToPage,
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

test("runs the frame script before rustdoc's storage script", () => {
  const html = applyShellToPage(PAGE);
  const script = html.indexOf('<script src="/api/xila-shell/shell.js">');
  const storage = html.indexOf("storage.js");
  assert.ok(script > 0 && script < storage);
});

test("adds the style sheet after rustdoc's and replaces the icons", () => {
  const html = applyShellToPage(PAGE);
  assert.ok(
    html.indexOf("/api/xila-shell/shell.css") > html.indexOf("rustdoc.css"),
  );
  assert.ok(html.includes("/fonts/montserrat.css"));
  assert.ok(!html.includes("static.files/favicon"));
  assert.ok(html.includes('href="/images/favicon.svg"'));
});

test("changes nothing in the body of the page", () => {
  const html = applyShellToPage(PAGE);
  assert.ok(html.includes('<body class="rustdoc struct"><main></main></body>'));
});

test("leaves files that are not rustdoc pages unchanged", () => {
  const redirect =
    '<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0;URL=../x.html"></head><body></body></html>';
  assert.equal(applyShellToPage(redirect), null);
});

test("applies the glue to a directory and writes the shared files", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "xila-api-shell-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const page = path.join(root, "host", "task", "index.html");
  const redirect = path.join(root, "host", "task", "redirect.html");
  fs.mkdirSync(path.dirname(page), { recursive: true });
  fs.writeFileSync(page, PAGE);
  fs.writeFileSync(redirect, "<html><body>moved</body></html>");

  assert.equal(applyShell(path.join(root, "host")), 1);
  assert.match(fs.readFileSync(page, "utf8"), /xila-shell\/shell\.js/);
  assert.equal(
    fs.readFileSync(redirect, "utf8"),
    "<html><body>moved</body></html>",
  );

  writeShellAssets(root);
  assert.ok(fs.existsSync(path.join(root, "xila-shell", "shell.css")));
  assert.ok(fs.existsSync(path.join(root, "xila-shell", "shell.js")));
});

test("fails on a rustdoc page whose structure is not recognised", () => {
  const changed =
    '<!DOCTYPE html><html><head><meta charset=utf-8><meta name="rustdoc-vars"></head><body class="rustdoc"></body></html>';
  assert.throws(() => applyShellToPage(changed), /Unexpected rustdoc/);
});

test("fails when a directory has no rustdoc page", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "xila-api-shell-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.writeFileSync(path.join(root, "index.html"), "<html></html>");
  assert.throws(() => applyShell(root), /No rustdoc page/);
});
