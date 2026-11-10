import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

import { sourceEnvironmentKey } from "./source-checkouts.mjs";

const defaultRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

function resolveCheckout(repository, websiteRoot, environment) {
  const configured = environment[sourceEnvironmentKey(repository)];
  const candidates = [
    configured,
    path.join(websiteRoot, ".reference-checkouts", repository),
    path.resolve(websiteRoot, "..", repository),
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, "Cargo.toml"))) {
      return candidate;
    }
  }
  return null;
}

export function buildRustdoc({
  root = defaultRoot,
  output = path.join(root, "dist", "rustdoc"),
  environment = process.env,
} = {}) {
  const strict = environment.XILA_STRICT_RUSTDOC === "1";
  const prebuiltHost = environment.XILA_HOST_RUSTDOC_DIR;
  const prebuiltGuest = environment.XILA_GUEST_RUSTDOC_DIR;

  const hostOut = path.join(output, "host");
  const guestOut = path.join(output, "guest");

  let builtHost = false;
  let builtGuest = false;

  if (
    prebuiltHost &&
    fs.existsSync(path.join(prebuiltHost, "xila", "index.html"))
  ) {
    fs.rmSync(hostOut, { recursive: true, force: true });
    fs.mkdirSync(hostOut, { recursive: true });
    fs.cpSync(prebuiltHost, hostOut, { recursive: true });
    builtHost = true;
  } else {
    const coreCheckout = resolveCheckout("core", root, environment);
    if (coreCheckout) {
      const targetDir =
        environment.XILA_HOST_CARGO_TARGET_DIR ??
        path.join(root, "target", "rustdoc-host");
      const env = {
        ...environment,
        CARGO_TARGET_DIR: targetDir,
        RUSTDOCFLAGS: environment.RUSTDOCFLAGS ?? "--deny warnings",
      };
      execFileSync(
        "cargo",
        [
          "doc",
          "--manifest-path",
          path.join(coreCheckout, "Cargo.toml"),
          "--workspace",
          "--features",
          "xila/graphics,xila/abi_definitions,xila/graphics_rendering_xrgb8888,xila/audio,xila/neural_network,xila/bootsplash,xila-testing/graphics",
          "--target",
          "x86_64-unknown-linux-gnu",
          "--no-deps",
        ],
        { cwd: coreCheckout, env, stdio: "inherit" },
      );
      const generatedHost = path.join(
        targetDir,
        "x86_64-unknown-linux-gnu",
        "doc",
      );
      fs.rmSync(hostOut, { recursive: true, force: true });
      fs.mkdirSync(hostOut, { recursive: true });
      fs.cpSync(generatedHost, hostOut, { recursive: true });
      builtHost = true;
    } else if (strict) {
      throw new Error(
        "Missing Core checkout for host rustdoc generation (set XILA_CORE_PATH or XILA_HOST_RUSTDOC_DIR).",
      );
    }
  }

  if (
    prebuiltGuest &&
    fs.existsSync(path.join(prebuiltGuest, "wasm", "index.html"))
  ) {
    fs.rmSync(guestOut, { recursive: true, force: true });
    fs.mkdirSync(guestOut, { recursive: true });
    fs.cpSync(prebuiltGuest, guestOut, { recursive: true });
    builtGuest = true;
  } else {
    const applicationsCheckout = resolveCheckout(
      "applications",
      root,
      environment,
    );
    if (applicationsCheckout) {
      const targetDir =
        environment.XILA_GUEST_CARGO_TARGET_DIR ??
        path.join(root, "target", "rustdoc-guest");
      const env = {
        ...environment,
        CARGO_TARGET_DIR: targetDir,
        RUSTDOCFLAGS: environment.RUSTDOCFLAGS ?? "--deny warnings",
      };
      execFileSync(
        "cargo",
        [
          "doc",
          "--manifest-path",
          path.join(applicationsCheckout, "Cargo.toml"),
          "--locked",
          "--package",
          "xila-wasm",
          "--no-default-features",
          "--features",
          "default_guest",
          "--target",
          "wasm32-wasip1",
          "--no-deps",
        ],
        { cwd: applicationsCheckout, env, stdio: "inherit" },
      );
      const generatedGuest = path.join(targetDir, "wasm32-wasip1", "doc");
      fs.rmSync(guestOut, { recursive: true, force: true });
      fs.mkdirSync(guestOut, { recursive: true });
      fs.cpSync(generatedGuest, guestOut, { recursive: true });
      builtGuest = true;
    } else if (strict) {
      throw new Error(
        "Missing Applications checkout for guest rustdoc generation (set XILA_APPLICATIONS_PATH or XILA_GUEST_RUSTDOC_DIR).",
      );
    }
  }

  return { builtHost, builtGuest, hostOut, guestOut };
}

function main() {
  const result = buildRustdoc();
  console.log(
    `Rustdoc staging complete (host: ${result.builtHost ? "copied" : "skipped"}, guest: ${result.builtGuest ? "copied" : "skipped"}).`,
  );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main();
}
