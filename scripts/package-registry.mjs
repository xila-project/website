export const DEFAULT_REGISTRY_URL = "https://registry.xila.dev";
export const DEFAULT_FETCH_CONCURRENCY = 6;

const SHA256_RE = /^[0-9a-f]{64}$/;
// Patterns from package_manager `schemas/registry-entry.schema.json`. The
// package name pattern accepts the format 2 rule (at least three components)
// and the legacy two-component `xila.<name>` rule, so format 1 entries stay
// valid. Each name component is limited to 63 characters. The name and the
// version go into the install command, so they must not hold spaces or shell
// characters.
const PACKAGE_NAME_RE =
  /^(?:[a-z0-9](?:[a-z0-9_-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9_-]{0,61}[a-z0-9])?){2,}|xila\.[a-z0-9](?:[a-z0-9_-]{0,61}[a-z0-9])?)$/;
const PACKAGE_VERSION_RE = /^[A-Za-z0-9.+-]{1,64}$/;
const TARGET_RE = /^[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)*$/;
const PUBLISHER_RE = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;
// SPDX license expression character set; it also excludes control characters.
const LICENSE_RE = /^[A-Za-z0-9.+() -]*[A-Za-z0-9.+()-][A-Za-z0-9.+() -]*$/;
// Control characters are not allowed in catalog summaries.
const CONTROL_CHARACTER_RE = /[\u0000-\u001f\u007f]/;
const MAXIMUM_URL_LENGTH = 256;
// The catalog renders the index version as a Unix timestamp, so it must stay
// within the range that `Date` can represent (8.64e15 ms).
const MAXIMUM_INDEX_VERSION = 8_640_000_000_000;
const PACKAGE_ENTRY_PATH_RE =
  /^packages\/[A-Za-z0-9._+-]+(?:\/[A-Za-z0-9._+-]+)+\.json$/;
