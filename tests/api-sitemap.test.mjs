import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { buildApiIndex, writeApiIndex } from "../scripts/api-index.mjs";
import {
  API_SITEMAP_FILE,
  SITEMAP_ENTRY_LIMIT,
  apiSitemapUrls,
  buildApiSitemap,
  getApiCustomSitemaps,
  getApiSitemapUrl,
  writeApiSitemap,
  xilaApiSitemap,
} from "../scripts/api-sitemap.mjs";
import {
  createDirectory,
  writeFile,
  writeRustdocFixture,
} from "./helpers/rustdoc-fixture.mjs";

const SITE = "https://www.example.org";

test("lists one absolute URL for each page of the API index", (t) => {
  const api = path.join(createDirectory(t, "xila-sitemap-"), "api");
  writeRustdocFixture(api);
  const index = buildApiIndex(api);
  const count =
    Object.keys(index.apis.host.items).length +
    Object.keys(index.apis.guest.items).length;
  const urls = apiSitemapUrls(index, SITE);
  assert.equal(urls.length, count);
  assert.deepEqual(urls, [...urls].sort());
  assert.ok(urls.every((url) => url.startsWith(`${SITE}/api/`)));
  assert.ok(urls.includes(`${SITE}/api/host/xila/index.html`));
  assert.ok(urls.includes(`${SITE}/api/guest/wasm/index.html`));
});

test("writes the XML of a sitemap and escapes the URLs", () => {
  assert.equal(
    buildApiSitemap([`${SITE}/api/a.html`, `${SITE}/api/b&c.html`]),
    '<?xml version="1.0" encoding="UTF-8"?>' +
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
      `<url><loc>${SITE}/api/a.html</loc></url>` +
      `<url><loc>${SITE}/api/b&amp;c.html</loc></url>` +
      "</urlset>",
  );
});

test("fails when the API index has more pages than a sitemap file holds", () => {
  const urls = Array.from(
    { length: SITEMAP_ENTRY_LIMIT },
    (_, number) => `${SITE}/api/${number}.html`,
  );
  assert.doesNotThrow(() => buildApiSitemap(urls));
  assert.throws(
    () => buildApiSitemap([...urls, `${SITE}/api/last.html`]),
    /50001 pages.*at most 50000 URLs/,
  );
});

test("writes the sitemap file from the API index of the build", (t) => {
  const output = createDirectory(t, "xila-sitemap-");
  assert.deepEqual(writeApiSitemap(output, SITE), {
    written: false,
    urls: 0,
  });
  assert.equal(fs.existsSync(path.join(output, API_SITEMAP_FILE)), false);

  const api = path.join(output, "api");
  writeRustdocFixture(api);
  const index = writeApiIndex(api);
  const result = writeApiSitemap(output, SITE);
  assert.equal(result.written, true);
  assert.equal(result.urls, apiSitemapUrls(index, SITE).length);
  const xml = fs.readFileSync(path.join(output, API_SITEMAP_FILE), "utf8");
  assert.equal(xml.match(/<url>/g).length, result.urls);
});

test("adds the API sitemap to the sitemap index only with an API index", (t) => {
  const root = createDirectory(t, "xila-sitemap-");
  assert.equal(getApiSitemapUrl(SITE), `${SITE}/sitemap-api.xml`);
  assert.deepEqual(getApiCustomSitemaps(SITE, root), []);
  writeFile(path.join(root, "public", "api", "api-index.json"), "{}");
  assert.deepEqual(getApiCustomSitemaps(SITE, root), [
    `${SITE}/sitemap-api.xml`,
  ]);
});

function runBuildDone(t, { withIndex, listed }) {
  const output = createDirectory(t, "xila-sitemap-");
  if (withIndex) writeRustdocFixture(path.join(output, "api"));
  if (withIndex) writeApiIndex(path.join(output, "api"));
  writeFile(
    path.join(output, "sitemap-index.xml"),
    `<sitemapindex>${listed ? `<sitemap><loc>${SITE}/sitemap-api.xml</loc></sitemap>` : ""}</sitemapindex>`,
  );
  const integration = xilaApiSitemap();
  integration.hooks["astro:config:done"]({ config: { site: SITE } });
  const messages = [];
  integration.hooks["astro:build:done"]({
    dir: new URL(`file://${output}/`),
    logger: { info: (message) => messages.push(message) },
  });
  return { output, messages };
}

test("the integration checks that the sitemap index lists the API sitemap", (t) => {
  const built = runBuildDone(t, { withIndex: true, listed: true });
  assert.match(built.messages[0], /Wrote sitemap-api\.xml with \d+ API pages/);
  assert.throws(
    () => runBuildDone(t, { withIndex: true, listed: false }),
    /does not list sitemap-api\.xml/,
  );
  assert.throws(
    () => runBuildDone(t, { withIndex: false, listed: true }),
    /lists sitemap-api\.xml, but the build has no API index/,
  );
  assert.match(
    runBuildDone(t, { withIndex: false, listed: false }).messages[0],
    /No API index/,
  );
});

test("the integration needs the absolute URL of the site", () => {
  assert.throws(
    () => xilaApiSitemap().hooks["astro:config:done"]({ config: {} }),
    /set `site`/,
  );
});
