import { remarkMermaid } from "./scripts/remark-mermaid.mjs";
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import starlightThemeBlack from "starlight-theme-black";
import sitemap from "@astrojs/sitemap";

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
  page("Documentation", "/docs/"),
  {
    label: "Tutorials",
    items: [
      page("Overview", "/tutorials/"),
      page("Run Xila natively", "/tutorials/native/"),
      page("Run Calculator in the browser", "/tutorials/browser/"),
    ],
  },
  {
    label: "How-to guides",
    items: [
      page("Overview", "/how-to/"),
      page("Set up development", "/how-to/setup-development/"),
      page("Integrate a host application", "/how-to/integrate-host/"),
      page("Build a guest", "/how-to/build-guest/"),
      page("Add a launcher shortcut", "/how-to/add-shortcut/"),
      page("Run a guest", "/how-to/run-guest/"),
      page("Create a development package", "/how-to/package-application/"),
      page("Submit a package", "/how-to/submit-package/"),
      page("Run Xila with Docker", "/how-to/run-container-guest/"),
      page("Validate Xila changes", "/how-to/validate-core/"),
      page("Contribute to Core", "/how-to/contribute-core/"),
      page("Manage browser disks", "/how-to/reset-browser-storage/"),
      page("Write documentation", "/how-to/write-documentation/"),
    ],
  },
  {
    label: "Reference",
    items: [
      page("Overview", "/reference/"),
      page("Host API", "/reference/host/"),
      page("Guest API", "/reference/guest/"),
      page("Shell", "/reference/shell/"),
      page("Experimental package format", "/reference/package-format/"),
      page("Development commands", "/reference/development-commands/"),
      page("WASM runtime", "/reference/wasm-runtime/"),
      page("Headless container runtime", "/reference/container-runtime/"),
      page("Graphics bindings", "/reference/graphics-bindings/"),
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
          page("Overview", `${architecture}/`),
          page("Component map", `${architecture}/components/`),
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
            ["Little FS", "little_fs"],
            ["HTTP", "http"],
            ["Peripherals", "peripherals"],
            ["Shared", "shared"],
            ["Synchronization", "synchronization"],
            ["Testing", "testing"],
            ["Verification", "verification"],
          ]),
          group("Drivers", `${architecture}/drivers`, [
            ["Core", "core"],
            ["Espressif", "espressif"],
            ["Native", "native"],
            ["Shared", "shared"],
            ["Std", "std"],
            ["WASM", "wasm"],
          ]),
          group("Executables", `${architecture}/executables`, [
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
          ]),
        ],
      },
      page(
        "Development environments",
        "/explanation/development-environments/",
      ),
      page("Browser storage", "/explanation/browser-storage/"),
      page(
        "Package management architecture",
        "/explanation/package-management/",
      ),
    ],
  },
  page("About Xila", "/about/"),
];

export default defineConfig({
  site: "https://www.xila.dev",
  trailingSlash: "ignore",
  markdown: { remarkPlugins: [remarkMermaid] },
  integrations: [
    sitemap(),
    starlight({
      title: "Xila",
      description: "An open-source operating system for embedded world",
      favicon: "/images/favicon.svg",
      logo: {
        light: "./public/images/logo_light.svg",
        dark: "./public/images/logo_dark.svg",
      },
      plugins: [
        starlightThemeBlack({
          // Honour `collapsed` on sidebar groups; without it every nested
          // Architecture group is always expanded.
          sidebar: { useDropdowns: true },
          navLinks: [
            { label: "Tutorials", link: "/tutorials/" },
            { label: "How-to", link: "/how-to/" },
            { label: "Reference", link: "/reference/" },
            { label: "Explanation", link: "/explanation/" },
            { label: "Demonstration", link: "https://platforms.xila.dev/" },
          ],
        }),
      ],
      customCss: ["./src/styles/xila.css", "./src/styles/page-icons.css"],
      lastUpdated: true,
      // Plain code frames: shell blocks get no terminal title bar.
      expressiveCode: { defaultProps: { frame: "code" } },
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/xila-project",
        },
        {
          icon: "matrix",
          label: "Matrix",
          href: "https://matrix.to/#/#xila:anneraud.fr",
        },
      ],
      editLink: {
        baseUrl: "https://github.com/xila-project/website/edit/main/",
      },
      sidebar,
      head: [
        {
          tag: "link",
          attrs: { rel: "stylesheet", href: "/fonts/montserrat.css" },
        },
        {
          tag: "script",
          attrs: {
            defer: true,
            src: "https://s.anneraud.fr/script.js",
            "data-website-id": "6fc0fbb0-ef68-4fd0-bf13-6a48ef2b68e6",
          },
        },
      ],
      components: {
        Banner: "./src/components/Banner.astro",
        EditLink: "./src/components/EditLink.astro",
        Hero: "./src/components/Hero.astro",
        Footer: "./src/components/Footer.astro",
        LastUpdated: "./src/components/LastUpdated.astro",
        PageSidebar: "./src/components/PageSidebar.astro",
        PageTitle: "./src/components/PageTitle.astro",
        Sidebar: "./src/components/Sidebar.astro",
        SiteTitle: "./src/components/SiteTitle.astro",
      },
    }),
  ],
});
