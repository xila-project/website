import assert from "node:assert/strict";
import test from "node:test";

import { missingPageIcons, pageIconErrors } from "../scripts/page-icons.mjs";

test("every sidebar page outside the section overviews and the collapsible groups has an icon", () => {
  assert.deepEqual(pageIconErrors(), []);
});

test("a sidebar page without an icon fails with a message naming the page and the map", () => {
  const sidebar = [
    {
      label: "How-to guides",
      items: [{ label: "Brand new page", link: "/how-to/brand-new-page/" }],
    },
  ];
  assert.deepEqual(missingPageIcons(sidebar), ["/how-to/brand-new-page/"]);
  assert.match(
    pageIconErrors(sidebar).join("\n"),
    /\/how-to\/brand-new-page\/.*scripts\/page-icons\.mjs/,
  );
});

test("section overviews and pages of the collapsible architecture groups need no icon", () => {
  const sidebar = [
    {
      label: "Tutorials",
      items: [{ label: "Overview", link: "/tutorials/" }],
    },
    {
      label: "Drivers",
      items: [
        { label: "Overview", link: "/explanation/architecture/drivers/" },
        { label: "Nordic", link: "/explanation/architecture/drivers/nordic/" },
      ],
    },
  ];
  assert.deepEqual(pageIconErrors(sidebar), []);
});
