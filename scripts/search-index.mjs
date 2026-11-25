import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as pagefindModule from "pagefind";

import { API_INDEX_FILE, readApiIndex } from "./api-index.mjs";

// The search index of the API items. Starlight's Pagefind step indexes the
// Starlight pages in /pagefind/; the rustdoc pages have no
// `data-pagefind-body` element, so it skips them. This step writes a second
// Pagefind bundle in /api/pagefind/ with one record for each item of the API
// index, and the search merges it (`mergeIndex` in astro.config.mjs).
//
// Starlight's step stays on: Starlight passes its ranking options to the
// search only when it builds the index, and without them Pagefind's default
// options rank short records first, which puts API items above the
// documentation pages.

export const API_SEARCH_BUNDLE = "api/pagefind";
const API_DIRECTORY = "/api";

const KIND_LABELS = Object.freeze({
  attr: "Attribute macro",
  constant: "Constant",
  derive: "Derive macro",
  enum: "Enum",
  fn: "Function",
  macro: "Macro",
  mod: "Module",
  primitive: "Primitive",
  static: "Static",
  struct: "Struct",
  trait: "Trait",
  traitalias: "Trait alias",
  type: "Type alias",
  union: "Union",
});

const API_LABELS = Object.freeze({ host: "host API", guest: "guest API" });

const DESCRIPTION = /<meta name="description" content="([^"]*)">/;

function decode(value) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function escape(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Rustdoc writes this description for items without documentation.
const GENERATED_DESCRIPTION = /^API documentation for the Rust `/;

/**
 * The search records of the API items, one for each item: the item path as
 * the heading, then the kind, the API and the first line of the item
 * documentation (the description of its rustdoc page).
 *
 * A record is a small HTML document rather than a Pagefind custom record:
 * custom records have no heading, so Pagefind gives the item path no more
 * weight than the description, and a long name that contains the query
 * ranks above the item of that name.
 *
 * Members (methods, fields, variants) have no records and are not listed:
 * Pagefind ranks short records first, so a list of members would push a
 * type below the items that only mention its name. The rustdoc search of
 * the API pages finds members.
 */
export function isTestItem(itemPath) {
  const segments = itemPath.split("::");
  if (segments.some((segment) => segment === "tests")) return true;
  if (segments.at(-1)?.startsWith("test_")) return true;
  return false;
}

export function apiSearchRecords(index, output) {
  const records = [];
  for (const [architecture, api] of Object.entries(index.apis)) {
    for (const [itemPath, item] of Object.entries(api.items)) {
      if (isTestItem(itemPath)) continue;
      const file = path.join(output, item.url);
      let description = fs.existsSync(file)
        ? decode(fs.readFileSync(file, "utf8").match(DESCRIPTION)?.[1] ?? "")
        : "";
      if (GENERATED_DESCRIPTION.test(description)) description = "";
      // The description is Markdown source: drop the code marks.
      description = description.replace(/`/g, "");
      const kind = KIND_LABELS[item.kind] ?? item.kind;
      const summary = `${kind} in the ${API_LABELS[architecture] ?? architecture}.${description ? ` ${description}` : ""}`;
      records.push({
        // The search prefixes the URLs of a merged bundle with the directory
        // that holds it (/api/): the record URL is relative to that directory.
        url: item.url.slice(API_DIRECTORY.length),
        content:
          `<html lang="en"><body><main data-pagefind-body>` +
          `<h1>${escape(itemPath)}</h1>` +
          `<p>${escape(summary)}</p>` +
          `</main></body></html>`,
      });
    }
  }
  return records;
}

function assertResponse(response) {
  if (response.errors.length)
    throw new Error(`Pagefind: ${response.errors.join("; ")}`);
  return response;
}

/**
 * The search options of Starlight: the API bundle is merged only when an API
 * index exists, because Pagefind fails the whole search when a merged
 * bundle is missing or empty. `root` is the repository root.
 *
 * The records of the API bundle are a few words long, so they score far
 * above the pages: the low weight puts a page that matches the query first.
 * Measured on the pages and the API of 2026-11-24: with a weight of 0.02, API
 * items ranked above the documentation pages for "file system", "file",
 * "window", "device" and "driver". With 0.002, the first results for these
 * queries are pages, and an API item that the pages do not mention still
 * ranks first (for example "spawn_send" or "SpawnerIdentifier").
 * The API bundle uses Pagefind's default ranking, not the ranking of
 * Starlight, so that a short item name ranks above a long one.
 */
export function getPagefindOptions(root = process.cwd()) {
  if (!fs.existsSync(path.join(root, "public", "api", API_INDEX_FILE)))
    return {};
  return {
    mergeIndex: [
      {
        bundlePath: `/${API_SEARCH_BUNDLE}/`,
        indexWeight: 0.002,
        ranking: {
          pageLength: 0.75,
          termFrequency: 1,
          termSaturation: 1.4,
          termSimilarity: 1,
        },
      },
    ],
  };
}

/**
 * Writes the Pagefind bundle of the API items in `output`/api/pagefind/.
 * Without an API index it writes nothing (see `getPagefindOptions`).
 */
export async function buildApiSearchIndex(
  output,
  { pagefind = pagefindModule, logger } = {},
) {
  const apiIndex = readApiIndex(path.join(output, "api", API_INDEX_FILE));
  if (!apiIndex) {
    logger?.info("No API index: the search has no API items.");
    return { apiItems: 0 };
  }
  try {
    const { index } = assertResponse(
      await pagefind.createIndex({ forceLanguage: "en" }),
    );
    const records = apiSearchRecords(apiIndex, output);
    for (const record of records)
      assertResponse(await index.addHTMLFile(record));
    assertResponse(
      await index.writeFiles({
        outputPath: path.join(output, ...API_SEARCH_BUNDLE.split("/")),
      }),
    );
    logger?.info(`Indexed ${records.length} API items.`);
    return { apiItems: records.length };
  } finally {
    await pagefind.close();
  }
}

/** The Astro integration that runs `buildApiSearchIndex` after the build. */
export function xilaSearch() {
  return {
    name: "xila-search",
    hooks: {
      "astro:build:done": async ({ dir, logger }) => {
        await buildApiSearchIndex(fileURLToPath(dir), { logger });
      },
    },
  };
}
