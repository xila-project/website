import { resolveApiLink } from "./api-links.mjs";

// Resolves Markdown links with a `rust:` target to the API pages:
//
//   [`Manager::spawn`](rust:task::Manager::spawn)
//   [`task::Manager::spawn`](rust:)          (the link text is the path)
//   [`wasm::Window`](rust:guest:wasm::Window)
//
// The target syntax is that of `resolveApiTarget` in api-index.mjs. A link
// that does not resolve points to the rustdoc search and carries a
// `data-api-error` attribute, which the documentation check reports, or a
// `data-api-unchecked` attribute when the build has no API index.

const SCHEME = "rust:";

function text(node) {
  if (node.type === "text" || node.type === "inlineCode") return node.value;
  return (node.children ?? []).map(text).join("");
}

function resolve(node, target) {
  const link = resolveApiLink(target);
  node.url = link.href;
  node.data ??= {};
  node.data.hProperties = {
    ...node.data.hProperties,
    ...(link.error
      ? { "data-api-error": link.error }
      : link.unchecked
        ? { "data-api-unchecked": link.unchecked }
        : { "data-api": link.api }),
  };
}

export function remarkApiLinks() {
  return (tree) => {
    function visit(node) {
      if (
        (node.type === "link" || node.type === "definition") &&
        node.url?.startsWith(SCHEME)
      ) {
        const target = node.url.slice(SCHEME.length);
        resolve(node, target || (node.type === "link" ? text(node) : target));
      }
      node.children?.forEach(visit);
    }
    visit(tree);
  };
}
