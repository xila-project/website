import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { API_INDEX_FILE, readApiIndex } from "./api-index.mjs";

// The sitemap of the API pages. The rustdoc pages under /api/ are static
// files, not Astro routes, so the sitemap of @astrojs/sitemap does not list
// them. After the build, this step writes `sitemap-api.xml` with one entry
// for each page of the API index (the pages of the items, not the anchors of
// their members), and the sitemap index lists the file next to the sitemap
// of Astro (`customSitemaps` in astro.config.mjs).
//
// The file is not split. A sitemap file holds at most 50,000 URLs, and the
// build fails when the API index has more pages: the split needs a decision
// about the file names and the sitemap index, which a silent split would
// hide.

export const API_SITEMAP_FILE = "sitemap-api.xml";
export const SITEMAP_INDEX_FILE = "sitemap-index.xml";
export const SITEMAP_ENTRY_LIMIT = 50_000;

const NAMESPACE = "http://www.sitemaps.org/schemas/sitemap/0.9";

function escape(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * The absolute URL of the sitemap file of the API pages, for the sitemap
 * index.
 */
export function getApiSitemapUrl(site) {
  return new URL(API_SITEMAP_FILE, site).href;
}

/**
 * The sitemap files to add to the sitemap index: the API sitemap, when the
 * API index is staged in `public/api/`. `root` is the repository root.
 */
export function getApiCustomSitemaps(site, root = process.cwd()) {
  return fs.existsSync(path.join(root, "public", "api", API_INDEX_FILE))
    ? [getApiSitemapUrl(site)]
    : [];
}

/**
 * The absolute URLs of the pages of the API index, sorted. `site` is the
 * absolute URL of the site (`site` in astro.config.mjs).
 */
export function apiSitemapUrls(index, site) {
  const urls = new Set();
  for (const api of Object.values(index.apis))
    for (const item of Object.values(api.items))
      urls.add(new URL(item.url, site).href);
  return [...urls].sort();
}

/** The XML of a sitemap file with one entry for each URL. */
export function buildApiSitemap(urls) {
  if (urls.length > SITEMAP_ENTRY_LIMIT)
    throw new Error(
      `The API index has ${urls.length} pages. A sitemap file holds at most ${SITEMAP_ENTRY_LIMIT} URLs. Split sitemap-api.xml into several files and list each file in the sitemap index.`,
    );
  return (
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<urlset xmlns="${NAMESPACE}">` +
    urls.map((url) => `<url><loc>${escape(url)}</loc></url>`).join("") +
    `</urlset>`
  );
}

/**
 * Writes `sitemap-api.xml` in `output` from the API index in
 * `output`/api/. Without an API index it writes nothing (see
 * `getApiCustomSitemaps`).
 */
export function writeApiSitemap(output, site) {
  const index = readApiIndex(path.join(output, "api", API_INDEX_FILE));
  if (!index) return { written: false, urls: 0 };
  const urls = apiSitemapUrls(index, site);
  fs.writeFileSync(path.join(output, API_SITEMAP_FILE), buildApiSitemap(urls));
  return { written: true, urls: urls.length };
}

function assertListed(output, site, written) {
  const indexFile = path.join(output, SITEMAP_INDEX_FILE);
  const listed =
    fs.existsSync(indexFile) &&
    fs
      .readFileSync(indexFile, "utf8")
      .includes(`<loc>${getApiSitemapUrl(site)}</loc>`);
  if (written && !listed)
    throw new Error(
      `${SITEMAP_INDEX_FILE} does not list ${API_SITEMAP_FILE}: pass getApiCustomSitemaps(site) to the sitemap integration in astro.config.mjs.`,
    );
  if (!written && listed)
    throw new Error(
      `${SITEMAP_INDEX_FILE} lists ${API_SITEMAP_FILE}, but the build has no API index.`,
    );
}

/**
 * The Astro integration that runs `writeApiSitemap` after the build. It must
 * come after the sitemap integration: the check of the sitemap index needs
 * the index that this integration writes.
 */
export function xilaApiSitemap() {
  let site;
  return {
    name: "xila-api-sitemap",
    hooks: {
      "astro:config:done": ({ config }) => {
        if (!config.site)
          throw new Error(
            "The API sitemap needs the absolute URL of the site: set `site` in astro.config.mjs.",
          );
        site = config.site;
      },
      "astro:build:done": ({ dir, logger }) => {
        const output = fileURLToPath(dir);
        const { written, urls } = writeApiSitemap(output, site);
        assertListed(output, site, written);
        logger.info(
          written
            ? `Wrote ${API_SITEMAP_FILE} with ${urls} API pages.`
            : "No API index: the sitemap has no API pages.",
        );
      },
    },
  };
}
