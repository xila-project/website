// Sidebar of the site, shared by astro.config.mjs and the page-icon check
// in scripts/page-icons.mjs (which must not import Astro).

const headerLink = { "data-header-link": "" };
const page = (label, link) => ({ label, link });
const group = (label, base, entries, collapsed = true) => ({
  label,
  collapsed,
  items: [
    page("Overview", `${base}/`),
    ...entries.map(([text, slug]) => page(text, `${base}/${slug}/`)),
  ],
});

const architecture = "/explanation/architecture";

const sidebar = [
  page("Documentation", "/documentation/"),
  {
    label: "Tutorials",
    items: [
      page("Overview", "/tutorials/"),
      page("Run Calculator in the browser", "/tutorials/browser/"),
      page("Run Xila natively", "/tutorials/native/"),
      page(
        "Build and package your first application",
        "/tutorials/first-application/",
      ),
    ],
  },
  {
    label: "How-to guides",
    items: [
      page("Overview", "/how-to/"),
      {
        label: "Run Xila",
        collapsed: true,
        items: [
          page("Install Xila on a board", "/how-to/install-on-a-board/"),
          page("Control GPIO pins", "/how-to/control-gpio-pins/"),
          page("Run Xila with Docker", "/how-to/run-xila-with-docker/"),
          page("Manage browser disks", "/how-to/manage-browser-disks/"),
        ],
      },
      {
        label: "Build applications",
        collapsed: true,
        items: [
          page("Build a guest application", "/how-to/build-guest/"),
          page("Run a guest application", "/how-to/run-guest/"),
          page("Add a launcher shortcut", "/how-to/add-shortcut/"),
          page("Package an application", "/how-to/package-application/"),
          page("Submit a package", "/how-to/submit-package/"),
        ],
      },
      {
        label: "Develop Xila",
        collapsed: true,
        items: [
          page(
            "Set up a development environment",
            "/how-to/setup-development/",
          ),
          page("Integrate Xila into a host", "/how-to/integrate-host/"),
          page("Contribute a Core change", "/how-to/contribute-core/"),
          page("Write or update documentation", "/how-to/write-documentation/"),
        ],
      },
    ],
  },
  {
    label: "Reference",
    items: [
      page("Overview", "/reference/"),
      page("Xila APIs", "/api/"),
      page("API reference", "/reference/api/"),
      {
        label: "Run Xila",
        collapsed: true,
        items: [
          page("Supported hardware", "/reference/supported-hardware/"),
          page("Shell commands", "/reference/shell/"),
          page("Headless Xila runtime", "/reference/headless-runtime/"),
        ],
      },
      {
        label: "Build applications",
        collapsed: true,
        items: [
          page("Guest API", "/reference/guest/"),
          page("Wasm runtime", "/reference/wasm-runtime/"),
          page("Graphics bindings", "/reference/graphics-bindings/"),
          page("Package format", "/reference/package-format/"),
        ],
      },
      {
        label: "Develop Xila",
        collapsed: true,
        items: [
          page("Host API", "/reference/host/"),
          page("Development commands", "/reference/development-commands/"),
        ],
      },
    ],
  },
  {
    label: "Explanation",
    items: [
      page("Overview", "/explanation/"),
      {
        label: "Architecture",
        collapsed: true,
        items: [
          page("Architecture overview", `${architecture}/`),
          page("Component map", `${architecture}/components/`),
          page("Guest applications", `${architecture}/guest-applications/`),
          page(
            "Development environments and targets",
            "/explanation/development-environments/",
          ),
        ],
      },
      group("Subsystems", `${architecture}/subsystems`, [
        ["Graphics", "graphics"],
        ["Log", "log"],
        ["Memory", "memory"],
        ["Network", "network"],
        ["Task", "task"],
        ["Time", "time"],
        ["Users", "users"],
        ["Virtual file system", "virtual_file_system"],
      ]),
      group("Libraries", `${architecture}/libraries`, [
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
        ["LittleFS", "little_fs"],
        ["Neural network", "neural_network"],
        ["HTTP", "http"],
        ["Peripherals", "peripherals"],
        ["Shared", "shared"],
        ["Synchronization", "synchronization"],
        ["Testing", "testing"],
        ["Verification", "verification"],
      ]),
      group("Drivers", `${architecture}/drivers`, [
        ["Shared", "shared"],
        ["Core", "core"],
        ["Espressif", "espressif"],
        ["Nordic", "nordic"],
        ["Native", "native"],
        ["Std", "std"],
        ["Headless", "headless"],
        ["Wasm", "wasm"],
      ]),
      group("Executables", `${architecture}/executables`, [
        ["Activity", "activity"],
        ["Graphics bindings", "bindings"],
        ["Calculator", "calculator"],
        ["Clock", "clock"],
        ["Command-line shell", "command_line_shell"],
        ["Debug", "debug"],
        ["Digits", "digits"],
        ["File manager", "file_manager"],
        ["Graphical shell", "graphical_shell"],
        ["Package", "package"],
        ["Pixel Painter", "pixel_painter"],
        ["Settings", "settings"],
        ["Synth", "synth"],
        ["Terminal", "terminal"],
        ["Text Editor", "text_editor"],
        ["Weather", "weather"],
        ["Wasm executable", "wasm"],
      ]),
      {
        label: "Topics",
        collapsed: true,
        items: [
          page("Browser storage", "/explanation/browser-storage/"),
          page("Package management", "/explanation/package-management/"),
        ],
      },
    ],
  },
  page("About Xila", "/about/"),
];

export { sidebar };
