import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  checkCodeReference,
  sourceEnvironmentKey,
  SOURCE_REPOSITORY_NAMES,
} from "../scripts/source-checkouts.mjs";

test("all published source repositories have CI environment keys", () => {
  assert.deepEqual(SOURCE_REPOSITORY_NAMES, [
    "core",
    "applications",
    "platforms",
    "package_manager",
    "registry",
  ]);
  assert.equal(
    sourceEnvironmentKey("package_manager"),
    "XILA_PACKAGE_MANAGER_PATH",
  );
});

test("CI fails closed when a referenced checkout is missing", (t) => {
  const websiteRoot = fs.mkdtempSync(path.join(os.tmpdir(), "xila-docs-"));
  t.after(() => fs.rmSync(websiteRoot, { recursive: true, force: true }));

  const result = checkCodeReference("core", "Cargo.toml", {
    websiteRoot,
    environment: { XILA_STRICT_SOURCE_REFERENCES: "1" },
  });
  assert.equal(result.status, "error");
  assert.match(result.message, /Missing source checkout/);
});

test("local development skips missing checkouts unless explicitly requested", (t) => {
  const websiteRoot = fs.mkdtempSync(path.join(os.tmpdir(), "xila-docs-"));
  t.after(() => fs.rmSync(websiteRoot, { recursive: true, force: true }));

  assert.equal(
    checkCodeReference("platforms", "Cargo.toml", {
      websiteRoot,
      environment: {},
    }).status,
    "skipped",
  );
  assert.equal(
    checkCodeReference("platforms", "Cargo.toml", {
      websiteRoot,
      environment: { XILA_PLATFORMS_PATH: path.join(websiteRoot, "missing") },
    }).status,
    "error",
  );
});

test("validates every repository including the packages README-only checkout", (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "xila-docs-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  for (const repository of SOURCE_REPOSITORY_NAMES) {
    const checkout = path.join(directory, repository);
    fs.mkdirSync(checkout);
    fs.writeFileSync(
      path.join(
        checkout,
        repository === "registry" ? "README.md" : "Cargo.toml",
      ),
      "test",
    );
    const environment = {
      XILA_STRICT_SOURCE_REFERENCES: "1",
      [sourceEnvironmentKey(repository)]: checkout,
    };
    const marker = repository === "registry" ? "README.md" : "Cargo.toml";
    assert.equal(
      checkCodeReference(repository, marker, {
        websiteRoot: directory,
        environment,
      }).status,
      "checked",
    );
    assert.equal(
      checkCodeReference(repository, "no-such-file.rs", {
        websiteRoot: directory,
        environment,
      }).status,
      "error",
    );
  }
});

test("rejects unsupported repositories, absolute paths, and traversal", () => {
  const websiteRoot = path.join(os.tmpdir(), "xila-docs-unused");
  for (const [repository, file] of [
    ["unknown", "README.md"],
    ["core", "../secret"],
    ["core", "/etc/passwd"],
    ["core", "foo//bar"],
    ["core", undefined],
  ]) {
    assert.equal(
      checkCodeReference(repository, file, {
        websiteRoot,
        environment: {},
      }).status,
      "error",
    );
  }
});
