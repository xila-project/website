import rehypeMermaid from "rehype-mermaid";

// Runs `rehype-mermaid` only on the `pre.mermaid-static` elements, so that the
// other diagrams keep their browser rendering during the trial.
export function rehypeMermaidStatic(options) {
  const render = rehypeMermaid(options);

  return async (tree, file) => {
    const targets = [];
    (function collect(node, parent) {
      if (
        node.type === "element" &&
        node.tagName === "pre" &&
        node.properties?.className?.includes("mermaid-static")
      ) {
        targets.push({ node, parent });
        return;
      }
      node.children?.forEach((child) => collect(child, node));
    })(tree, null);

    if (targets.length === 0) return;

    // `rehype-mermaid` replaces the matching elements inside the children of
    // the root it receives. Render all elements with one browser launch, then
    // put each result back in place of its source element.
    const root = { type: "root", children: targets.map(({ node }) => node) };
    await render(root, file);
    if (root.children.length !== targets.length) {
      throw new Error("rehype-mermaid-static: a diagram was removed.");
    }
    targets.forEach(({ node, parent }, index) => {
      parent.children[parent.children.indexOf(node)] = root.children[index];
    });
  };
}
