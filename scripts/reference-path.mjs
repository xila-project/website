const REFERENCE_ARCHITECTURES = new Set(["host", "guest"]);

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

export function getReferenceViewerHref(architecture, targetPath) {
  assertArchitecture(architecture);
  return `/reference/${architecture}/?path=${encodeURIComponent(targetPath)}`;
}

export function getReferenceIframeSrc(architecture, targetPath) {
  assertArchitecture(architecture);
  return `https://documentation.xila.dev/${architecture}/${targetPath}`;
}
