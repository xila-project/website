import fs from "node:fs";
import path from "node:path";

// The API index: every documented Rust item of the published APIs with the
// URL of its rustdoc page. The site resolves `rust:` links and the `Api`
// component with it, and the documentation check validates them against it.
//
// Format (version 1):
//
//   {
//     "version": 1,
//     "apis": {
//       "host": {
//         "items": { "task::Manager": { "url": "...", "kind": "struct",
//                                       "anchors": ["method.spawn", ...] } },
//         "aliases": { "xila::task": "task" }
//       },
//       "guest": { ... }
//     }
//   }
//
// Item paths start with the crate name as rustdoc writes it (`task`, not
// `xila_task`). `aliases` maps re-exported paths to the canonical path they
// re-export, for example `xila::task` to `task`.

export const API_INDEX_FILE = "api-index.json";
export const API_INDEX_VERSION = 1;
export const API_ARCHITECTURES = Object.freeze(["host", "guest"]);

// Anchors of the members of an item, the targets of `Item::member` paths, in
// order of preference when two members have the same name.
const MEMBER_PREFIXES = Object.freeze([
  "method",
  "tymethod",
  "structfield",
  "variant",
  "associatedconstant",
  "associatedtype",
]);
// Other anchors with an item name, kept so that explicit fragments can be
// checked.
const ANCHOR_PREFIXES = Object.freeze([...MEMBER_PREFIXES, "reexport"]);
const ANCHOR = new RegExp(
  `\\bid="((?:${ANCHOR_PREFIXES.join("|")})\\.[^"]+)"`,
  "g",
);
const ITEM_PAGE = /^([a-z]+)\.([^.]+)\.html$/;
const REDIRECT = /<meta http-equiv="refresh" content="0;URL=([^"]+)">/;
const REEXPORT =
  /<dt id="reexport\.([^"]+)"><code>pub use [^<]*<a class="[a-z]+" href="([^"]+)"/g;

function readJavaScriptValue(file, variable) {
  if (!fs.existsSync(file)) return null;
  const match = fs
    .readFileSync(file, "utf8")
    .match(new RegExp(`window\\.${variable}\\s*=\\s*(.+?);\\s*(?:\\n|$)`));
  return match ? JSON.parse(match[1]) : null;
}

function anchorsOf(html) {
  return [...new Set([...html.matchAll(ANCHOR)].map((match) => match[1]))];
}

function toUrl(apiDirectory, base, file) {
  return `${base}/${path.relative(apiDirectory, file).split(path.sep).join("/")}`;
}

/** Builds the index of one API (`host` or `guest`) from its rustdoc pages. */
export function buildApi(architectureDirectory, base) {
  const items = {};
  const aliases = {};
  const urls = new Map();

  function add(itemPath, kind, file) {
    if (items[itemPath]) return;
    const html = fs.readFileSync(file, "utf8");
    const url = toUrl(architectureDirectory, base, file);
    items[itemPath] = { url, kind };
    if (kind !== "mod") {
      const anchors = anchorsOf(html);
      if (anchors.length) items[itemPath].anchors = anchors;
    } else {
      const anchors = anchorsOf(html).filter((anchor) =>
        anchor.startsWith("reexport."),
      );
      if (anchors.length) items[itemPath].anchors = anchors;
    }
    urls.set(path.resolve(file), itemPath);
  }

  function walkModule(directory, segments) {
    add(segments.join("::"), "mod", path.join(directory, "index.html"));
    const sidebar =
      readJavaScriptValue(
        path.join(directory, "sidebar-items.js"),
        "SIDEBAR_ITEMS",
      ) ?? {};
    for (const [kind, entries] of Object.entries(sidebar)) {
      for (const entry of entries) {
        const name = Array.isArray(entry) ? entry[0] : entry;
        if (kind === "mod") {
          const child = path.join(directory, name);
          if (fs.existsSync(path.join(child, "index.html")))
            walkModule(child, [...segments, name]);
          continue;
        }
        const file = path.join(directory, `${kind}.${name}.html`);
        if (fs.existsSync(file))
          add([...segments, name].join("::"), kind, file);
      }
    }
  }

  const crates =
    readJavaScriptValue(
      path.join(architectureDirectory, "crates.js"),
      "ALL_CRATES",
    ) ?? [];
  for (const crate of crates) {
    const directory = path.join(architectureDirectory, crate);
    if (fs.existsSync(path.join(directory, "index.html")))
      walkModule(directory, [crate]);
  }

  // Pages that no sidebar lists: items of private modules, which rustdoc
  // writes as redirects to the public path, and other documented items.
  const redirects = [];
  function scan(directory, segments) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        scan(file, [...segments, entry.name]);
        continue;
      }
      const match = entry.name.match(ITEM_PAGE);
      if (!match || urls.has(path.resolve(file))) continue;
      const itemPath = [...segments, match[2]].join("::");
      const redirect = fs.readFileSync(file, "utf8").match(REDIRECT);
      if (redirect)
        redirects.push([itemPath, path.resolve(directory, redirect[1])]);
      else add(itemPath, match[1], file);
    }
  }
  for (const crate of crates) {
    const directory = path.join(architectureDirectory, crate);
    if (fs.existsSync(directory)) scan(directory, [crate]);
  }
  for (const [itemPath, target] of redirects) {
    const canonical = urls.get(target);
    if (canonical && !items[itemPath]) aliases[itemPath] = canonical;
  }

  // Re-exports of modules and items, such as `pub use task;` in `xila`.
  for (const [modulePath, item] of Object.entries(items)) {
    if (item.kind !== "mod") continue;
    const file = path.join(
      architectureDirectory,
      item.url.slice(base.length + 1),
    );
    for (const match of fs.readFileSync(file, "utf8").matchAll(REEXPORT)) {
      const canonical = urls.get(
        path.resolve(path.dirname(file), match[2].split("#")[0]),
      );
      const alias = `${modulePath}::${match[1]}`;
      if (canonical && canonical !== alias && !items[alias])
        aliases[alias] = canonical;
    }
  }

  return { items: sortObject(items), aliases: sortObject(aliases) };
}

