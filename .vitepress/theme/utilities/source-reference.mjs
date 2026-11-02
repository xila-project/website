export const SOURCE_REPOSITORIES = Object.freeze({
  core: "core",
  applications: "applications",
  platforms: "platforms",
  package_manager: "package_manager",
  registry: "registry",
});

const EXTERNAL_CRATE_ROOTS = Object.freeze({
  applications: {
    wasm: "executables/wasm",
    calculator: "executables/calculator",
    clock: "executables/clock",
    weather: "executables/weather",
    pixel_painter: "executables/pixel_painter",
    text_editor: "executables/text_editor",
    synth: "executables/synth",
    command_line_shell: "executables/shell/command_line",
    graphical_shell: "executables/shell/graphical",
    terminal: "executables/terminal",
    file_manager: "executables/file_manager",
    settings: "executables/settings",
    debug_application: "executables/debug",
    activity: "executables/activity",
    application_shortcuts: "libraries/application_shortcuts",
  },
  platforms: {
    drivers_espressif: "drivers/espressif",
    drivers_headless: "drivers/headless",
    drivers_native: "drivers/native",
    drivers_shared: "drivers/shared",
    drivers_std: "drivers/std",
    drivers_wasm: "drivers/wasm",
    testing: "libraries/testing",
  },
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

// Applications and Platforms do not currently publish Rustdoc at the Core
// documentation host. Link their actual source rather than a broken Rustdoc URL.
export function getExternalCrateHref(repository, crate) {
  const root = EXTERNAL_CRATE_ROOTS[repository]?.[crate];
  if (!root)
    throw new Error(`No source mapping for ${repository} crate ${crate}`);
  return getSourceHref(repository, root);
}
