import fs from "node:fs";

// Prepends the shared Xila vocabulary of D2 classes (`src/diagrams/xila.d2`)
// to every `d2` code fence. It must run before the `astro-d2` plugin, which
// Astro adds after the plugins of the site configuration. D2.js receives one
// file only, so D2 imports cannot share the vocabulary.
export function remarkD2Preamble() {
  const preamble = fs.readFileSync(
    new URL("../src/diagrams/xila.d2", import.meta.url),
    "utf8",
  );

  return (tree) => {
    (function visit(node) {
      if (node.type === "code" && node.lang === "d2") {
        node.value = `${preamble}\n${node.value}`;
      }
      node.children?.forEach(visit);
    })(tree);
  };
}
