export const SOURCE_REPOSITORIES = Object.freeze({
  core: "core",
  applications: "applications",
  platforms: "platforms",
  package_manager: "package_manager",
  registry: "registry",
});

export function getSourceHref(repository, path) {
  const name = SOURCE_REPOSITORIES[repository];
  if (!name) throw new Error(`Unknown Xila repository: ${repository}`);
  if (
    !path ||
    path.startsWith("/") ||
    path
      .split("/")
      .some((segment) => !segment || segment === "." || segment === "..")
  ) {
    throw new Error("Source path must be a non-empty relative repository path");
  }
  return `https://github.com/xila-project/${name}/tree/main/${path.split("/").map(encodeURIComponent).join("/")}`;
}
