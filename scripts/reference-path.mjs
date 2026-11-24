const REFERENCE_ARCHITECTURES = new Set(["host", "guest"]);

// The crate at the root of each published API: Core's façade for the host
// and the guest API crate of Applications.
export const API_ROOT_CRATES = Object.freeze({ host: "xila", guest: "wasm" });

export function getReferencePagePath(kind, symbol) {
  if (kind === undefined && symbol === undefined) {
    return "index.html";
  }

  if (kind === undefined || symbol === undefined) {
    throw new Error("Reference kind and symbol must be provided together");
  }

  return `${kind}.${symbol}.html`;
}

export function getReferenceTargetPath(crateName, kind, symbol, member) {
  if (member !== undefined && (kind === undefined || symbol === undefined)) {
    throw new Error("Reference member requires a kind and symbol");
  }

  const page = getReferencePagePath(kind, symbol);
  const fragment = member === undefined ? "" : `#${member}`;

  return `${crateName}/${page}${fragment}`;
}

function assertArchitecture(architecture) {
  if (!REFERENCE_ARCHITECTURES.has(architecture)) {
    throw new Error(`Unsupported reference architecture: ${architecture}`);
  }
}

/** The URL of a rustdoc page, for example `/api/host/xila/index.html`. */
export function getApiHref(architecture, targetPath) {
  assertArchitecture(architecture);
  return `/api/${architecture}/${targetPath}`;
}

/** The URL of the root crate page of an API. */
export function getApiRootHref(architecture) {
  assertArchitecture(architecture);
  return getApiHref(
    architecture,
    `${API_ROOT_CRATES[architecture]}/index.html`,
  );
}

/**
 * The `/api/...` URL that the frame page loads for a `?path=` value, for
 * example `host/xila/index.html#method.spawn`. Returns `null` when the value
 * is missing or does not address a page under `/api/host/` or `/api/guest/`.
 */
export function getApiFrameSource(pathValue) {
  if (!pathValue) return null;
  let target;
  try {
    target = new URL(pathValue, "https://api.invalid/api/");
  } catch {
    return null;
  }
  if (
    target.origin !== "https://api.invalid" ||
    !/^\/api\/(host|guest)\//.test(target.pathname)
  )
    return null;
  let decoded;
  try {
    decoded = decodeURIComponent(target.pathname);
  } catch {
    return null;
  }
  if (/(^|\/)\.\.(\/|$)/.test(decoded)) return null;
  return `${target.pathname}${target.hash}`;
}

/**
 * The URL of the frame page of the site, `/reference/api/?path=<target>`,
 * for a link of the former embedded viewer,
 * `/reference/<architecture>/?path=<target>`, or for a link card. Returns
 * `null` when the target is missing or leaves the API directory.
 *
 * ApiRedirect.astro inlines the source of this function in the page, so it
 * must not use other functions of this module.
 */
export function getApiFrameHref(architecture, targetPath) {
  if (!targetPath) return null;
  const base = new URL(`https://api.invalid/api/${architecture}/`);
  let target;
  try {
    target = new URL(targetPath, base);
  } catch {
    return null;
  }
  if (
    target.origin !== base.origin ||
    !target.pathname.startsWith(base.pathname)
  )
    return null;
  let decoded;
  try {
    decoded = decodeURIComponent(target.pathname);
  } catch {
    return null;
  }
  if (/(^|\/)\.\.(\/|$)/.test(decoded)) return null;
  // The frame page of the site: /reference/api/ (keep in sync with the
  // FRAME_PAGE constant of scripts/api-shell/shell.js).
  const frame = new URL("https://api.invalid/reference/api/");
  frame.searchParams.set(
    "path",
    `${architecture}/${target.pathname.slice(base.pathname.length)}${target.hash}`,
  );
  return `${frame.pathname}?${frame.searchParams}`;
}

/** The URL of the frame page that shows the root crate page of an API. */
export function getApiFrameRootHref(architecture) {
  assertArchitecture(architecture);
  return getApiFrameHref(
    architecture,
    `${API_ROOT_CRATES[architecture]}/index.html`,
  );
}