function sortObject(object) {
  return Object.fromEntries(
    Object.entries(object).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
  );
}

/**
 * Builds the index of the APIs staged under `apiDirectory`
 * (`<apiDirectory>/host/`, `<apiDirectory>/guest/`).
 */
export function buildApiIndex(apiDirectory, base = "/api") {
  const apis = {};
  for (const architecture of API_ARCHITECTURES) {
    const directory = path.join(apiDirectory, architecture);
    if (fs.existsSync(directory))
      apis[architecture] = buildApi(directory, `${base}/${architecture}`);
  }
  return { version: API_INDEX_VERSION, apis };
}

export function writeApiIndex(apiDirectory, base = "/api") {
  const index = buildApiIndex(apiDirectory, base);
  fs.writeFileSync(
    path.join(apiDirectory, API_INDEX_FILE),
    JSON.stringify(index),
  );
  return index;
}

/** Reads an index file. Returns `null` when the file does not exist. */
export function readApiIndex(file) {
  if (!fs.existsSync(file)) return null;
  const index = JSON.parse(fs.readFileSync(file, "utf8"));
  if (index.version !== API_INDEX_VERSION)
    throw new Error(
      `${file}: unsupported API index version ${index.version} (expected ${API_INDEX_VERSION})`,
    );
  return index;
}

/**
 * Splits a link target: `[host:|guest:]path[#anchor]`. Link texts are
 * accepted too: backticks, a trailing `()` and a trailing `!` are removed.
 */
export function parseApiTarget(target) {
  let text = target.trim().replace(/^`|`$/g, "");
  let architecture;
  const prefix = text.match(/^(host|guest):(?!:)/);
  if (prefix) {
    architecture = prefix[1];
    text = text.slice(prefix[0].length);
  }
  const hash = text.indexOf("#");
  const anchor = hash >= 0 ? text.slice(hash + 1) : undefined;
  if (hash >= 0) text = text.slice(0, hash);
  text = text.replace(/\(\)$/, "").replace(/!$/, "");
  return { architecture, path: text, anchor };
}

function expandAliases(api, itemPath) {
  // The longest alias that is a prefix of the path wins.
  let best;
  for (const alias of Object.keys(api.aliases)) {
    if (
      (itemPath === alias || itemPath.startsWith(`${alias}::`)) &&
      (!best || alias.length > best.length)
    )
      best = alias;
  }
  return best
    ? `${api.aliases[best]}${itemPath.slice(best.length)}`
    : undefined;
}

function memberAnchor(item, name) {
  // The page of a trait also lists the methods of its implementors under the
  // `method.` anchors: a required method of the trait itself has a
  // `tymethod.` anchor, which names the declaration.
  const prefixes =
    item.kind === "trait" ? ["tymethod", ...MEMBER_PREFIXES] : MEMBER_PREFIXES;
  for (const prefix of prefixes) {
    const anchor = `${prefix}.${name}`;
    if (item.anchors?.includes(anchor)) return anchor;
  }
  return undefined;
}

// Resolves a path in one API. Returns `{ item, itemPath, anchor }`, or a
// list of `candidates` when a suffix matches several items.
function lookup(api, itemPath, depth = 0) {
  if (!itemPath || depth > 8) return undefined;
  if (api.items[itemPath])
    return { item: api.items[itemPath], itemPath, anchor: undefined };

  const separator = itemPath.lastIndexOf("::");
  if (separator > 0) {
    const owner = itemPath.slice(0, separator);
    const member = itemPath.slice(separator + 2);
    const item = api.items[owner];
    const anchor = item && memberAnchor(item, member);
    if (anchor) return { item, itemPath: owner, anchor };
  }

  const expanded = expandAliases(api, itemPath);
  if (expanded) return lookup(api, expanded, depth + 1);
  return undefined;
}

