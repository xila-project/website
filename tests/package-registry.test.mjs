import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCatalogUrl,
  buildInstallCommand,
  compareVersions,
  fetchRegistryCatalog,
  filterPackages,
  formatBytes,
  groupPackages,
  mapWithConcurrency,
  parseRegistryEntry,
  parseRegistryIndex,
  readCatalogUrlState,
} from "../scripts/package-registry.mjs";

const VALID_SHA256 =
  "6976f8d118066b7294ac051160505b2c410fa9213cffa6a7c889946cf6fdbfcd";

function makeFormat2Entry(overrides = {}) {
  return {
    $schema:
      "https://raw.githubusercontent.com/xila-project/package_manager/main/schemas/registry-entry.schema.json",
    format_version: 2,
    name: "xila.clock",
    version: "0.2.0",
    target: "wasm32-wasip1",
    xila_version: "0.1",
    capabilities: ["time"],
    display_name: "Clock",
    metadata: {
      summary: "Clock and timer application.",
      license: "Apache-2.0",
      source: "https://github.com/xila-project/applications",
      homepage: "https://www.xila.dev/",
    },
    publisher: "xila-project",
    archive: {
      url: "https://github.com/xila-project/applications/releases/download/xila.clock-v0.2.0/xila.clock-0.2.0-wasm32-wasip1.xpk",
      sha256: VALID_SHA256,
      size: 99840,
    },
    ...overrides,
  };
}

test("parses registry index and extracts package entry paths only", () => {
  const index = parseRegistryIndex({
    format_version: 1,
    version: 1794832854,
    expires: 1797424854,
    files: [
      {
        path: "keys/developers/xila-project.json",
        sha256: VALID_SHA256,
        size: 281,
      },
      {
        path: "packages/xila/clock/0.1.0.json",
        sha256: VALID_SHA256,
        size: 528,
      },
      {
        path: "packages/xila/weather/0.2.0.json",
        sha256: VALID_SHA256,
        size: 537,
      },
    ],
  });

  assert.equal(index.version, 1794832854);
  assert.deepEqual(index.entryPaths, [
    "packages/xila/clock/0.1.0.json",
    "packages/xila/weather/0.2.0.json",
  ]);
});

test("rejects malformed or duplicate registry index entries", () => {
  assert.throws(() => parseRegistryIndex({ format_version: 2, files: [] }));
  assert.throws(() =>
    parseRegistryIndex({
      format_version: 1,
      version: 1,
      expires: 2,
      files: [
        { path: "packages/xila/clock/0.1.0.json" },
        { path: "packages/xila/clock/0.1.0.json" },
      ],
    }),
  );
});

test("parses format 2 entries including metadata: null and format 1 compatibility", () => {
  const v2 = parseRegistryEntry(makeFormat2Entry());
  assert.equal(v2.formatVersion, 2);
  assert.equal(v2.xilaVersion, "0.1");
  assert.equal(v2.minimumXilaAbi, null);
  assert.equal(v2.metadata.license, "Apache-2.0");

  const v2NullMeta = parseRegistryEntry(
    makeFormat2Entry({ metadata: null, display_name: null }),
  );
  assert.equal(v2NullMeta.metadata, null);
  assert.equal(v2NullMeta.displayName, null);

  const v1 = parseRegistryEntry({
    format_version: 1,
    name: "xila.clock",
    version: "0.1.0",
    target: "wasm32-wasip1",
    minimum_xila_abi: 1,
    capabilities: [],
    display_name: "Clock",
    metadata: null,
    publisher: "xila-project",
    archive: {
      url: "https://github.com/xila-project/applications/releases/download/xila.clock-v0.1.0/xila.clock-0.1.0-wasm32-wasip1.xpk",
      sha256: VALID_SHA256,
      size: 99840,
    },
  });
  assert.equal(v1.formatVersion, 1);
  assert.equal(v1.xilaVersion, null);
  assert.equal(v1.minimumXilaAbi, 1);
});

test("rejects unsafe or invalid registry entries", () => {
  assert.throws(() =>
    parseRegistryEntry(makeFormat2Entry({ format_version: 99 })),
  );
  assert.throws(() =>
    parseRegistryEntry(
      makeFormat2Entry({
        archive: {
          url: "http://insecure.example/a.xpk",
          sha256: VALID_SHA256,
          size: 100,
        },
      }),
    ),
  );
  assert.throws(() =>
    parseRegistryEntry(
      makeFormat2Entry({
        metadata: {
          summary: "Clock",
          license: "MIT",
          source: "javascript:alert(1)",
        },
      }),
    ),
  );
});

