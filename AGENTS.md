# Xila website agent guide

This repository publishes the English-language Xila website and developer documentation with Astro and Starlight. The operating-system implementation lives in the separate `Xila-Project/core` repository. Treat this repository as documentation/site tooling unless the task explicitly asks for a Core change.

## Instruction scope

This root `AGENTS.md` applies to the entire repository. If a more specific `AGENTS.md` or `AGENTS.override.md` is added in a subdirectory later, follow the more specific instructions for files in that subtree.

`AGENTS.md` is the canonical agent instruction file. Compatibility aliases such as `CLAUDE.md` and `GEMINI.md` should point to this file rather than duplicate its contents. Edit `AGENTS.md`, not an alias.

## Repository map

| Path                     | Purpose                                                                    |
| ------------------------ | -------------------------------------------------------------------------- |
| `src/content/docs/`      | Documentation collection                                                   |
| `src/tutorials/`         | Guided first experiences                                                   |
| `src/how-to/`            | Task-focused procedures                                                    |
| `src/reference/`         | Exact commands, options, limits, capabilities, and API/source references   |
| `src/explanation/`       | Concepts, architecture, rationale, trade-offs, and component relationships |
| `src/about/`             | Project information                                                        |
| `public/`                | Static assets published by Astro                                           |
| `docs/templates/`        | Local authoring templates; never published directly                        |
| `src/content/docs/`      | Starlight Markdown and MDX documentation collection                        |
| `astro.config.mjs`       | Astro and Starlight configuration                                          |
| `scripts/check-docs.mjs` | Documentation metadata, link, anchor, and Core source-path validation      |
| `.github/workflows/`     | Pull-request checks and GitHub Pages deployment                            |
| `package.json`           | Local development, formatting, build, preview, and validation commands     |

Before editing, inspect the target page, its section landing page, nearby related pages, and `astro.config.mjs` when navigation may be affected.

## Sources of truth

Use the strongest available source for each claim:

1. **Core behavior:** verify against `Xila-Project/core` source, manifests, examples, and CI at a known revision. A sibling checkout at `../core` is preferred when available; `scripts/check-docs.mjs` also honors `XILA_CORE_PATH`.
2. **Website behavior:** verify against this repository's `package.json`, `astro.config.mjs`, components, scripts, and workflows.
3. **Existing documentation:** use as supporting context, not as the sole proof for technical behavior that may have changed.

Do not invent commands, flags, supported targets, resource limits, API names, file paths, error messages, or runtime behavior. Preserve identifiers, path casing, feature names, and literal error spellings exactly.

Inspect Core read-only unless the user explicitly asks for a Core change. Do not silently turn a website/documentation task into a cross-repository implementation task.

## Documentation model

Use Diátaxis to classify each substantive page by the reader's need:

| Type        | Reader need                             | Location           | Expected content                                                                         |
| ----------- | --------------------------------------- | ------------------ | ---------------------------------------------------------------------------------------- |
| Tutorial    | Learn through a guided first experience | `src/tutorials/`   | One reproducible path, prerequisites, actions, observable results, and next steps        |
| How-to      | Complete a specific task                | `src/how-to/`      | Focused steps, requirements, completion checks, and relevant recovery actions            |
| Reference   | Look up an exact fact                   | `src/reference/`   | Commands, options, defaults, features, errors, constraints, limits, and API/source links |
| Explanation | Understand a concept or design          | `src/explanation/` | Context, relationships, rationale, trade-offs, architecture, and boundaries              |

Use the locally authored templates in `docs/templates/` when creating pages. Read `docs/templates/README.md`, copy the appropriate template, remove unused sections, and replace every placeholder before publishing.

Keep one primary reader need per substantive page. Split mixed content when reader needs differ and connect the pages with links instead of duplicating procedures or authoritative reference tables.

## Authoring rules

- Write published documentation in English.
- Start with the page goal and intended reader; use concrete titles and action-oriented titles for task pages.
- State prerequisites before procedures, including operating system, target, toolchain, device/browser requirements, credentials, and existing artifacts when relevant.
- State the working directory and execution context before commands. Distinguish host-shell commands, browser-console commands, Devbox/Core commands, and commands run inside Xila.
- Add observable results for important tutorial steps and completion checks for how-to guides.
- Use reference pages for exhaustive facts and explanation pages for design reasoning.
- Prefer plain language, active voice, short paragraphs, and consistent terminology.
- Use tables for lookup/comparison and Mermaid diagrams when they clarify relationships.
- Keep technical headings, navigation labels, reference text, and documentation-link labels free of decorative emojis. Sparse, consistent emojis are acceptable on overview/marketing surfaces.
- Put warnings next to the action that requires them, especially destructive storage operations. Do not add speculative warnings.
- Avoid unnecessary troubleshooting sections; include them only when there is a concrete recovery path.
- Do not claim a command, browser flow, hardware target, or runtime path was verified unless it actually ran successfully.

