# Documentation templates

These are locally authored Xila templates informed by [The Good Docs Project](https://github.com/thegooddocsproject/templates) and organized using [Diátaxis](https://diataxis.fr/). They provide writing prompts; they are not imported upstream templates or a claim of formal certification.

| Reader's question                       | Start with                      | Published location              |
| --------------------------------------- | ------------------------------- | ------------------------------- |
| “Can you help me learn by doing?”       | [Tutorial](./tutorial.md)       | `src/content/docs/tutorials/`   |
| “How do I complete this task?”          | [How-to](./how-to.md)           | `src/content/docs/how-to/`      |
| “What are the exact options or limits?” | [Reference](./reference.md)     | `src/content/docs/reference/`   |
| “Why does this work this way?”          | [Explanation](./explanation.md) | `src/content/docs/explanation/` |

Copy the selected file into the appropriate source directory, choose a descriptive filename, and replace every writing prompt. Each template fixes the section order and headings for its page type: keep the headings as written, use `###` sub-headings inside a section when needed, and delete only the sections marked optional. Keep templates outside `src/` so drafts and placeholders never appear in the site or search results.

## Page conventions

- **Frontmatter:** `title`, `docType` and `description`, in that order. The description is one sentence under 160 characters. Do not repeat the title as a `#` heading.
- **Headings:** sentence case, no code, links or numbers. Task headings start with a verb; concept headings are noun phrases.
- **Intro:** the first sentence states what the page is about in plain words.
- **Asides:** `:::note`, `:::tip`, `:::caution` and `:::danger`, at most two per page, never holding prerequisites or steps. Put `:::caution` or `:::danger` next to the destructive action.
- **Code blocks:** always set a language (`sh` for the host shell, `text` for Xila's terminal and for output). Introduce each block with a sentence that names the working directory and context. No prompt characters.
- **Links:** root-relative internal links with a trailing slash; descriptive link text. Link Rust API items with a `rust:` link or the `Api` component, source files with `CodeReference` and third-party crates with `DocsRsReference`.
- **Diagrams:** new diagrams use fenced `d2` blocks (see the example below and [Diagrams](../../AGENTS.md#diagrams)); one idea each, introduced by a sentence and described again in prose. The existing `mermaid` pages keep their browser rendering until they are converted.
- **Last section:** `## Related` (tutorials end with `## Next steps`).

Follow [AGENTS.md](../../AGENTS.md) for accuracy, style, navigation, and validation. The public [documentation contribution guide](../../src/content/docs/how-to/write-documentation.mdx) explains the workflow.

## Diagram example

Copy this block into a page. The `d2` fence is rendered at build time to a static SVG; the `title` metadata becomes the title of the SVG for assistive technology; the `class` values come from the shared shape vocabulary in `src/diagrams/xila.d2`.

<div className="diagram">

```d2 title="Trust chain of a package installation"
registry: Registry entry { class: record }
repository_key: Repository key { class: key }
developer_key: Developer key { class: key }
signature: Package signature { class: record }

repository_key -> registry: signs { class: trust }
repository_key -> developer_key: authorizes { class: trust }
developer_key -> signature: signs { class: trust }
```

</div>

## Editorial review

- Does the title match one reader need and the page's type?
- Can readers identify prerequisites before starting?
- Does each command specify its directory, environment, and target?
- Are outcomes observable, reference values exact, and explanations supported by source?
- Are optional workflows linked rather than mixed into a tutorial?
- Do technical claims match the implementation and its supported capabilities?
- Are the navigation, related links, and incoming links updated?
- Have the required checks passed, and are validation limits stated accurately?

## Source material

The prompts draw on the purposes described in the Good Docs [tutorial guide](https://github.com/thegooddocsproject/templates/blob/dev/tutorial/tutorial-template-guide.md), [how-to template](https://github.com/thegooddocsproject/templates/blob/dev/how-to/template-how-to.md), [reference template](https://github.com/thegooddocsproject/templates/blob/dev/reference/template-reference.md), and [explanation guide](https://github.com/thegooddocsproject/templates/blob/dev/explanation/about-explanation.md).