test("sorts versions latest first and picks latest version for package cards", () => {
  assert.ok(compareVersions("0.10.0", "0.2.0") > 0);
  assert.ok(compareVersions("1.0.0", "1.0.0-rc.1") > 0);
  assert.ok(compareVersions("1.0.0-rc.2", "1.0.0-rc.1") > 0);

  const grouped = groupPackages([
    parseRegistryEntry(makeFormat2Entry({ version: "0.1.0" })),
    parseRegistryEntry(makeFormat2Entry({ version: "0.10.0" })),
    parseRegistryEntry(makeFormat2Entry({ version: "0.2.0" })),
    parseRegistryEntry(
      makeFormat2Entry({
        name: "community.notes",
        display_name: "Notes",
        publisher: "community",
        target: "native",
        version: "1.0.0",
      }),
    ),
  ]);

  assert.equal(grouped.length, 2);
  const clock = grouped.find((item) => item.name === "xila.clock");
  assert.equal(clock.latestVersion, "0.10.0");
  assert.deepEqual(
    clock.versions.map((entry) => entry.version),
    ["0.10.0", "0.2.0", "0.1.0"],
  );
});

test("filters packages by search query, target, and publisher", () => {
  const packages = groupPackages([
    parseRegistryEntry(
      makeFormat2Entry({ name: "xila.clock", version: "0.1.0" }),
    ),
    parseRegistryEntry(
      makeFormat2Entry({
        name: "community.synth",
        display_name: "Synth",
        publisher: "community",
        target: "native",
        metadata: null,
      }),
    ),
  ]);

  assert.equal(filterPackages(packages, { query: "timer" }).length, 1);
  assert.equal(filterPackages(packages, { target: "native" }).length, 1);
  assert.equal(
    filterPackages(packages, { publisher: "xila-project" }).length,
    1,
  );
  assert.equal(
    filterPackages(packages, { target: "native", publisher: "xila-project" })
      .length,
    0,
  );
});

test("builds exact on-device package install commands", () => {
  assert.equal(
    buildInstallCommand("xila.clock", "0.2.0", true),
    "package install xila.clock",
  );
  assert.equal(
    buildInstallCommand("xila.clock", "0.1.0", false),
    "package install xila.clock@0.1.0",
  );
});

test("formats byte sizes and URL state helpers", () => {
  assert.equal(formatBytes(512), "512 B");
  assert.equal(formatBytes(99840), "97.5 KiB (99,840 B)");

  assert.deepEqual(
    readCatalogUrlState("?package=xila.clock&version=0.1.0", ""),
    { packageName: "xila.clock", version: "0.1.0" },
  );
  assert.deepEqual(readCatalogUrlState("", "#xila.clock@0.1.0"), {
    packageName: "xila.clock",
    version: "0.1.0",
  });
  assert.equal(
    buildCatalogUrl("/packages/", "xila.clock", "0.2.0", true),
    "/packages/?package=xila.clock",
  );
  assert.equal(
    buildCatalogUrl("/packages/", "xila.clock", "0.1.0", false),
    "/packages/?package=xila.clock&version=0.1.0",
  );
});

test("fetches catalog entries with bounded concurrency", async () => {
  let inFlight = 0;
  let maxInFlight = 0;

  const outputs = await mapWithConcurrency([1, 2, 3, 4, 5, 6], 2, async (n) => {
    inFlight += 1;
    maxInFlight = Math.max(maxInFlight, inFlight);
    await new Promise((resolve) => setTimeout(resolve, 5));
    inFlight -= 1;
    return n * 2;
  });

  assert.deepEqual(outputs, [2, 4, 6, 8, 10, 12]);
  assert.ok(maxInFlight <= 2);

  const fixtures = new Map([
    [
      "https://registry.example.org/index.json",
      {
        format_version: 1,
        version: 10,
        expires: 20,
        files: [
          {
            path: "keys/developers/xila-project.json",
            sha256: VALID_SHA256,
            size: 100,
          },
          {
            path: "packages/xila/clock/0.1.0.json",
            sha256: VALID_SHA256,
            size: 200,
          },
          {
            path: "packages/xila/clock/0.2.0.json",
            sha256: VALID_SHA256,
            size: 200,
          },
        ],
      },
    ],
    [
      "https://registry.example.org/packages/xila/clock/0.1.0.json",
      makeFormat2Entry({ version: "0.1.0" }),
    ],
    [
      "https://registry.example.org/packages/xila/clock/0.2.0.json",
      makeFormat2Entry({ version: "0.2.0" }),
    ],
  ]);

  const catalog = await fetchRegistryCatalog({
    baseUrl: "https://registry.example.org/",
    concurrency: 2,
    fetchImpl: async (url) => {
      const payload = fixtures.get(url);
      if (!payload) return { ok: false, status: 404 };
      return { ok: true, status: 200, json: async () => payload };
    },
  });

  assert.equal(catalog.packages.length, 1);
  assert.equal(catalog.packages[0].latestVersion, "0.2.0");
  assert.equal(catalog.skippedEntries.length, 0);
});
