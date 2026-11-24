import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// The glue that the build adds to every rustdoc page under /api/: a script
// that shows the page in the frame page of the site and keeps the themes in
// agreement (scripts/api-shell/shell.js), and a style sheet that maps the
// rustdoc colours and fonts to the site (scripts/api-shell/shell.css).
// Rustdoc writes complete HTML pages; the build only post-processes them, so
// that Core and Applications stay the only owners of the rustdoc flags.

const ASSETS = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "api-shell",
);

/** The directory of the injected files, relative to the API directory. */
export const SHELL_DIRECTORY = "xila-shell";

// The API directory of the site. Keep in sync with API_ROOT of
// scripts/api-shell/shell.js.
const API_BASE = "/api";

const CHARSET = /<meta charset="utf-8">/i;
const RUSTDOC_PAGE = /<meta name="rustdoc-vars"/;
const ICONS = /<link rel="(?:alternate )?icon"[^>]*>/g;
const BODY = /<body\b[^>]*>/;

/**
 * Adds the glue to one rustdoc page. Returns `null` for files that are not
 * rustdoc pages, such as the redirect pages of re-exported items.
 */
export function applyShellToPage(html) {
  if (!RUSTDOC_PAGE.test(html)) return null;
  // A rustdoc page that the patterns do not match means that rustdoc changed
  // its output: fail instead of publishing pages without the glue.
  if (!CHARSET.test(html) || !BODY.test(html) || !html.includes("</head>"))
    throw new Error(
      "Unexpected rustdoc page structure: no <meta charset>, </head> or <body>",
    );
  const assets = `${API_BASE}/${SHELL_DIRECTORY}`;
  // The script must run before rustdoc's storage script, which applies the
  // stored theme as soon as it loads in the head.
  return html
    .replace(
      CHARSET,
      (tag) => `${tag}<script src="${assets}/shell.js"></script>`,
    )
    .replace(ICONS, "")
    .replace(
      "</head>",
      `<link rel="icon" type="image/svg+xml" href="/images/favicon.svg">` +
        `<link rel="stylesheet" href="/fonts/montserrat.css">` +
        `<link rel="stylesheet" href="${assets}/shell.css"></head>`,
    );
}

function htmlFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) return htmlFiles(full);
    return entry.name.endsWith(".html") ? [full] : [];
  });
}

/** Adds the glue to every rustdoc page under `directory`. */
export function applyShell(directory) {
  let pages = 0;
  for (const file of htmlFiles(directory)) {
    let html;
    try {
      html = applyShellToPage(fs.readFileSync(file, "utf8"));
    } catch (error) {
      throw new Error(`${file}: ${error.message}`);
    }
    if (html === null) continue;
    fs.writeFileSync(file, html);
    pages += 1;
  }
  if (pages === 0) throw new Error(`No rustdoc page found under ${directory}`);
  return pages;
}

/** Copies the shared files into the API directory. */
export function writeShellAssets(apiDirectory) {
  const destination = path.join(apiDirectory, SHELL_DIRECTORY);
  fs.rmSync(destination, { recursive: true, force: true });
  fs.cpSync(ASSETS, destination, { recursive: true });
}
