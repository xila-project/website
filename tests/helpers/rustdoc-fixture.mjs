import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export function writeFile(file, contents) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, contents);
}

export function createDirectory(t, prefix) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  return directory;
}

const page = (ids = []) =>
  `<html><head><meta name="rustdoc-vars"></head><body>${ids
    .map((id) => `<section id="${id}"></section>`)
    .join("")}</body></html>`;

/**
 * A small rustdoc tree in the layout of Rust 1.97: a façade crate `xila`
 * that re-exports `task`, a `task` crate with a struct, a function, a macro,
 * a submodule and an item of a private module, and a guest crate `wasm`.
 */
export function writeRustdocFixture(apiDirectory) {
  const host = path.join(apiDirectory, "host");
  writeFile(
    path.join(host, "crates.js"),
    'window.ALL_CRATES = ["task","xila"];\n//{"start":21}',
  );
  writeFile(
    path.join(host, "xila", "index.html"),
    '<dl><dt id="reexport.task"><code>pub use <a class="mod" href="../task/index.html" title="mod task">task</a>;</code></dt>' +
      '<dt id="reexport.internationalization"><code>pub use embedded_i18n as internationalization;</code></dt></dl>',
  );
  writeFile(
    path.join(host, "xila", "sidebar-items.js"),
    "window.SIDEBAR_ITEMS = {};",
  );
  writeFile(path.join(host, "task", "index.html"), page());
  writeFile(
    path.join(host, "task", "sidebar-items.js"),
    'window.SIDEBAR_ITEMS = {"fn":["sleep"],"macro":[["instantiate",1]],"mod":["metrics"],"struct":["Manager","EnvironmentVariable"]};',
  );
  writeFile(
    path.join(host, "task", "struct.Manager.html"),
    page([
      "method.spawn",
      "associatedconstant.ROOT",
      "implementations",
      "impl-Manager",
    ]),
  );
  writeFile(
    path.join(host, "task", "struct.EnvironmentVariable.html"),
    page(["method.get_name"]),
  );
  writeFile(path.join(host, "task", "fn.sleep.html"), page());
  writeFile(path.join(host, "task", "macro.instantiate.html"), page());
  writeFile(path.join(host, "task", "metrics", "index.html"), page());
  writeFile(
    path.join(host, "task", "metrics", "sidebar-items.js"),
    'window.SIDEBAR_ITEMS = {"struct":["Metrics"]};',
  );
  writeFile(
    path.join(host, "task", "metrics", "struct.Metrics.html"),
    page(["structfield.spawned"]),
  );
  writeFile(
    path.join(
      host,
      "task",
      "environment_variable",
      "struct.EnvironmentVariable.html",
    ),
    '<meta http-equiv="refresh" content="0;URL=../../task/struct.EnvironmentVariable.html">',
  );

  const guest = path.join(apiDirectory, "guest");
  writeFile(path.join(guest, "crates.js"), 'window.ALL_CRATES = ["wasm"];');
  writeFile(path.join(guest, "wasm", "index.html"), page());
  writeFile(
    path.join(guest, "wasm", "sidebar-items.js"),
    'window.SIDEBAR_ITEMS = {"struct":["Window","Manager"]};',
  );
  writeFile(
    path.join(guest, "wasm", "struct.Window.html"),
    page(["method.close"]),
  );
  writeFile(path.join(guest, "wasm", "struct.Manager.html"), page());
}
