import { remarkMermaid } from "./scripts/remark-mermaid.mjs";
import { remarkD2Preamble } from "./scripts/remark-d2-preamble.mjs";
import { remarkLikeC4 } from "./scripts/remark-likec4.mjs";
import { remarkMermaidStatic } from "./scripts/remark-mermaid-static.mjs";
import { rehypeDiagramSvg } from "./scripts/rehype-diagram-svg.mjs";
import { rehypeMermaidStatic } from "./scripts/rehype-mermaid-static.mjs";
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import starlightThemeBlack from "starlight-theme-black";
import sitemap from "@astrojs/sitemap";
import astroD2 from "astro-d2";
import { pathToFileURL } from "node:url";

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
      page("Run Xila on the Nano 33 BLE", "/how-to/run-nano-33-ble/"),
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
            ["Neural network", "neural_network"],
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
            ["Headless", "headless"],
            ["Native", "native"],
            ["Nordic", "nordic"],
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
  markdown: {
    remarkPlugins: [
      remarkMermaid,
      remarkMermaidStatic,
      remarkD2Preamble,
      remarkLikeC4,
    ],
    rehypePlugins: [
      [
        rehypeMermaidStatic,
        {
          strategy: "inline-svg",
          // The headless browser loads the site font, so that Mermaid
          // measures the labels with Montserrat.
          css: pathToFileURL("public/fonts/montserrat.css"),
          mermaidConfig: {
            theme: "base",
            fontFamily: "Montserrat, Arial, Helvetica, sans-serif",
            securityLevel: "strict",
            // Mermaid C4 diagrams measure their text with their own fonts.
            c4: {
              c4ShapeMargin: 40,
              personFontFamily: "Montserrat",
              external_personFontFamily: "Montserrat",
              systemFontFamily: "Montserrat",
              external_systemFontFamily: "Montserrat",
              system_dbFontFamily: "Montserrat",
              external_system_dbFontFamily: "Montserrat",
              system_queueFontFamily: "Montserrat",
              external_system_queueFontFamily: "Montserrat",
              containerFontFamily: "Montserrat",
              external_containerFontFamily: "Montserrat",
              container_dbFontFamily: "Montserrat",
              external_container_dbFontFamily: "Montserrat",
              container_queueFontFamily: "Montserrat",
              external_container_queueFontFamily: "Montserrat",
              componentFontFamily: "Montserrat",
              external_componentFontFamily: "Montserrat",
              component_dbFontFamily: "Montserrat",
              external_component_dbFontFamily: "Montserrat",
              component_queueFontFamily: "Montserrat",
              external_component_queueFontFamily: "Montserrat",
              boundaryFontFamily: "Montserrat",
              messageFontFamily: "Montserrat",
              messageFontSize: 12,
            },
            flowchart: {
              curve: "linear",
              padding: 12,
              subGraphTitleMargin: { top: 6, bottom: 14 },
            },
            themeVariables: {
              fontSize: "14px",
              primaryColor: "#ffffff",
              primaryTextColor: "#0a0a0a",
              primaryBorderColor: "#0a0a0a",
              lineColor: "#0a0a0a",
              secondaryColor: "#ffffff",
              tertiaryColor: "#ffffff",
              clusterBkg: "#ffffff",
              clusterBorder: "#0a0a0a",
              edgeLabelBackground: "#ffffff",
            },
          },
        },
      ],
      rehypeDiagramSvg,
    ],
  },
  integrations: [
    sitemap({ filter: (page) => !page.endsWith("/diagram-trial/") }),
    // Diagram trial: D2 renders the code fences with the language `d2` to
    // inline SVG at build time. D2.js runs D2 as WebAssembly, so the build
    // needs no `d2` binary. The fonts only serve the measurement of labels.
    astroD2({
      inline: true,
      layout: "elk",
      pad: 8,
      theme: { default: "0", dark: false },
      experimental: { useD2js: true },
      fonts: {
        regular: "src/diagrams/fonts/Montserrat-regular.ttf",
        italic: "src/diagrams/fonts/Montserrat-italic.ttf",
        bold: "src/diagrams/fonts/Montserrat-bold.ttf",
        semibold: "src/diagrams/fonts/Montserrat-semibold.ttf",
      },
    }),
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
          // The theme renders a flat list. On desktop, SiteTitle.astro
          // replaces it with its own header items. The mobile menu keeps this
          // list, and SiteTitle.astro marks the current item in it: the
          // data-header-link attribute selects the items to mark.
          navLinks: [
            { label: "Documentation", link: "/docs/", attrs: headerLink },
            { label: "Tutorials", link: "/tutorials/", attrs: headerLink },
            { label: "How-to", link: "/how-to/", attrs: headerLink },
            { label: "Reference", link: "/reference/", attrs: headerLink },
            { label: "Explanation", link: "/explanation/", attrs: headerLink },
            { label: "Packages", link: "/packages/", attrs: headerLink },
            { label: "Demonstration", link: "https://platforms.xila.dev/" },
          ],
        }),
      ],
      customCss: [
        "./src/styles/xila.css",
        "./src/styles/page-icons.css",
        "./src/styles/diagrams.css",
      ],
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
        Search: "./src/components/Search.astro",
        Sidebar: "./src/components/Sidebar.astro",
        SiteTitle: "./src/components/SiteTitle.astro",
      },
    }),
  ],
});
