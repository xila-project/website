import path from "node:path";

import {
  API_INDEX_FILE,
  getApiSearchHref,
  parseApiTarget,
  readApiIndex,
  resolveApiTarget,
} from "./api-index.mjs";

/**
 * The index read by the site build: staged by docs:rustdoc, or downloaded.
 * The root is the working directory, because Astro bundles this module with
 * the components that import it: `import.meta.url` is then in the build
 * output. The npm scripts run in the repository root.
 */
export function getApiIndexPath(root = process.cwd()) {
  return path.join(root, "public", "api", API_INDEX_FILE);
}

let cached;

function loadIndex() {
  if (cached === undefined) cached = readApiIndex(getApiIndexPath());
  return cached;
}

/** Replaces the index used by `resolveApiLink`, for tests. */
export function setApiIndex(index) {
  cached = index;
}

const CALLABLE_ANCHORS = /^(method|tymethod)\./;

/**
 * Resolves a link to the API for the site build. Always returns an `href`:
 * when the target cannot be resolved, it is the rustdoc search for the
 * target, and `error` says why. Without an index, `unchecked` says so
 * instead. The documentation check reports errors and counts unchecked
 * links as skipped.
 *
 * `label` is the default link text: the path as written, with `()` after
 * functions and methods and `!` after macros.
 */
export function resolveApiLink(target, index = loadIndex()) {
  const { path: written } = parseApiTarget(target);
  if (!index)
    return {
      href: getApiSearchHref(target),
      label: written,
      unchecked: `no ${API_INDEX_FILE}: run npm run docs:rustdoc or npm run docs:api-index`,
    };
  const result = resolveApiTarget(index, target);
  if (result.error)
    return {
      href: getApiSearchHref(target),
      label: written,
      error: result.error,
    };
  const callable =
    result.kind === "fn" ||
    (result.anchor !== undefined && CALLABLE_ANCHORS.test(result.anchor));
  const suffix = callable ? "()" : result.kind === "macro" ? "!" : "";
  return {
    href: result.href,
    api: `${result.architecture}:${result.path}`,
    label: `${written}${suffix}`,
    // A crate named by its own name, such as `network`, reads "network
    // crate"; a re-export path such as `xila::task` does not.
    crate:
      result.kind === "mod" &&
      !result.path.includes("::") &&
      !written.includes("::"),
  };
}
