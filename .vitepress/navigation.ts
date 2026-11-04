import type { DefaultTheme } from "vitepress";

const componentGroups: DefaultTheme.SidebarItem[] = [
  {
    text: "Subsystems",
    link: "/explanation/architecture/subsystems/",
    collapsed: true,
    items: [
      ["Graphics", "graphics"],
      ["Log", "log"],
      ["Memory", "memory"],
      ["Network", "network"],
      ["Task", "task"],
      ["Time", "time"],
      ["Users", "users"],
      ["Virtual file system", "virtual_file_system"],
    ].map(([text, page]) => ({
      text,
      link: `/explanation/architecture/subsystems/${page}`,
    })),
  },
  {
    text: "Libraries",
    link: "/explanation/architecture/libraries/",
    collapsed: true,
    items: [
      ["ABI", "abi"],
      ["Audio", "audio"],
      ["Authentication", "authentication"],
      ["Bootsplash", "bootsplash"],
      ["Device", "device"],
      ["Debug protocol", "debug_protocol"],
      ["Executable", "executable"],
      ["Firmware update", "firmware_update"],
      ["File system", "file_system"],
      ["Internationalization", "internationalization"],
      ["Little FS", "little_fs"],
      ["HTTP", "http"],
      ["Peripherals", "peripherals"],
      ["Shared", "shared"],
      ["Synchronization", "synchronization"],
      ["Testing", "testing"],
      ["Verification", "verification"],
    ].map(([text, page]) => ({
      text,
      link: `/explanation/architecture/libraries/${page}`,
    })),
  },
  {
    text: "Drivers",
    link: "/explanation/architecture/drivers/",
    collapsed: true,
    items: [
      ["Core", "core"],
      ["Espressif", "espressif"],
      ["Native", "native"],
      ["Shared", "shared"],
      ["Std", "std"],
      ["WASM", "wasm"],
    ].map(([text, page]) => ({
      text,
      link: `/explanation/architecture/drivers/${page}`,
    })),
  },
  {
    text: "Executables",
    link: "/explanation/architecture/executables/",
    collapsed: true,
    items: [
      ["Activity", "activity"],
      ["WASM guest bindings", "bindings"],
      ["Calculator", "calculator"],
      ["Clock", "clock"],
      ["Command line shell", "command_line_shell"],
      ["Debug", "debug"],
      ["File manager", "file_manager"],
      ["Graphical shell", "graphical_shell"],
      ["Pixel Painter", "pixel_painter"],
      ["Settings", "settings"],
      ["Synth", "synth"],
      ["Terminal", "terminal"],
      ["Text Editor", "text_editor"],
      ["Weather", "weather"],
      ["WASM", "wasm"],
    ].map(([text, page]) => ({
      text,
      link: `/explanation/architecture/executables/${page}`,
    })),
  },
];

export const nav: DefaultTheme.NavItem[] = [
  { text: "Tutorials", link: "/tutorials/" },
  { text: "How-to", link: "/how-to/" },
  { text: "Reference", link: "/reference/" },
  { text: "Explanation", link: "/explanation/" },
  {
    text: "Demonstration",
    link: "https://platforms.xila.dev/",
  },
];

const documentationSidebar: DefaultTheme.SidebarItem[] = [
  { text: "Documentation", link: "/docs/" },
  {
    text: "Tutorials",
    link: "/tutorials/",
    items: [
      { text: "Run Xila natively", link: "/tutorials/native" },
      { text: "Run Calculator in the browser", link: "/tutorials/browser" },
    ],
  },
  {
    text: "How-to guides",
    link: "/how-to/",
    items: [
      { text: "Set up development", link: "/how-to/setup-development" },
      { text: "Integrate a host application", link: "/how-to/integrate-host" },
      { text: "Build a guest", link: "/how-to/build-guest" },
      { text: "Add a launcher shortcut", link: "/how-to/add-shortcut" },
      { text: "Run a guest", link: "/how-to/run-guest" },
      {
        text: "Create a development package",
        link: "/how-to/package-application",
      },
      { text: "Submit a package declaration", link: "/how-to/submit-package" },
      {
        text: "Run Xila with Docker",
        link: "/how-to/run-container-guest",
      },
      { text: "Validate Xila changes", link: "/how-to/validate-core" },
      { text: "Contribute to Core", link: "/how-to/contribute-core" },
      { text: "Manage browser disks", link: "/how-to/reset-browser-storage" },
      { text: "Write documentation", link: "/how-to/write-documentation" },
    ],
  },
  {
    text: "Reference",
    link: "/reference/",
    items: [
      { text: "Host API", link: "/reference/host" },
      { text: "Guest API", link: "/reference/guest" },
      { text: "Shell", link: "/reference/shell" },
      {
        text: "Experimental package format",
        link: "/reference/package-format",
      },
      { text: "Development commands", link: "/reference/development-commands" },
      { text: "WASM runtime", link: "/reference/wasm-runtime" },
      {
        text: "Headless container runtime",
        link: "/reference/container-runtime",
      },
      { text: "Graphics bindings", link: "/reference/graphics-bindings" },
    ],
  },
  {
    text: "Explanation",
    link: "/explanation/",
    items: [
      {
        text: "Architecture",
        link: "/explanation/architecture/",
        collapsed: true,
        items: [
          {
            text: "Component map",
            link: "/explanation/architecture/components",
          },
          ...componentGroups,
        ],
      },
      {
        text: "Development environments",
        link: "/explanation/development-environments",
      },
      { text: "Browser storage", link: "/explanation/browser-storage" },
      {
        text: "Package management architecture",
        link: "/explanation/package-management",
      },
    ],
  },
  { text: "About Xila", link: "/about/" },
];

export const sidebar: DefaultTheme.Sidebar = Object.fromEntries(
  [
    "/docs/",
    "/tutorials/",
    "/how-to/",
    "/reference/",
    "/explanation/",
    "/about/",
  ].map((prefix) => [prefix, documentationSidebar]),
);
