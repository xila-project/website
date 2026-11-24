import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import test from "node:test";

// src/components/Header.astro copies the markup and the base styles of
// Starlight's header, because the centered navigation needs its own grid.
// This test fails when an update changes Starlight's header, so that the
// copy is compared with the new version before the update is merged.
const STARLIGHT_HEADER = new URL(
  "../node_modules/@astrojs/starlight/dist/components/Header.astro",
  import.meta.url,
);
const REVIEWED_SHA256 =
  "eaca0068368156b045c94c64b20a1816f9f281b412025d8fbdf3fc8957e16414";

test("the header override matches the reviewed Starlight header", () => {
  const actual = crypto
    .createHash("sha256")
    .update(fs.readFileSync(STARLIGHT_HEADER))
    .digest("hex");
  assert.equal(
    actual,
    REVIEWED_SHA256,
    "Starlight's Header.astro changed. Compare it with src/components/Header.astro, " +
      "port the differences, then replace REVIEWED_SHA256 in this file.",
  );
});
