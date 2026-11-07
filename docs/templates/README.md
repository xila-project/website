# Documentation templates

These are locally authored Xila templates informed by [The Good Docs Project](https://github.com/thegooddocsproject/templates) and organized using [Diátaxis](https://diataxis.fr/). They provide writing prompts; they are not imported upstream templates or a claim of formal certification.

| Reader's question                       | Start with                      | Published location              |
| --------------------------------------- | ------------------------------- | ------------------------------- |
| “Can you help me learn by doing?”       | [Tutorial](./tutorial.md)       | `src/content/docs/tutorials/`   |
| “How do I complete this task?”          | [How-to](./how-to.md)           | `src/content/docs/how-to/`      |
| “What are the exact options or limits?” | [Reference](./reference.md)     | `src/content/docs/reference/`   |
| “Why does this work this way?”          | [Explanation](./explanation.md) | `src/content/docs/explanation/` |

Copy the selected file into the appropriate source directory, choose a descriptive filename, and replace every writing prompt. Delete optional sections that do not help the reader. Keep templates outside `src/` so drafts and placeholders never appear in the site or search results.

Follow [AGENTS.md](../../AGENTS.md) for accuracy, style, navigation, and validation. The public [documentation contribution guide](../../src/how-to/write-documentation.md) explains the workflow.

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
