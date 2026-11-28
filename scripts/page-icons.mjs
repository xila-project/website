// Icon map of the sidebar pages, shared by scripts/generate-page-icons.mjs
// (which renders src/styles/page-icons.css) and the page-icon check in
// tests/page-icons.test.mjs. Keys are page hrefs: pages in `links`, and the
// overview pages of the collapsible sidebar groups in `groups`. Section
// overviews (Tutorials, How-to guides...) have no icon.
import { sidebar } from "./sidebar.mjs";

export const links = {
  "/documentation/": "open-book",
  "/about/": "information",

  "/tutorials/native/": "desktop",
  "/tutorials/browser/": "window",
  "/tutorials/first-application/": "rocket",

  "/how-to/install-on-a-board/": "seti:platformio",
  "/how-to/control-gpio-pins/": "seti:config",
  "/how-to/setup-development/": "setting",
  "/how-to/integrate-host/": "puzzle",
  "/how-to/build-guest/": "seti:wasm",
  "/how-to/add-shortcut/": "star",
  "/how-to/run-guest/": "rocket",
  "/how-to/package-application/": "seti:zip",
  "/how-to/submit-package/": "seti:json",
  "/how-to/run-xila-with-docker/": "seti:docker",
  "/how-to/contribute-core/": "seti:git",
  "/how-to/manage-browser-disks/": "database",
  "/how-to/write-documentation/": "pencil",

  "/api/": "open-book",
  "/reference/api/": "code-branch",
  "/reference/supported-hardware/": "list-format",
  "/reference/host/": "seti:rust",
  "/reference/guest/": "seti:wasm",
  "/reference/shell/": "seti:shell",
  "/reference/package-format/": "document",
  "/reference/development-commands/": "seti:powershell",
  "/reference/wasm-runtime/": "server",
  "/reference/headless-runtime/": "seti:docker",
  "/reference/graphics-bindings/": "seti:image",

  "/explanation/architecture/components/": "magnifier",
  "/explanation/architecture/guest-applications/": "seti:wasm",
  "/explanation/development-environments/": "laptop",
  "/explanation/browser-storage/": "database",
  "/explanation/package-management/": "seti:zip",
};

export const groups = {
  "/explanation/architecture/": "puzzle",
  "/explanation/architecture/subsystems/": "setting",
  "/explanation/architecture/libraries/": "open-book",
  "/explanation/architecture/drivers/": "laptop",
  "/explanation/architecture/executables/": "rocket",
};

export const pages = { ...links, ...groups };

// Sidebar pages that have no icon on purpose: the overview of each
// documentation section, and the pages inside the collapsible architecture
// groups (subsystems, libraries, drivers, executables).
const sectionOverviews = new Set([
  "/tutorials/",
  "/how-to/",
  "/reference/",
  "/explanation/",
]);
const collapsibleGroupBases = [
  "/explanation/architecture/subsystems/",
  "/explanation/architecture/libraries/",
  "/explanation/architecture/drivers/",
  "/explanation/architecture/executables/",
];

export function sidebarLinks(items = sidebar) {
  return items.flatMap((entry) =>
    entry.items ? sidebarLinks(entry.items) : [entry.link],
  );
}

export function missingPageIcons(items = sidebar, iconMap = pages) {
  return sidebarLinks(items).filter(
    (href) =>
      !sectionOverviews.has(href) &&
      !collapsibleGroupBases.some((base) => href.startsWith(base)) &&
      !(href in iconMap),
  );
}

export function pageIconErrors(items = sidebar, iconMap = pages) {
  return missingPageIcons(items, iconMap).map(
    (href) =>
      `${href}: no icon; add an entry to the links map in scripts/page-icons.mjs, then run node scripts/generate-page-icons.mjs`,
  );
}
