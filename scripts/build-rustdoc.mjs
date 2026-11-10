import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

import { sourceEnvironmentKey } from "./source-checkouts.mjs";

const defaultRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

// Core and Applications own the Rustdoc commands (features, targets, toolchain
// and native dependencies). This script only runs their mise tasks and stages
// the output; it must not duplicate their Cargo flags.
const SOURCES = Object.freeze({
  host: {
    repository: "core",
    crate: "xila",
    target: "x86_64-unknown-linux-gnu",
    // Core's graphics build script needs Core's own npm dependencies
    // (lv_font_conv) unless XILA_LV_FONT_CONV_DIR points to a converter.
    prepare: (environment) =>
      environment.XILA_LV_FONT_CONV_DIR ? [] : [["deps:npm"]],
    // Core's docs:host documents dependencies too; the website only publishes
    // the workspace crates, as Core's Pages workflow does.
    task: ["docs:host", "--", "--no-deps"],
  },
  guest: {
    repository: "applications",
    crate: "wasm",
    target: "wasm32-wasip1",
    prepare: () => [],
    task: ["docs:guest"],
  },
});

function resolveCheckout(repository, websiteRoot, environment) {
  const configured = environment[sourceEnvironmentKey(repository)];
  const candidates = configured
    ? [configured]
    : [
        path.join(websiteRoot, ".reference-checkouts", repository),
        path.resolve(websiteRoot, "..", repository),
      ];

  return (
    candidates.find((candidate) =>
      fs.existsSync(path.join(candidate, "Cargo.toml")),
    ) ?? null
  );
}

function runTask(checkout, [task, ...args], environment) {
  execFileSync("mise", ["run", task, ...args], {
    cwd: checkout,
    env: environment,
    stdio: "inherit",
  });
}

function stage(source, destination, crate) {
  if (!fs.existsSync(path.join(source, crate, "index.html"))) {
    throw new Error(
      `Rustdoc output ${source} does not contain ${crate}/index.html`,
    );
  }
  fs.rmSync(destination, { recursive: true, force: true });
  fs.mkdirSync(destination, { recursive: true });
  fs.cpSync(source, destination, { recursive: true });
}

function buildOne(architecture, { root, output, environment, strict }) {
  const source = SOURCES[architecture];
  const destination = path.join(output, architecture);
  const prebuilt =
    environment[`XILA_${architecture.toUpperCase()}_RUSTDOC_DIR`];

  if (prebuilt) {
    stage(prebuilt, destination, source.crate);
    return "copied";
  }

  const checkout = resolveCheckout(source.repository, root, environment);
  if (!checkout) {
    if (strict) {
      throw new Error(
        `Missing ${source.repository} checkout for ${architecture} Rustdoc (set ${sourceEnvironmentKey(source.repository)} or XILA_${architecture.toUpperCase()}_RUSTDOC_DIR).`,
      );
    }
    return "skipped";
  }

  const targetDirectory =
    environment[`XILA_${architecture.toUpperCase()}_CARGO_TARGET_DIR`] ??
    path.join(root, "target", `rustdoc-${architecture}`);
  const taskEnvironment = {
    ...environment,
    CARGO_TARGET_DIR: targetDirectory,
    RUSTDOCFLAGS: environment.RUSTDOCFLAGS ?? "--deny warnings",
  };

  for (const task of source.prepare(environment)) {
    runTask(checkout, task, taskEnvironment);
  }
  runTask(checkout, source.task, taskEnvironment);
  stage(
    path.join(targetDirectory, source.target, "doc"),
    destination,
    source.crate,
  );
  return "built";
}

export function buildRustdoc({
  root = defaultRoot,
  output = path.join(root, "dist", "rustdoc"),
  environment = process.env,
} = {}) {
  const options = {
    root,
    output,
    environment,
    strict: environment.XILA_STRICT_RUSTDOC === "1",
  };
  return {
    host: buildOne("host", options),
    guest: buildOne("guest", options),
  };
}

function main() {
  const result = buildRustdoc();
  console.log(
    `Rustdoc staging complete (host: ${result.host}, guest: ${result.guest}).`,
  );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main();
}
