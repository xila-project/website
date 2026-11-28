import { remarkApiLinks } from "./scripts/remark-api-links.mjs";
import { remarkD2Preamble } from "./scripts/remark-d2-preamble.mjs";
import { rehypeDiagramSvg } from "./scripts/rehype-diagram-svg.mjs";
import {
  getApiCustomSitemaps,
  xilaApiSitemap,
} from "./scripts/api-sitemap.mjs";
import { getPagefindOptions, xilaSearch } from "./scripts/search-index.mjs";
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import starlightThemeBlack from "starlight-theme-black";
import sitemap from "@astrojs/sitemap";
import astroD2 from "astro-d2";
import { sidebar } from "./scripts/sidebar.mjs";

const site = "https://www.xila.dev";

// Documentation pages that moved to another URL. Each old URL has a custom
// redirect page (src/pages/... rendering src/components/LegacyRedirect.astro)
// that keeps the URL fragment working. The redirect pages stay out of the
// sitemap.
const movedDocumentation = [
  "/how-to/run-nano-33-ble",
  "/how-to/flash-wt32-sc01",
  "/how-to/validate-core",
  "/how-to/run-container-guest",
  "/how-to/reset-browser-storage",
  "/reference/container-runtime",
  "/docs",
];

const headerLink = { "data-header-link": "" };

export default defineConfig({
  site,
  trailingSlash: "ignore",
  // The directories of the two APIs have no page of rustdoc: they lead to the
  // crate roots. Astro writes a page with a link for each of them.
  redirects: {
    "/api/host": "/api/host/xila/index.html",
    "/api/guest": "/api/guest/wasm/index.html",
  },
  markdown: {
    remarkPlugins: [remarkD2Preamble, remarkApiLinks],
    rehypePlugins: [rehypeDiagramSvg],
  },
  integrations: [
    // The sitemap index lists sitemap-api.xml, which xilaApiSitemap() writes
    // from the API index. It must come after sitemap().
    sitemap({
      customSitemaps: getApiCustomSitemaps(site),
      filter: (page) =>
        !movedDocumentation.includes(new URL(page).pathname.replace(/\/$/, "")),
    }),
    xilaApiSitemap(),
    // D2 renders the code fences with the language `d2` to inline SVG at
    // build time. D2.js runs D2 as WebAssembly, so the build needs no `d2`
    // binary. The fonts only serve the measurement of the labels.
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
          // The theme renders a flat list. On desktop, HeaderNav.astro
          // replaces it with its own header items. The mobile menu keeps this
          // list, and SiteTitle.astro marks the current item in it: the
          // data-header-link attribute selects the items to mark.
          navLinks: [
            {
              label: "Documentation",
              link: "/documentation/",
              attrs: headerLink,
            },
            { label: "Tutorials", link: "/tutorials/", attrs: headerLink },
            { label: "How-to guides", link: "/how-to/", attrs: headerLink },
            { label: "Reference", link: "/reference/", attrs: headerLink },
            { label: "Explanation", link: "/explanation/", attrs: headerLink },
            { label: "Packages", link: "/packages/", attrs: headerLink },
            {
              label: "Demonstration",
              link: "/demonstration/",
              attrs: headerLink,
            },
          ],
        }),
      ],
      customCss: [
        "./src/styles/xila.css",
        "./src/styles/page-icons.css",
        "./src/styles/diagrams.css",
      ],
      lastUpdated: true,
      // scripts/search-index.mjs writes the search index of the API items;
      // the search merges it with the index of the pages.
      pagefind: getPagefindOptions(),
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
        Header: "./src/components/Header.astro",
        LastUpdated: "./src/components/LastUpdated.astro",
        PageSidebar: "./src/components/PageSidebar.astro",
        PageTitle: "./src/components/PageTitle.astro",
        Search: "./src/components/Search.astro",
        Sidebar: "./src/components/Sidebar.astro",
        SiteTitle: "./src/components/SiteTitle.astro",
        // Local replacement for the theme's ThemeSelect override, which calls
        // the StarlightThemeProvider global that Starlight 0.43 removed.
        ThemeSelect: "./src/components/ThemeSelect.astro",
      },
    }),
    xilaSearch(),
  ],
});
