import fs from "node:fs";
import path from "node:path";

import {
  getSourceHref,
  SOURCE_REPOSITORIES,
} from "../.vitepress/theme/utilities/source-reference.mjs";

export const SOURCE_REPOSITORY_NAMES = Object.freeze(
  Object.keys(SOURCE_REPOSITORIES),
);

export function sourceEnvironmentKey(repository) {
  return `XILA_${repository.toUpperCase()}_PATH`;
}

// Validate against the exact same repository registry and relative-path rules
// used when generating the published GitHub source links.
export function checkCodeReference(
  repository,
  sourcePath,
  { websiteRoot, environment = process.env },
) {
  try {
    getSourceHref(repository, sourcePath);
  } catch (error) {
    return { status: "error", message: error.message };
  }

  const key = sourceEnvironmentKey(repository);
  const configuredPath = environment[key];
  const checkout =
    configuredPath ?? path.resolve(websiteRoot, "..", repository);
  const marker = repository === "registry" ? "README.md" : "Cargo.toml";
  const strict = environment.XILA_STRICT_SOURCE_REFERENCES === "1";

  if (!fs.existsSync(path.join(checkout, marker))) {
    if (strict || configuredPath !== undefined) {
      return {
        status: "error",
        message: `Missing source checkout for repository ${repository}: ${checkout} (expected ${marker})`,
      };
    }
    return { status: "skipped" };
  }

  if (!fs.existsSync(path.join(checkout, sourcePath))) {
    return {
      status: "error",
      message: `missing ${repository} source ${sourcePath}`,
    };
  }

  return { status: "checked" };
}
