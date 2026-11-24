// Trial of build-time Mermaid rendering. A code fence with the language
// `mermaid-static` becomes a `pre.mermaid.mermaid-static` element that
// `rehype-mermaid-static.mjs` replaces with an inline SVG at build time.
// Other `mermaid` fences keep their browser rendering.
export function remarkMermaidStatic() {
  return (tree) => {
    function visit(node) {
      if (node.type === "code" && node.lang === "mermaid-static") {
        node.type = "mermaid";
        node.data = {
          hName: "pre",
          hProperties: { className: ["mermaid", "mermaid-static"] },
          hChildren: [{ type: "text", value: node.value }],
        };
      }
      node.children?.forEach(visit);
    }
    visit(tree);
  };
}
