// Adjusts the inline SVG of a build-time diagram (D2 or Mermaid):
// - sets the natural size of the diagram as its width and height, so that a
//   small diagram is not scaled up to the width of the column and so that the
//   page reserves the height before the style sheet loads (no layout shift);
// - removes the font that D2 embeds. The diagram uses the Montserrat web font
//   of the site, which the stylesheet sets. D2 uses its own font only to
//   measure the labels.
export function rehypeDiagramSvg() {
  return (tree) => {
    (function visit(node) {
      if (node.type === "element" && node.tagName === "svg") {
        const isD2 = Boolean(node.properties?.dataD2Version);
        const isMermaid = String(node.properties?.id ?? "").startsWith(
          "mermaid",
        );
        const viewBox = String(node.properties?.viewBox ?? "")
          .trim()
          .split(/\s+/);
        if ((isD2 || isMermaid) && viewBox.length === 4) {
          node.properties.width = String(Math.ceil(Number(viewBox[2])));
          node.properties.height = String(Math.ceil(Number(viewBox[3])));
          delete node.properties.style;
        }
      }
      if (node.type === "element" && node.tagName === "style") {
        for (const child of node.children ?? []) {
          if (typeof child.value === "string") {
            child.value = child.value.replace(/@font-face\s*\{[^}]*\}/g, "");
          }
        }
      }
      node.children?.forEach(visit);
    })(tree);
  };
}
