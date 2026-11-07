# Astro + Starlight Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Migrate Xila's documentation site from VitePress to Astro + Starlight while preserving routes, docs behavior, CI checks, and applying a monochrome visual identity.

**Architecture:** Starlight owns the documentation shell and content collection. Astro components replace Vue reference components; only pages embedding these components become MDX. The existing source-reference path utility and documentation validator remain deterministic and are adapted to Astro output.

**Tech Stack:** Astro, Starlight, MDX, Astro components, Lucide Astro icons if needed, Mermaid integration, Prettier, Node tests.

**Spec:** `docs/superpowers/specs/2026-11-07-astro-starlight-migration-design.md`

## Global Constraints

- Preserve all existing Markdown content, meaningful URL paths, headings, and internal links.
- Convert only component-using pages to `.mdx` (currently 69 pages); other pages remain `.md`.
- Remove Vue and VitePress dependencies.
- Keep black, white, and neutral grays in light and dark modes.
- Preserve local full-text search, sitemap, favicon/fonts, analytics, edit links, GitHub Pages deployment, and source-reference validation.
- Preserve current CI source checkouts and link/anchor/metadata checks.

## Review Focus

- Route preservation for nested pages, index pages, and the home page - add build assertions for representative output paths.
- MDX parsing of custom reference tags inside paragraphs/lists and tags with children - cover inline and standalone component output.
- Astro HTML output link/anchor shape in the validator - exercise routes, query strings, and encoded anchors.
- Missing optional source checkouts versus strict CI checkout mode - retain both skip and strict failure behavior.
- GitHub Pages artifact path and site base URL - build and confirm links resolve under deployment configuration.

---

### Task 1: Astro + Starlight foundation

**Files:** `package.json`, `package-lock.json`, `astro.config.mjs`, `.gitignore`, `src/content/docs/` (content tree), `.github/workflows/deploy.yml`, `README.md`

- [x] Install Astro, Starlight and required Mermaid/search integrations; remove VitePress, Vue, and VitePress-only plugins.
- [x] Configure Starlight with title, description, sitemap, sidebar/navigation, social/edit links, favicon, analytics, fonts, monochrome CSS and supported search.
- [x] Move documentation into `src/content/docs`, retaining URL slugs; preserve the current landing page experience in an Astro-compatible form.
- [x] Update npm scripts and README commands to Astro conventions; update ignore rules and Pages artifact upload to `dist/`.
- [x] Build and assert representative old routes and home page render.

### Task 2: Astro reference components and MDX

**Files:** `.vitepress/theme/components/*` (replace with Astro components under `src/components/`), `.vitepress/theme/utilities/reference-path.mjs`, `src/content/docs/**/*.md` (convert component-using pages to `.mdx`), `src/content/docs/reference/host.mdx` and `src/components/ReferenceViewer.astro`

- [x] Implement Astro equivalents for `CodeReference`, `HostReference`, `GuestReference`, and `DocsRsReference`, retaining arguments, generated URLs, and child-label behavior.
- [x] Convert only pages containing those component tags to MDX; preserve prose, frontmatter, headings, and links.
- [x] Port reference viewer pages and query-parameter iframe behavior; keep the shared path utility and adapt imports.
- [x] Render Mermaid diagrams through an Astro-compatible integration.
- [x] Build representative inline/list/child component cases and verify generated link labels and destinations.

### Task 3: Documentation validation on Astro output

**Files:** `scripts/check-docs.mjs`, `scripts/source-checkouts.mjs`, `tests/*.test.mjs`, `package.json`

- [x] Point metadata scanning to `src/content/docs` and rendered output scanning to `dist/`.
- [x] Preserve `docType`, description, internal-link, anchor, source-path, optional-checkout, and strict-mode checks.
- [x] Add or adapt tests for generated HTML links/anchors, MDX component output, and Astro output paths.
- [x] Keep `npm run check` as the aggregate validation command.

### Task 4: CI, deployment, and final visual validation

**Files:** `.github/workflows/check.yml`, `.github/workflows/deploy.yml`, `README.md`, Astro config/theme files

- [x] Update CI build/deployment paths and commands while retaining all source checkout setup and strict reference environment variables.
- [x] Format changed files, run `npm run check`, and run `git diff --check`.
- [x] Inspect light/dark palette, navigation journey, home page, representative docs and reference viewers in a built preview if browser access is available.
- [x] Review the final diff for lost facts, broken links/routes, stale VitePress references, unused assets/dependencies, and unrelated changes.
