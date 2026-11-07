# Xila documentation - Rust, embedded systems, and WebAssembly

Learn to run Xila, build a WebAssembly application, and explore the architecture
of an open-source embedded operating system written in Rust. This repository
publishes **[xila.dev](https://www.xila.dev/)**, the official Xila website and
developer documentation.

[Read the documentation](https://www.xila.dev/docs/) ·
[Explore Core](https://github.com/xila-project/core) ·
[Join the community](https://matrix.to/#/#xila:anneraud.fr)

## Find your starting point

| Your goal                                  | Start here                                                                                                                                      |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Run Xila for the first time                | [Native tutorial](https://www.xila.dev/tutorials/native) or [browser tutorial](https://www.xila.dev/tutorials/browser).                         |
| Build a Wasm application                   | [Guest application guide](https://www.xila.dev/how-to/build-guest).                                                                             |
| Understand the OS                          | [Architecture and design](https://www.xila.dev/explanation/) and the [component map](https://www.xila.dev/explanation/architecture/components). |
| Look up commands, capabilities, or APIs    | [Reference](https://www.xila.dev/reference/).                                                                                                   |
| Improve a guide or fix a documentation gap | [Documentation contribution guide](src/how-to/write-documentation.md).                                                                          |

Xila's Rust implementation lives in **[xila-project/core](https://github.com/xila-project/core)**.
The Node.js commands below build the documentation website; use the
[Core contributor guide](https://www.xila.dev/how-to/contribute-core) to work on
the operating system.

## Documentation stack

- Built with [Astro + Starlight](https://starlight.astro.build/) and the [Starlight Black](https://github.com/adrian-ub/starlight-theme-black) theme, adapted to Xila's black-and-white identity
- Reader-focused documentation organized with [Diátaxis](https://diataxis.fr/)
- Local authoring templates informed by [The Good Docs Project](https://github.com/thegooddocsproject/templates)
- Integrated with [Mermaid](https://mermaid-js.github.io/) for diagrams
- Full-text search powered by [Pagefind](https://pagefind.app/)
- Prettier formatting for consistent style

## Project Structure

```
src/
  content/docs/    # Starlight documentation collection
    docs/          # Documentation entry point
    tutorials/     # Guided learning experiences
    how-to/        # Task-focused procedures
    reference/     # Commands, capabilities, limits, and generated API viewers
    explanation/   # Concepts, architecture, component map, and design choices
    about/         # Project information
  components/      # Reference links, API viewer, footer, and card components
  styles/          # Xila adjustments to the Starlight Black theme
public/            # Static assets (fonts, images, robots.txt)
docs/templates/    # Authoring templates, excluded from the published site
astro.config.mjs   # Astro and Starlight configuration, including the sidebar
scripts/           # Documentation validation and shared reference helpers
AGENTS.md          # Documentation conventions and maintenance instructions
```

## Run the website locally

Use a current Node.js LTS release and npm, matching the website CI. From your host
terminal, clone the repository and enter its directory:

```sh
git clone https://github.com/xila-project/website.git
cd website
```

1. **Install dependencies:**

   ```sh
   npm ci
   ```

2. **Start local development server:**

   ```sh
   npm run docs:dev
   ```

3. **Build the static site:**

   ```sh
   npm run docs:build
   ```

4. **Preview the built site:**
   ```sh
   npm run docs:preview
   ```

Open the local URL printed by Astro + Starlight to view the site. Before submitting a
change, run `npm run check` to check formatting, build the site, and validate
documentation links.

## Available Commands

| Command         | Description                                         |
| --------------- | --------------------------------------------------- |
| `docs:dev`      | Start Astro + Starlight in development mode         |
| `docs:build`    | Build the static site with Astro + Starlight        |
| `docs:preview`  | Preview the built site locally                      |
| `format:fix`    | Format all files using Prettier                     |
| `format:check`  | Check formatting with Prettier                      |
| `docs:validate` | Check documentation links and anchors after a build |
| `check`         | Check formatting, build, and validate documentation |

Run any command with:

```sh
npm run <command>
```

## Contributing

Read [AGENTS.md](AGENTS.md) for documentation conventions and [docs/templates/README.md](docs/templates/README.md) to choose a writing template. The [documentation contribution guide](src/how-to/write-documentation.md) covers the workflow for this repository; [Core contributions](src/how-to/contribute-core.md) have their own tooling and checks.

Keep each substantive page focused on one reader need. Split mixed onboarding pages into guided tutorials, independent task guides, exact reference, and conceptual explanation, then connect them with links. Use the `sidebar` in `astro.config.mjs` and the landing pages to make content discoverable. The site is pre-production: moved pages use their new URLs directly, without redirects.

## License

This project is under the [Apache License 2.0](LICENSE).

## Validate code references against source repositories

Website documentation can embed `CodeReference` components pointing to files in
Core, Applications, Platforms, Package Manager or Registry. The check command
validates those paths against local checkouts when available; a missing local
checkout is reported as skipped to keep standalone documentation development
possible.

On pull requests, CI checks out all five repositories at their current `main`
revisions in `.reference-checkouts/` using `actions/checkout` with shallow
history and no persisted credentials. It sets `XILA_STRICT_SOURCE_REFERENCES=1`
and the corresponding `XILA_<REPO>_PATH` variables, so missing checkouts or
files are build failures. Checkout directories are ignored by Git and Prettier.

To reproduce strict CI checks locally, place these repositories next to Website
or set their `XILA_<REPO>_PATH` environment variables and run:

```sh
XILA_STRICT_SOURCE_REFERENCES=1 mise run documentation:check
```

The supported repository names come from
`scripts/source-reference.mjs` and are shared with the
source link generator. `npm run test:reference` covers all reference and
checkout validation tests.
