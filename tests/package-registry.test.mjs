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
    publisher: "xila",
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
        path: "keys/developers/xila.json",
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

test("shows a replacement only when its entry is available", () => {
  const index = parseRegistryIndex({
    format_version: 1,
    version: 1,
    expires: 2,
    files: [],
    replacements: [{ name: "xila.clock", replaced_by: "dev.xila.clock" }],
  });
  const legacy = parseRegistryEntry(makeFormat2Entry());
  const replacement = parseRegistryEntry(
    makeFormat2Entry({ name: "dev.xila.clock" }),
  );
  assert.equal(groupPackages([legacy], index.replacements)[0].replacedBy, null);
  assert.equal(
    groupPackages([legacy, replacement], index.replacements).find(
      ({ name }) => name === legacy.name,
    ).replacedBy,
    replacement.name,
  );
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

test("parses format 2 entries including metadata: null", () => {
  const v2 = parseRegistryEntry(makeFormat2Entry());
  assert.equal(v2.formatVersion, 2);
  assert.equal(v2.xilaVersion, "0.1");
  assert.equal(v2.metadata.license, "Apache-2.0");

  const v2NullMeta = parseRegistryEntry(
    makeFormat2Entry({ metadata: null, display_name: null }),
  );
  assert.equal(v2NullMeta.metadata, null);
  assert.equal(v2NullMeta.displayName, null);
});

test("rejects unsafe or invalid registry entries", () => {
  assert.throws(() =>
    parseRegistryEntry(makeFormat2Entry({ format_version: 99 })),
  );
  // The registry publishes format 2 only; format 1 entries are rejected.
  assert.throws(
    () =>
      parseRegistryEntry(
        makeFormat2Entry({ format_version: 1, minimum_xila_abi: 1 }),
      ),
    /Unsupported registry entry format version: 1/,
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

test("rejects entry fields that do not match the registry entry schema", () => {
  for (const overrides of [
    { name: "xila.clock; reboot" },
    { name: "Xila.Clock" },
    { name: "clock" },
    { version: "0.1.0 --allow-untrusted" },
    { target: "wasm32 wasip1" },
    { publisher: "Xila Project" },
    { capabilities: [""] },
    { display_name: "" },
    {
      metadata: {
        summary: "Line one\nLine two",
        license: "MIT",
        source: "https://github.com/xila-project/applications",
      },
    },
  ]) {
    assert.throws(
      () => parseRegistryEntry(makeFormat2Entry(overrides)),
      undefined,
      JSON.stringify(overrides),
    );
  }

  assert.equal(
    parseRegistryEntry(makeFormat2Entry({ name: "example.xila.weather_app" }))
      .name,
    "example.xila.weather_app",
  );
});

test("accepts only schema-valid package names", () => {
  const repeat = (count) => "a".repeat(count);

  // Format 2: at least three components, each at most 63 characters.
  assert.equal(
    parseRegistryEntry(makeFormat2Entry({ name: `xila.${repeat(63)}` })).name,
    `xila.${repeat(63)}`,
  );
  // Legacy two-component names stay valid only under the xila namespace.
  assert.equal(
    parseRegistryEntry(makeFormat2Entry({ name: "xila.clock" })).name,
    "xila.clock",
  );

  for (const name of [
    "foo.bar",
    `xila.${repeat(64)}`,
    `${repeat(63)}.${repeat(63)}`,
  ]) {
    assert.throws(
      () => parseRegistryEntry(makeFormat2Entry({ name })),
      undefined,
      name,
    );
  }
});

test("enforces the schema license character set", () => {
  const withLicense = (license) =>
    makeFormat2Entry({
      metadata: {
        summary: "Clock and timer application.",
        license,
        source: "https://github.com/xila-project/applications",
      },
    });

  assert.equal(
    parseRegistryEntry(withLicense("Apache-2.0 OR (MIT)")).metadata.license,
    "Apache-2.0 OR (MIT)",
  );

  for (const license of ["MIT!", "MIT; rm -rf /", "MIT\n", "   ", ""]) {
    assert.throws(
      () => parseRegistryEntry(withLicense(license)),
      undefined,
      JSON.stringify(license),
    );
  }
});

test("enforces the schema length limits on every entry field", () => {
  const repeat = (count) => "a".repeat(count);
  const baseMetadata = {
    summary: "Clock and timer application.",
    license: "MIT",
    source: "https://github.com/xila-project/applications",
  };
  const url256 = `https://${repeat(248)}`;

  const rejected = [
    { name: `${repeat(63)}.${repeat(31)}.a` }, // 97 characters, pattern valid
    { version: repeat(65) },
    { target: repeat(65) },
    { publisher: repeat(65) },
    { capabilities: Array.from({ length: 33 }, () => "time") },
    { capabilities: [repeat(65)] },
    { display_name: repeat(129) },
    { metadata: { ...baseMetadata, summary: repeat(257) } },
    {
      archive: {
        url: `https://${repeat(249)}`,
        sha256: VALID_SHA256,
        size: 100,
      },
    },
    { metadata: { ...baseMetadata, homepage: "http://example.com/" } },
    { metadata: { ...baseMetadata, homepage: "not a URL" } },
    { metadata: { ...baseMetadata, homepage: `https://${repeat(249)}` } },
  ];
  for (const overrides of rejected) {
    assert.throws(
      () => parseRegistryEntry(makeFormat2Entry(overrides)),
      undefined,
      JSON.stringify(overrides).slice(0, 80),
    );
  }

  const accepted = parseRegistryEntry(
    makeFormat2Entry({
      name: `${repeat(63)}.${repeat(30)}.a`, // 96 characters
      version: repeat(64),
      target: repeat(64),
      publisher: repeat(64),
      capabilities: Array.from({ length: 32 }, () => repeat(64)),
      display_name: repeat(128),
      metadata: { ...baseMetadata, summary: repeat(256), homepage: url256 },
      archive: { url: url256, sha256: VALID_SHA256, size: 100 },
    }),
  );
  assert.equal(accepted.name.length, 96);
  assert.equal(accepted.version.length, 64);
  assert.equal(accepted.target.length, 64);
  assert.equal(accepted.publisher.length, 64);
  assert.equal(accepted.capabilities.length, 32);
  assert.equal(accepted.displayName.length, 128);
  assert.equal(accepted.metadata.summary.length, 256);
  assert.equal(accepted.metadata.homepage.length, 256);
  assert.equal(accepted.archive.url.length, 256);
});

test("rejects index versions that cannot be rendered as a date", () => {
  const indexWithVersion = (version) => ({
    format_version: 1,
    version,
    expires: 20,
    files: [],
  });

  assert.throws(() => parseRegistryIndex(indexWithVersion(8_640_000_000_001)));
  const boundary = parseRegistryIndex(indexWithVersion(8_640_000_000_000));
  assert.equal(
    new Date(boundary.version * 1000).toISOString(),
    "+275760-09-13T00:00:00.000Z",
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
        name: "example.community.notes",
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
        name: "example.community.synth",
        display_name: "Synth",
        publisher: "community",
        target: "native",
        metadata: null,
      }),
    ),
  ]);

  assert.equal(filterPackages(packages, { query: "timer" }).length, 1);
  assert.equal(filterPackages(packages, { target: "native" }).length, 1);
  assert.equal(filterPackages(packages, { publisher: "xila" }).length, 1);
  assert.equal(
    filterPackages(packages, { target: "native", publisher: "xila" }).length,
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
            path: "keys/developers/xila.json",
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

function fixtureFetch(fixtures) {
  return async (url) => {
    const payload = fixtures.get(url);
    if (!payload) return { ok: false, status: 404 };
    return { ok: true, status: 200, json: async () => payload };
  };
}

const PARTIAL_INDEX = {
  format_version: 1,
  version: 10,
  expires: 20,
  files: [
    {
      path: "packages/xila/clock/0.2.0.json",
      sha256: VALID_SHA256,
      size: 200,
    },
    {
      path: "packages/xila/digits/0.2.0.json",
      sha256: VALID_SHA256,
      size: 200,
    },
  ],
};

test("skips an entry that cannot be fetched and keeps the other entries", async () => {
  const catalog = await fetchRegistryCatalog({
    baseUrl: "https://registry.example.org",
    fetchImpl: fixtureFetch(
      new Map([
        ["https://registry.example.org/index.json", PARTIAL_INDEX],
        [
          "https://registry.example.org/packages/xila/clock/0.2.0.json",
          makeFormat2Entry(),
        ],
      ]),
    ),
  });

  assert.equal(catalog.packages.length, 1);
  assert.deepEqual(
    catalog.skippedEntries.map((entry) => entry.entryPath),
    ["packages/xila/digits/0.2.0.json"],
  );
  assert.match(catalog.skippedEntries[0].reason, /HTTP 404/);
});

test("fails when no registry entry can be loaded", async () => {
  await assert.rejects(
    fetchRegistryCatalog({
      baseUrl: "https://registry.example.org",
      fetchImpl: fixtureFetch(
        new Map([["https://registry.example.org/index.json", PARTIAL_INDEX]]),
      ),
    }),
    /Failed to fetch registry entries\. First failure: packages\/xila\/clock\/0\.2\.0\.json: Failed to fetch the entry: HTTP 404\./,
  );
});

test("classifies the aggregate entry error by the first failure", async () => {
  // Every entry body is invalid JSON: not a fetch failure, so the aggregate
  // error keeps the invalid-data prefix.
  await assert.rejects(
    fetchRegistryCatalog({
      baseUrl: "https://registry.example.org",
      fetchImpl: async (url) => {
        if (url.endsWith("/index.json")) {
          return { ok: true, status: 200, json: async () => PARTIAL_INDEX };
        }
        return {
          ok: true,
          status: 200,
          json: async () => {
            throw new SyntaxError("Unexpected token");
          },
        };
      },
    }),
    /No registry entry could be loaded\. First failure: packages\/xila\/clock\/0\.2\.0\.json: Failed to parse the entry: /,
  );

  // Every entry fails validation: same invalid-data classification.
  await assert.rejects(
    fetchRegistryCatalog({
      baseUrl: "https://registry.example.org",
      fetchImpl: fixtureFetch(
        new Map([
          ["https://registry.example.org/index.json", PARTIAL_INDEX],
          [
            "https://registry.example.org/packages/xila/clock/0.2.0.json",
            makeFormat2Entry({ name: "foo.bar" }),
          ],
          [
            "https://registry.example.org/packages/xila/digits/0.2.0.json",
            makeFormat2Entry({ name: "bar.baz" }),
          ],
        ]),
      ),
    }),
    /No registry entry could be loaded\. First failure: packages\/xila\/clock\/0\.2\.0\.json: Registry entry has an invalid package name\./,
  );
});

test("fails when the registry index cannot be fetched", async () => {
  await assert.rejects(
    fetchRegistryCatalog({
      baseUrl: "https://registry.example.org",
      fetchImpl: fixtureFetch(new Map()),
    }),
    /HTTP 404/,
  );
});

test("reports an entry body that is not valid JSON as a parse failure", async () => {
  const catalog = await fetchRegistryCatalog({
    baseUrl: "https://registry.example.org",
    fetchImpl: async (url) => {
      if (url.endsWith("/index.json")) {
        return { ok: true, status: 200, json: async () => PARTIAL_INDEX };
      }
      if (url.includes("digits")) {
        return {
          ok: true,
          status: 200,
          json: async () => {
            throw new SyntaxError(
              'Unexpected token "<", "<html>..." is not valid JSON',
            );
          },
        };
      }
      return { ok: true, status: 200, json: async () => makeFormat2Entry() };
    },
  });

  assert.equal(catalog.packages.length, 1);
  assert.deepEqual(
    catalog.skippedEntries.map((entry) => entry.entryPath),
    ["packages/xila/digits/0.2.0.json"],
  );
  assert.match(catalog.skippedEntries[0].reason, /Failed to parse the entry/);
  assert.doesNotMatch(
    catalog.skippedEntries[0].reason,
    /Failed to fetch the entry/,
  );
});

test("rethrows an aborted entry request instead of skipping the entry", async () => {
  const controller = new AbortController();
  controller.abort();

  await assert.rejects(
    fetchRegistryCatalog({
      baseUrl: "https://registry.example.org",
      signal: controller.signal,
      fetchImpl: async (url) => {
        if (url.endsWith("/index.json")) {
          return { ok: true, status: 200, json: async () => PARTIAL_INDEX };
        }
        throw new DOMException("The operation was aborted.", "AbortError");
      },
    }),
    (error) => error instanceof DOMException && error.name === "AbortError",
  );
});
