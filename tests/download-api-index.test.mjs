import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { downloadApiIndex } from "../scripts/download-api-index.mjs";
import { createDirectory } from "./helpers/rustdoc-fixture.mjs";

const respond = (status, body) => async () => ({
  ok: status === 200,
  status,
  json: async () => body,
});

test("downloads the published index", async (t) => {
  const directory = createDirectory(t, "xila-api-download-");
  const destination = path.join(directory, "api", "api-index.json");
  const index = { version: 1, apis: {} };
  const result = await downloadApiIndex({
    destination,
    fetchFunction: respond(200, index),
  });
  assert.deepEqual(result, { status: "downloaded" });
  assert.deepEqual(JSON.parse(fs.readFileSync(destination, "utf8")), index);
});

test("reports a missing or incompatible index without failing", async (t) => {
  const directory = createDirectory(t, "xila-api-download-");
  const destination = path.join(directory, "api", "api-index.json");
  assert.deepEqual(
    await downloadApiIndex({ destination, fetchFunction: respond(404) }),
    { status: "unavailable", reason: "HTTP 404" },
  );
  assert.equal(
    (
      await downloadApiIndex({
        destination,
        fetchFunction: respond(200, { version: 2 }),
      })
    ).status,
    "unavailable",
  );
  assert.equal(
    (
      await downloadApiIndex({
        destination,
        fetchFunction: async () => {
          throw new Error("offline");
        },
      })
    ).reason,
    "offline",
  );
  assert.equal(fs.existsSync(destination), false);
});

test("keeps the index of staged API pages", async (t) => {
  const directory = createDirectory(t, "xila-api-download-");
  fs.mkdirSync(path.join(directory, "api", "host"), { recursive: true });
  const result = await downloadApiIndex({
    destination: path.join(directory, "api", "api-index.json"),
    fetchFunction: respond(200, { version: 1, apis: {} }),
  });
  assert.deepEqual(result, { status: "staged" });
});
