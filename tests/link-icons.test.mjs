import assert from "node:assert/strict";
import test from "node:test";

import {
  EXTERNAL_LINK_CLASS,
  EXTERNAL_LINK_HIDDEN_TEXT,
  rehypeLinkIcons,
  SOURCE_LINK_CLASS,
  SOURCE_LINK_HIDDEN_TEXT,
} from "../scripts/rehype-link-icons.mjs";

function anchor(href, className) {
  return {
    type: "element",
    tagName: "a",
    properties: { href, ...(className ? { className: [className] } : {}) },
    children: [{ type: "text", value: "link" }],
  };
}

function run(...links) {
  const tree = {
    type: "root",
    children: [
      { type: "element", tagName: "p", properties: {}, children: links },
    ],
  };
  rehypeLinkIcons()(tree);
  return links;
}

function hiddenText(node) {
  const span = node.children.at(-1);
  return span?.children?.[0]?.value;
}

test("marks a GitHub source link with the GitHub class and hidden text", () => {
  const [blob, tree, pull] = run(
    anchor("https://github.com/xila-project/core/blob/main/Cargo.toml"),
    anchor("https://github.com/xila-project/platforms/tree/main/src"),
    anchor("https://github.com/xila-project/core/pull/12"),
  );
  assert.deepEqual(blob.properties.className, [SOURCE_LINK_CLASS]);
  assert.equal(hiddenText(blob), SOURCE_LINK_HIDDEN_TEXT);
  assert.deepEqual(tree.properties.className, [SOURCE_LINK_CLASS]);
  assert.equal(hiddenText(tree), SOURCE_LINK_HIDDEN_TEXT);
  // A link to the repository itself is not a source link: external icon.
  assert.deepEqual(pull.properties.className, [EXTERNAL_LINK_CLASS]);
  assert.equal(hiddenText(pull), EXTERNAL_LINK_HIDDEN_TEXT);
});

test("marks any other external link with the external icon and hidden text", () => {
  const [external] = run(anchor("https://git-scm.com/"));
  assert.deepEqual(external.properties.className, [EXTERNAL_LINK_CLASS]);
  assert.equal(hiddenText(external), EXTERNAL_LINK_HIDDEN_TEXT);
});

test("leaves links to pages of the site unchanged", () => {
  const [internal, anchorLink, mailto] = run(
    anchor("/how-to/build-guest/"),
    anchor("/reference/host/#crate"),
    anchor("mailto:hello@xila.dev"),
  );
  for (const node of [internal, anchorLink, mailto]) {
    assert.equal(node.properties.className, undefined);
    assert.equal(node.children.length, 1);
  }
});

test("keeps an existing class and adds the icon class after it", () => {
  const [external] = run(anchor("https://example.com/", "custom"));
  assert.deepEqual(external.properties.className, [
    "custom",
    EXTERNAL_LINK_CLASS,
  ]);
});