const XILA_VERSION_RE =
  /^(?:0|[1-9][0-9]{0,3}|[1-5][0-9]{4}|6[0-4][0-9]{3}|65[0-4][0-9]{2}|655[0-2][0-9]|6553[0-5])\.(?:0|[1-9][0-9]{0,3}|[1-5][0-9]{4}|6[0-4][0-9]{3}|65[0-4][0-9]{2}|655[0-2][0-9]|6553[0-5])$/;

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isHttpsUrl(value) {
  if (
    typeof value !== "string" ||
    value.length > MAXIMUM_URL_LENGTH ||
    /\s/.test(value)
  ) {
    return false;
  }
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Parse and validate a registry index payload (format version 1).
 */
export function parseRegistryIndex(raw) {
  if (!isRecord(raw)) {
    throw new Error("Registry index must be a JSON object.");
  }
  if (raw.format_version !== 1) {
    throw new Error(
      `Unsupported registry index format version: ${String(raw.format_version)}.`,
    );
  }
  if (!Number.isInteger(raw.version) || raw.version < 1) {
    throw new Error("Registry index version must be a positive integer.");
  }
  if (raw.version > MAXIMUM_INDEX_VERSION) {
    throw new Error("Registry index version is too large to render as a date.");
  }
  if (!Number.isInteger(raw.expires) || raw.expires < 2) {
    throw new Error("Registry index expiry must be a valid integer timestamp.");
  }
  if (!Array.isArray(raw.files)) {
    throw new Error("Registry index files must be an array.");
  }

  const seenPaths = new Set();
  const entryPaths = [];

  for (const item of raw.files) {
    if (!isRecord(item) || typeof item.path !== "string") {
      throw new Error("Registry index contains a malformed file record.");
    }
    if (seenPaths.has(item.path)) {
      throw new Error(`Registry index contains duplicate path: ${item.path}`);
    }
    seenPaths.add(item.path);

    if (
      PACKAGE_ENTRY_PATH_RE.test(item.path) &&
      !item.path
        .split("/")
        .some((segment) => segment === "." || segment === "..")
    ) {
      entryPaths.push(item.path);
    }
  }

  return {
    formatVersion: raw.format_version,
    version: raw.version,
    expires: raw.expires,
    entryPaths,
  };
}

/**
 * Parse and validate a registry entry payload.
 * Format version 2 is current (`xila_version`); format version 1 (`minimum_xila_abi`)
 * is accepted for compatibility with published entries.
 */
export function parseRegistryEntry(raw) {
  if (!isRecord(raw)) {
    throw new Error("Registry entry must be a JSON object.");
  }
  if (raw.format_version !== 1 && raw.format_version !== 2) {
    throw new Error(
      `Unsupported registry entry format version: ${String(raw.format_version)}.`,
    );
  }
  if (
    typeof raw.name !== "string" ||
    raw.name.length > 96 ||
    !PACKAGE_NAME_RE.test(raw.name)
  ) {
    throw new Error("Registry entry has an invalid package name.");
  }
  if (
    typeof raw.version !== "string" ||
    !PACKAGE_VERSION_RE.test(raw.version)
  ) {
    throw new Error(`Registry entry ${raw.name} has an invalid version.`);
  }
  if (
    typeof raw.target !== "string" ||
    raw.target.length > 64 ||
    !TARGET_RE.test(raw.target)
  ) {
    throw new Error(`Registry entry ${raw.name} has an invalid target.`);
  }
  if (
    typeof raw.publisher !== "string" ||
    raw.publisher.length > 64 ||
    !PUBLISHER_RE.test(raw.publisher)
  ) {
    throw new Error(`Registry entry ${raw.name} has an invalid publisher.`);
  }
  if (
    !Array.isArray(raw.capabilities) ||
    raw.capabilities.length > 32 ||
    !raw.capabilities.every(
      (item) =>
        typeof item === "string" && item.length >= 1 && item.length <= 64,
    )
  ) {
    throw new Error(`Registry entry ${raw.name} has invalid capabilities.`);
  }
  if (
    raw.display_name !== null &&
    (typeof raw.display_name !== "string" ||
      raw.display_name.length < 1 ||
      raw.display_name.length > 128)
  ) {
    throw new Error(`Registry entry ${raw.name} has invalid display_name.`);
  }

  let xilaVersion = null;
  let minimumXilaAbi = null;
  if (raw.format_version === 2) {
    if (
      typeof raw.xila_version !== "string" ||
      !XILA_VERSION_RE.test(raw.xila_version)
    ) {
      throw new Error(`Registry entry ${raw.name} has invalid xila_version.`);
    }
    xilaVersion = raw.xila_version;
  } else {
    if (!Number.isInteger(raw.minimum_xila_abi) || raw.minimum_xila_abi < 0) {
      throw new Error(
        `Registry entry ${raw.name} has invalid minimum_xila_abi.`,
      );
    }
    minimumXilaAbi = raw.minimum_xila_abi;
  }

  let metadata = null;
  if (raw.metadata !== null) {
    if (!isRecord(raw.metadata)) {
      throw new Error(`Registry entry ${raw.name} has invalid metadata.`);
    }
    if (
      !isNonEmptyString(raw.metadata.summary) ||
      raw.metadata.summary.length > 256 ||
      CONTROL_CHARACTER_RE.test(raw.metadata.summary) ||
      !isNonEmptyString(raw.metadata.license) ||
      raw.metadata.license.length > 64 ||
      !LICENSE_RE.test(raw.metadata.license) ||
      !isHttpsUrl(raw.metadata.source)
    ) {
      throw new Error(
        `Registry entry ${raw.name} has incomplete catalog metadata.`,
      );
    }
    if (
      raw.metadata.homepage !== undefined &&
      raw.metadata.homepage !== null &&
      !isHttpsUrl(raw.metadata.homepage)
    ) {
      throw new Error(`Registry entry ${raw.name} has invalid homepage URL.`);
    }
    metadata = {
      summary: raw.metadata.summary,
      license: raw.metadata.license,
      source: raw.metadata.source,
      homepage: raw.metadata.homepage ?? null,
    };
  }

  if (
    !isRecord(raw.archive) ||
    !isHttpsUrl(raw.archive.url) ||
    typeof raw.archive.sha256 !== "string" ||
    !SHA256_RE.test(raw.archive.sha256) ||
    !Number.isInteger(raw.archive.size) ||
    raw.archive.size < 1
  ) {
    throw new Error(`Registry entry ${raw.name} has invalid archive metadata.`);
  }

  return {
    formatVersion: raw.format_version,
    name: raw.name,
    version: raw.version,
    target: raw.target,
    xilaVersion,
    minimumXilaAbi,
    capabilities: [...raw.capabilities],
    displayName:
      raw.display_name && raw.display_name.trim().length > 0
        ? raw.display_name
        : null,
    metadata,
    publisher: raw.publisher,
    archive: {
      url: raw.archive.url,
      sha256: raw.archive.sha256,
      size: raw.archive.size,
    },
  };
}

function splitVersion(version) {
  const withoutBuild = version.split("+")[0];
  const dashIndex = withoutBuild.indexOf("-");
  const coreText =
    dashIndex === -1 ? withoutBuild : withoutBuild.slice(0, dashIndex);
  const prereleaseText =
    dashIndex === -1 ? "" : withoutBuild.slice(dashIndex + 1);
  return {
    core: coreText.split(".").map((part) => {
      return /^\d+$/.test(part) ? Number(part) : part;
    }),
    prerelease: prereleaseText
      ? prereleaseText.split(".").map((part) => {
          return /^\d+$/.test(part) ? Number(part) : part;
        })
      : [],
  };
}

function compareIdentifiers(a, b) {
  const aIsNum = typeof a === "number";
  const bIsNum = typeof b === "number";
  if (aIsNum && bIsNum) return a - b;
  if (aIsNum && !bIsNum) return -1;
  if (!aIsNum && bIsNum) return 1;
  return String(a).localeCompare(String(b), "en");
}

/**
 * Compare two package version strings in ascending order.
 */
export function compareVersions(left, right) {
  if (left === right) return 0;
  const a = splitVersion(left);
  const b = splitVersion(right);
  const maxCore = Math.max(a.core.length, b.core.length);
  for (let i = 0; i < maxCore; i += 1) {
    const aPart = a.core[i] ?? 0;
    const bPart = b.core[i] ?? 0;
    const diff = compareIdentifiers(aPart, bPart);
    if (diff !== 0) return diff;
  }

  if (a.prerelease.length === 0 && b.prerelease.length > 0) return 1;
  if (a.prerelease.length > 0 && b.prerelease.length === 0) return -1;

  const maxPre = Math.max(a.prerelease.length, b.prerelease.length);
  for (let i = 0; i < maxPre; i += 1) {
    if (i >= a.prerelease.length) return -1;
    if (i >= b.prerelease.length) return 1;
    const diff = compareIdentifiers(a.prerelease[i], b.prerelease[i]);
    if (diff !== 0) return diff;
  }

  return left.localeCompare(right, "en");
}

/**
 * Group validated registry entries by package identifier, with versions sorted
 * latest first.
 */
export function groupPackages(entries) {
  const byName = new Map();
  for (const entry of entries) {
    let list = byName.get(entry.name);
    if (!list) {
      list = [];
      byName.set(entry.name, list);
    }
    list.push(entry);
  }

  const packages = [];
  for (const [name, versions] of byName) {
    const sorted = [...versions].sort((a, b) => {
      const versionOrder = compareVersions(b.version, a.version);
      if (versionOrder !== 0) return versionOrder;
      return a.target.localeCompare(b.target, "en");
    });
    const latest = sorted[0];
    const targets = [...new Set(sorted.map((entry) => entry.target))].sort(
      (a, b) => a.localeCompare(b, "en"),
    );
    const publishers = [
      ...new Set(sorted.map((entry) => entry.publisher)),
    ].sort((a, b) => a.localeCompare(b, "en"));

    packages.push({
      name,
      displayName: latest.displayName ?? name,
      latestVersion: latest.version,
      latest,
      versions: sorted,
      targets,
      publishers,
    });
  }

  packages.sort((a, b) => {
    const titleOrder = a.displayName.localeCompare(b.displayName, "en", {
      sensitivity: "base",
    });
    if (titleOrder !== 0) return titleOrder;
    return a.name.localeCompare(b.name, "en");
  });

  return packages;
}

/**
 * Filter grouped packages by search query, target, and publisher.
 */
export function filterPackages(
  packages,
  { query = "", target = "", publisher = "" } = {},
) {
  const needle = query.trim().toLowerCase();
  return packages.filter((pkg) => {
    if (target && !pkg.targets.includes(target)) {
      return false;
    }
    if (publisher && !pkg.publishers.includes(publisher)) {
      return false;
    }
    if (!needle) {
      return true;
    }
    const haystack = [
      pkg.name,
      pkg.displayName,
      pkg.latest.metadata?.summary ?? "",
      ...pkg.publishers,
      ...pkg.targets,
      ...pkg.latest.capabilities,
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(needle);
  });
}

/**
 * Build the exact on-device `package` CLI command for installing a package.
 * Matches `applications/executables/package/src/cli.rs`.
 */
export function buildInstallCommand(name, version = "", isLatest = true) {
  if (!isNonEmptyString(name)) {
    throw new Error("Package name is required to build an install command.");
  }
  const spec =
    isLatest || !isNonEmptyString(version) ? name : `${name}@${version}`;
  return `package install ${spec}`;
}

/**
 * Format an archive size in bytes for catalog display.
 */
export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KiB", "MiB", "GiB"];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(1)} ${units[unitIndex]} (${bytes.toLocaleString("en-US")} B)`;
}

/**
 * Run async tasks over `items` with bounded concurrency, preserving item order.
 */
export async function mapWithConcurrency(items, limit, worker) {
  const concurrency = Math.max(1, Math.floor(limit));
  const results = new Array(items.length);
  let nextIndex = 0;

  async function runWorker() {
    while (nextIndex < items.length) {
      const current = nextIndex;
      nextIndex += 1;
      results[current] = await worker(items[current], current);
    }
  }

  const workerCount = Math.min(concurrency, items.length);
  await Promise.all(Array.from({ length: workerCount }, () => runWorker()));
  return results;
}

/**
 * Fetch the registry index and every listed package entry using bounded
 * concurrency.
 */
export async function fetchRegistryCatalog({
  baseUrl = DEFAULT_REGISTRY_URL,
  concurrency = DEFAULT_FETCH_CONCURRENCY,
  fetchImpl = fetch,
  signal,
} = {}) {
  const root = baseUrl.replace(/\/+$/, "");
  const indexResponse = await fetchImpl(`${root}/index.json`, { signal });
  if (!indexResponse.ok) {
    throw new Error(
      `Failed to fetch registry index (HTTP ${indexResponse.status}).`,
    );
  }
  const index = parseRegistryIndex(await indexResponse.json());

  // A failed entry request skips that entry only. The catalog shows the
  // other entries and reports the skipped ones. A cancelled load stops.
  const fetched = await mapWithConcurrency(
    index.entryPaths,
    concurrency,
    async (entryPath) => {
      let response;
      try {
        response = await fetchImpl(`${root}/${entryPath}`, { signal });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}.`);
        }
      } catch (error) {
        if (signal?.aborted) throw error;
        return {
          entryPath,
          payload: null,
          error: `Failed to fetch the entry: ${
            error instanceof Error ? error.message : String(error)
          }`,
        };
      }
      try {
        return { entryPath, payload: await response.json(), error: null };
      } catch (error) {
        if (signal?.aborted) throw error;
        return {
          entryPath,
          payload: null,
          error: `Failed to parse the entry: ${
            error instanceof Error ? error.message : String(error)
          }`,
        };
      }
    },
  );

  const entries = [];
  const skippedEntries = [];
  for (const { entryPath, payload, error } of fetched) {
    if (error !== null) {
      skippedEntries.push({ entryPath, reason: error });
      continue;
    }
    try {
      entries.push(parseRegistryEntry(payload));
    } catch (parseError) {
      skippedEntries.push({
        entryPath,
        reason:
          parseError instanceof Error ? parseError.message : String(parseError),
      });
    }
  }

  if (entries.length === 0 && skippedEntries.length > 0) {
    const first = skippedEntries[0];
    // Keep the first failure's kind in the prefix, so the catalog page can
    // tell a network failure from invalid registry data.
    const prefix = first.reason.startsWith("Failed to fetch the entry")
      ? "Failed to fetch registry entries"
      : "No registry entry could be loaded";
    throw new Error(
      `${prefix}. First failure: ${first.entryPath}: ${first.reason}`,
    );
  }

  return {
    index,
    entries,
    packages: groupPackages(entries),
    skippedEntries,
  };
}

/**
 * Read selected package name and optional version from URL search parameters or
 * hash fragment.
 */
export function readCatalogUrlState(search = "", hash = "") {
  const params = new URLSearchParams(search);
  const packageFromSearch = params.get("package")?.trim() || "";
  const versionFromSearch = params.get("version")?.trim() || "";
  if (packageFromSearch) {
    return {
      packageName: packageFromSearch,
      version: versionFromSearch,
    };
  }

  const rawHash = hash.replace(/^#/, "").trim();
  if (!rawHash) {
    return { packageName: "", version: "" };
  }
  if (rawHash.includes("=")) {
    const hashParams = new URLSearchParams(rawHash);
    return {
      packageName: hashParams.get("package")?.trim() || "",
      version: hashParams.get("version")?.trim() || "",
    };
  }
  const [packageName, version = ""] = rawHash.split("@");
  return { packageName: packageName.trim(), version: version.trim() };
}

/**
 * Build a shareable relative URL for the catalog or a package detail view.
 */
export function buildCatalogUrl(
  pathname,
  packageName = "",
  version = "",
  isLatest = true,
) {
  const params = new URLSearchParams();
  if (packageName) {
    params.set("package", packageName);
    if (version && !isLatest) {
      params.set("version", version);
    }
  }
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}
