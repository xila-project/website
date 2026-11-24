import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// The Xila shell of the API pages. Rustdoc writes complete HTML pages; the
// build adds a top bar, a style sheet and a theme script to each of them, so
// that Core and Applications stay the only owners of the rustdoc flags.

const ASSETS = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "api-shell",
);

/** The directory of the shell files, relative to the API directory. */
export const SHELL_DIRECTORY = "xila-shell";

// The site links of the header (src/components/SiteTitle.astro). The
// demonstration page is DEMONSTRATION_PAGE of src/data/demonstration-locales.ts.
const SITE_LINKS = Object.freeze([
  { label: "Documentation", href: "/docs/" },
  { label: "Packages", href: "/packages/" },
  { label: "Demonstration", href: "/demonstration/" },
]);

const APIS = Object.freeze([
  { architecture: "host", label: "Host", crate: "xila" },
  { architecture: "guest", label: "Guest", crate: "wasm" },
]);

function escape(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function listItems(links) {
  return links
    .map(
      ({ label, href, current }) =>
        `<li><a href="${escape(href)}"${current ? ' aria-current="page"' : ""}>${escape(label)}</a></li>`,
    )
    .join("");
}

/** The HTML of the top bar for the API of `architecture`. */
export function renderShellBar(architecture, base = "/api") {
  const api = APIS.find((entry) => entry.architecture === architecture);
  if (!api) throw new Error(`Unsupported API architecture: ${architecture}`);
  const reference = {
    label: `${api.label} API reference`,
    href: `/reference/${architecture}/`,
  };
  const switchLinks = APIS.map((entry) => ({
    label: entry.label,
    href: `${base}/${entry.architecture}/${entry.crate}/index.html`,
    current: entry === api,
  }));

  return [
    `<header class="xila-shell" data-pagefind-ignore>`,
    `<a class="xila-shell-brand" href="/">`,
    `<img class="light" src="/images/logo_light.svg" alt="" width="28" height="28">`,
    `<img class="dark" src="/images/logo_dark.svg" alt="" width="28" height="28">`,
    `<span>Xila</span></a>`,
    `<nav class="xila-shell-site" aria-label="Site"><ul>${listItems(SITE_LINKS)}</ul></nav>`,
    `<nav class="xila-shell-api" aria-label="API"><ul>`,
    `<li class="xila-shell-switch">${switchLinks
      .map(
        ({ label, href, current }) =>
          `<a href="${escape(href)}"${current ? ' aria-current="true"' : ""}>${escape(label)}</a>`,
      )
      .join("")}</li>`,
    `<li class="xila-shell-reference"><a href="${reference.href}">Reference</a></li>`,
    `</ul></nav>`,
    `<details class="xila-shell-menu"><summary>Menu</summary><ul>${listItems([...SITE_LINKS, reference])}</ul></details>`,
    `</header>`,
  ].join("");
}

const CHARSET = /<meta charset="utf-8">/i;
const RUSTDOC_PAGE = /<meta name="rustdoc-vars"/;
const ICONS = /<link rel="(?:alternate )?icon"[^>]*>/g;
const BODY = /<body\b[^>]*>/;

/**
 * Adds the shell to one rustdoc page. Returns `null` for files that are not
 * rustdoc pages, such as the redirect pages of re-exported items.
 */
export function applyShellToPage(html, architecture, base = "/api") {
  if (!RUSTDOC_PAGE.test(html) || !CHARSET.test(html) || !BODY.test(html))
    return null;
  const assets = `${base}/${SHELL_DIRECTORY}`;
  // The theme script must run before rustdoc's storage script, which applies
  // the stored theme as soon as it loads in the head.
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
    )
    .replace(BODY, (tag) => `${tag}${renderShellBar(architecture, base)}`);
}

function htmlFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) return htmlFiles(full);
    return entry.name.endsWith(".html") ? [full] : [];
  });
}

/** Adds the shell to every rustdoc page under `directory`. */
export function applyShell(directory, architecture, base = "/api") {
  let pages = 0;
  for (const file of htmlFiles(directory)) {
    const html = applyShellToPage(
      fs.readFileSync(file, "utf8"),
      architecture,
      base,
    );
    if (html === null) continue;
    fs.writeFileSync(file, html);
    pages += 1;
  }
  return pages;
}

/** Copies the shared shell files into the API directory. */
export function writeShellAssets(apiDirectory) {
  const destination = path.join(apiDirectory, SHELL_DIRECTORY);
  fs.rmSync(destination, { recursive: true, force: true });
  fs.cpSync(ASSETS, destination, { recursive: true });
}
