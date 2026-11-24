import { fileURLToPath } from "node:url";

import { loadViews, renderView } from "./likec4-svg.mjs";

const modelDirectory = fileURLToPath(
  new URL("../src/diagrams/model", import.meta.url),
);

// Replaces a code fence of the language `likec4` with the static SVG of a
// view of the LikeC4 model:
//
//   ```likec4 view="repositories"
//   ```
export function remarkLikeC4() {
  return async (tree) => {
    const targets = [];
    (function collect(node, parent) {
      if (node.type === "code" && node.lang === "likec4") {
        targets.push({ node, parent });
        return;
      }
      node.children?.forEach((child) => collect(child, node));
    })(tree, null);
    if (targets.length === 0) return;

    const views = await loadViews(modelDirectory);
    for (const { node, parent } of targets) {
      const id = /view="([^"]+)"/.exec(node.meta ?? "")?.[1];
      const view = views[id];
      if (!view) {
        throw new Error(
          `remark-likec4: unknown view "${id}". Known views: ${Object.keys(views).join(", ")}.`,
        );
      }
      parent.children[parent.children.indexOf(node)] = {
        type: "html",
        value: `<div class="diagram">${renderView(view)}</div>`,
      };
    }
  };
}