function suffixLookup(api, itemPath) {
  const results = [];
  const suffix = `::${itemPath}`;
  for (const candidate of Object.keys(api.items)) {
    if (candidate.endsWith(suffix))
      results.push({ item: api.items[candidate], itemPath: candidate });
  }
  const separator = itemPath.lastIndexOf("::");
  if (separator > 0) {
    const ownerSuffix = `::${itemPath.slice(0, separator)}`;
    const member = itemPath.slice(separator + 2);
    for (const candidate of Object.keys(api.items)) {
      if (!candidate.endsWith(ownerSuffix)) continue;
      const anchor = memberAnchor(api.items[candidate], member);
      if (anchor)
        results.push({
          item: api.items[candidate],
          itemPath: candidate,
          anchor,
        });
    }
  }
  return results;
}

/**
 * Resolves a `rust:` target or an `Api` path against the index.
 *
 * Returns `{ href, architecture, path, kind }` on success, or `{ error }`.
 * A path without `host:` or `guest:` is searched in both APIs and must
 * resolve in exactly one. A path is first resolved as written (canonical
 * path or re-export alias), then as the end of a unique item path, as
 * rustdoc does for intra-documentation links.
 */
export function resolveApiTarget(index, target, defaultArchitecture) {
  const parsed = parseApiTarget(target);
  if (!parsed.path) return { error: `empty API path in "${target}"` };
  const architecture = parsed.architecture ?? defaultArchitecture;
  const architectures = architecture
    ? [architecture]
    : API_ARCHITECTURES.filter((name) => index.apis[name]);
  if (architecture && !API_ARCHITECTURES.includes(architecture))
    return { error: `unknown API "${architecture}" in "${target}"` };

  let matches = [];
  for (const name of architectures) {
    const api = index.apis[name];
    if (!api) continue;
    const found = lookup(api, parsed.path);
    if (found) matches.push({ ...found, architecture: name });
  }
  if (!matches.length) {
    for (const name of architectures) {
      const api = index.apis[name];
      if (!api) continue;
      for (const found of suffixLookup(api, parsed.path))
        matches.push({ ...found, architecture: name });
    }
  }

  if (!matches.length)
    return { error: `unknown API item "${parsed.path}" in "${target}"` };
  if (matches.length > 1) {
    const names = matches
      .slice(0, 5)
      .map(
        ({ architecture: name, itemPath, anchor }) =>
          `${name}:${itemPath}${anchor ? `#${anchor}` : ""}`,
      );
    return {
      error: `ambiguous API path "${parsed.path}" in "${target}": ${names.join(", ")}`,
    };
  }

  const [match] = matches;
  let anchor = match.anchor;
  if (parsed.anchor !== undefined) {
    if (anchor)
      return {
        error: `"${target}" names a member and an anchor; use one of them`,
      };
    if (!checkAnchor(match.item, parsed.anchor))
      return {
        error: `unknown anchor "#${parsed.anchor}" on ${match.itemPath} in "${target}"`,
      };
    anchor = parsed.anchor;
  }
  return {
    href: `${match.item.url}${anchor ? `#${anchor}` : ""}`,
    architecture: match.architecture,
    path: match.itemPath,
    kind: match.item.kind,
    anchor,
  };
}

// Anchors with an item prefix (`method.spawn`) must exist. Other anchors
// are rustdoc section headings (`implementations`, `structs`), which every
// page of a kind has.
function checkAnchor(item, anchor) {
  const prefix = anchor.split(".")[0];
  if (anchor.includes(".") && ANCHOR_PREFIXES.includes(prefix))
    return item.anchors?.includes(anchor) ?? false;
  return true;
}

/**
 * Checks a URL under /api/ against the index. Returns `null` when the page
 * and its anchor exist, otherwise a message.
 */
const pagesByIndex = new WeakMap();

export function checkApiUrl(index, pathname, anchor) {
  if (!pagesByIndex.has(index)) {
    const pages = new Map();
    for (const api of Object.values(index.apis))
      for (const item of Object.values(api.items)) pages.set(item.url, item);
    pagesByIndex.set(index, pages);
  }
  const item = pagesByIndex.get(index).get(pathname);
  if (!item) return "unknown API page";
  if (anchor && !checkAnchor(item, anchor)) return `unknown anchor #${anchor}`;
  return null;
}

/**
 * The href used when a target cannot be resolved (no index, or an unknown
 * item): the rustdoc search of the API. The documentation check reports it.
 */
export function getApiSearchHref(target, base = "/api") {
  const parsed = parseApiTarget(target);
  const architecture = parsed.architecture ?? "host";
  const crate = architecture === "guest" ? "wasm" : "xila";
  return `${base}/${architecture}/${crate}/index.html?search=${encodeURIComponent(parsed.path)}`;
}