### Frontmatter

Substantive pages under `src/tutorials/`, `src/how-to/`, `src/reference/`, and `src/explanation/` must use the matching `docType` value and a non-empty `description`. Section/index pages may omit `docType`.

Put the page heading in the `title` frontmatter field; Starlight renders it as the page `<h1>`, so do not repeat it as a `#` heading in the body. Use `template: splash` only for pages that intentionally drop the sidebar, such as the home page or an API/reference viewer.

### Navigation and links

When adding, moving, or removing documentation:

- update the appropriate section/index page;
- add the page to the explicit `sidebar` in `astro.config.mjs` when it should appear in site navigation;
- update relevant related links and incoming links;
- update the architecture component map when the page changes component discovery;
- preserve meaningful anchors and query parameters when changing API/reference links.

The site is pre-production. Move pages directly and update links instead of adding redirects unless URL compatibility is explicitly requested.

Use `HostReference`, `GuestReference`, and `CodeReference` for generated API/source links. Verify referenced crates and source paths exist before adding them.

## Technical boundaries worth preserving

Keep these distinctions explicit in documentation:

- `wasm32-wasip1` guest applications versus `wasm32-unknown-unknown` browser code;
- host/native validation versus browser behavior versus embedded-hardware validation;
- website Node/npm commands versus Core Rust/Devbox commands;
- supported behavior versus planned or experimental behavior.

When resource use matters, document relevant RAM, flash, stack, retained buffers, persistence durability, browser restrictions, and supported graphics/WASI subsets. Do not generalize native results to embedded targets without evidence.

## Development commands

Use a current Node.js LTS release and npm, matching CI.

```sh
npm ci
npm run docs:dev
npm run docs:build
npm run docs:preview
```

Prefer formatting only the files you changed:

```sh
npx prettier --write path/to/file.md
```

Use `npm run format:fix` only when intentionally formatting the whole repository.

## Required validation

Before completing a documentation or site change:

1. Format changed files with Prettier.
2. Run `npm run check`.
3. Run `git diff --check`.
4. Review the final diff for lost facts, unresolved placeholders, accidental broad formatting, and unrelated changes.
5. Check the affected navigation and reader journey when pages or links changed.

`npm run check` runs formatting validation, an Astro production build with Starlight search generation, and `scripts/check-docs.mjs`.

The documentation validator checks:

- required `docType` values by Diátaxis directory;
- non-empty `description` frontmatter on substantive pages;
- rendered internal links;
- rendered anchors;
- `CodeReference` source paths when a Core checkout is available at `XILA_CORE_PATH` or `../core`.

If Core is unavailable, the validator explicitly skips Core source-path checks. Report that limitation rather than implying those references were verified.

Pull-request CI is the source of truth for repository validation: it uses Node LTS, runs `npm ci`, then runs `npm run check`. GitHub Pages deployment performs the same documentation check before publishing.

Run Core/runtime/browser/hardware checks only when relevant to the task. Report exactly which checks ran, which passed, and which could not run.

## Change discipline

- Make the smallest focused change that fully addresses the request.
- Do not add dependencies when existing Astro, Starlight, MDX, Node, or repository utilities are sufficient.
- Keep build output, caches, generated search indexes, scratch files, and downloaded binaries out of commits.
- Do not rewrite unrelated pages or normalize unrelated formatting while touching a focused area.
- Preserve technical facts when reorganizing documentation; move or link them instead of dropping them.
- Keep one authoritative location for reference tables and exact defaults.
- Follow the repository's existing commit style, using focused subjects such as `docs: ...`, `ci: ...`, or `chore: ...` as appropriate.

## Agent workflow

For an agentic change in this repository:

1. Read this file and the relevant repository files before proposing edits.
2. Inspect the implementation/source of truth for every material technical claim.
3. Keep the plan proportional to the task; do not create extra architecture or tooling without evidence it is needed.
4. Edit the smallest coherent set of files.
5. Run the narrowest useful checks during iteration, then the required final validation above.
6. Never state that validation passed unless the command or CI run actually succeeded.
7. Summarize changed files, important decisions, validation performed, and any remaining limitations in the final result.
