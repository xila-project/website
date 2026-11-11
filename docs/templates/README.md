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
- **Links:** root-relative internal links with a trailing slash; descriptive link text. Link Rust items with `HostReference` or `GuestReference`, source files with `CodeReference` and third-party crates with `DocsRsReference`.
- **Diagrams:** fenced `mermaid` blocks without styling directives, one idea each, introduced by a sentence and described again in prose.
- **Last section:** `## Related` (tutorials end with `## Next steps`).

Follow [AGENTS.md](../../AGENTS.md) for accuracy, style, navigation, and validation. The public [documentation contribution guide](../../src/content/docs/how-to/write-documentation.mdx) explains the workflow.

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
