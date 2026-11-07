# Astro + Starlight migration design

## Intent

Move the Xila documentation website from VitePress to Astro with Starlight, retaining its published documentation and developer workflows while giving the site a monochrome Xila identity.

## Goals

- Preserve all existing Markdown content, meaningful URL paths, headings, and internal links.
- Recreate the current top navigation and documentation sidebar in Starlight.
- Port Mermaid rendering and the custom `HostReference`, `GuestReference`, `CodeReference`, and `DocsRsReference` components as Astro components, using MDX on pages that embed them.
- Preserve local full-text search, sitemap, favicon/fonts, analytics, edit links, GitHub Pages deployment, and source-reference validation.
- Replace purple theme accents with black, white, and neutral grays, including light/dark modes.
- Update package scripts, lockfile, README, validation output paths, and CI/deployment artifact paths to Astro conventions.

## Non-goals

- Rewriting technical documentation or changing Core behavior.
- Changing existing documentation URLs or introducing redirects.
- Redesigning the documentation taxonomy or changing its content/navigation labels.

## Approaches

1. **Astro + Starlight (selected):** adopt Starlight's docs shell and extend it with the existing navigation, components, and search. This fits the request and retains a maintained documentation framework; bespoke Vue/VitePress integrations need deliberate ports.
2. Astro with a custom docs shell: gives full visual control but recreates navigation, accessibility, and docs behaviors that Starlight provides.

The selected approach is Astro + Starlight, as confirmed by the user.

## Design

Use Astro's `src/content/docs` as the published Markdown collection, moving the existing `src` documentation tree into it while preserving path-derived URLs. Configure Starlight's title, description, sidebar, social links, edit links, sitemap, favicon, and custom CSS. Use a custom landing page only if Starlight's default landing page cannot preserve the existing home content and actions cleanly.

Replace the Vue reference components with Astro components and convert only pages that use those components to `.mdx` (currently 67 pages); keep other pages as `.md`. Preserve the existing routes. Keep shared pure source-reference path logic and its Node tests. Provide equivalent Mermaid code-block rendering. Use an Astro-compatible local search integration and retain existing link, anchor, metadata, and Core source-path checks against Astro's generated output. Use Lucide icons through its Astro package if icons are needed; add GSAP only if the design calls for animation.

Update GitHub Actions to upload Astro's generated `dist/` output and update README instructions. Keep the existing Apache license and analytics configuration. Apply a monochrome palette through Starlight design tokens and verify both color schemes.

## Constraints and validation

The current CI runs `npm run check`, validates generated HTML links and anchors, and checks source references against five CI checkouts. Preserve these guarantees and those checkouts. Final validation will format changed files, run the repository check suite and `git diff --check`, inspect the complete diff, and confirm the deployed artifact path. If Core/reference checkouts are unavailable locally, report that limitation explicitly.

## Builder decisions

Choose maintained Astro-compatible integrations and components; remove Vue and VitePress dependencies. Keep route generation and source validation deterministic. Use animation only where it improves the experience.
