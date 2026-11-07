export function remarkMermaid() {
  return (tree) => {
    function visit(node) {
      if (node.type === "code" && node.lang === "mermaid") {
        // An unknown node type makes mdast-util-to-hast emit exactly the
        // element described by `data`, instead of wrapping it in <pre><code>.
        node.type = "mermaid";
        node.data = {
          hName: "pre",
          hProperties: { className: ["mermaid"] },
          hChildren: [{ type: "text", value: node.value }],
        };
      }
      node.children?.forEach(visit);
    }
    visit(tree);
  };
}
