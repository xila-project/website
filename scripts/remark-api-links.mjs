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
// `data-api-unchecked` attribute when the build has no API index. A resolved
// link also carries the item kind in `data-api-kind` and a visually hidden
// "(API reference)" text, so that the link convention of src/styles/xila.css
// applies to it like to the links of the `Api` component.

const SCHEME = "rust:";

// The visually hidden text that says what an API link is, for screen readers.
export const API_LINK_HIDDEN_TEXT = "(API reference)";

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
        : { "data-api": link.api, "data-api-kind": link.kind }),
  };
  // A definition has no children of its own: its hidden text is added to the
  // links that reference it, which carry the same properties.
  if (node.type === "link")
    node.children.push({
      type: "html",
      value: `<span class="sr-only">${API_LINK_HIDDEN_TEXT}</span>`,
    });
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
