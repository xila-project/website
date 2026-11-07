---
title: "Create a development package"
docType: how-to
description: Build a development-only Xila archive with the shared native xila-package builder.
---

Use [`Xila-Project/package_manager`](https://github.com/xila-project/package_manager)'s native `xila-package` executable to produce an **experimental development `.xpk` archive**.

:::caution[Experimental]
This workflow packages files for inspection; it does **not** install applications in Xila or make a package trustworthy for execution.
:::

## Prerequisites

Use a native development host with Git, Rust and [mise](https://mise.jdx.dev/) 2026.9.2 or newer. You need an already-built application payload, such as a `wasm32-wasip1` guest from [Build a guest](/how-to/build-guest).

```sh
git clone https://github.com/xila-project/package_manager.git
cd package_manager
mise trust
mise install
mise run check
mise run test
```

The repository pins Rust 1.99.0, integrates mr-boxington and runs its Cargo tasks through mise. Its host builder is in Cargo package `xila-package-builder`, but the compiled executable is named **`xila-package`**. Cargo crate names are prefixed with `xila-package-`; filesystem folder names are simply `crates/manifest`, `crates/reader` and so on.

## 1. Stage the application files

From the `package_manager` repository root, prepare a folder containing **only installable payload files**, with no symlinks or special files:

```sh
mkdir -p app/bin
cp /path/to/calculator.wasm app/bin/calculator.wasm
```

The manifest file must live **outside** the source directory. The builder recursively scans files, rejects links/special entries, computes SHA-256 with a fixed 8 KiB input buffer and sorts paths deterministically.

## 2. Generate or refresh the manifest

```sh
mise exec -- cargo run --locked -p xila-package-builder -- \
  manifest generate ./app ./manifest.json xila.calculator 1.0.0 wasm32-wasip1 1
```

The arguments after `manifest generate` are, in order: source directory, output JSON manifest, dotted package identifier, version, target triple and minimum Xila ABI version. Check the generated JSON and the requested capability list before sharing it. The current format has no finalized permission policy.

When payload bytes change, refresh their sizes and hashes while preserving package identity fields:

```sh
mise exec -- cargo run --locked -p xila-package-builder -- \
  manifest update ./app ./manifest.json
```

## 3. Build and inspect the archive

```sh
mise exec -- cargo run --locked -p xila-package-builder -- \
  pack ./app ./manifest.json ./calculator.xpk
```

The packager rejects files that differ from the manifest, creates a temporary archive, and checks it again through the separate TAR reader before renaming it to the output. This creates an **unsigned package**. No Xila command currently installs it.

The host builder reads payload files into memory and reads the completed TAR again for validation. **Do not run this algorithm inside an MCU installer.** The shared `xila-package-reader` also requires the entire archive as a slice.

An optional final argument to `pack` accepts a **raw 64-byte Ed25519 signature** supplied by a separate signing system. There is presently **no official signer/trust provisioning workflow**, so this guide deliberately does not treat supplying a signature as publishing a trusted release. See [provisional signed bytes](/reference/package-format#exact-provisional-signing-statement) before experimenting.

## 4. Run the repository quality checks

```sh
mise run format:check
mise run check
mise run clippy
mise run test
mise run coverage:lcov
```

`mise run coverage:lcov` requires the pinned `cargo-llvm-cov` and `llvm-tools-preview`; it writes an LCOV report for Codecov. The workspace has GitHub Actions checks, Dependabot and **Git-only** release-plz versioning. Crates are **not published to crates.io** (`publish = false`). GitHub releases may carry `xila-package` binaries for Linux/macOS/Windows once a corresponding release is created; the presence of a workflow does not guarantee one exists.

## Next steps

To propose **metadata** for an externally hosted development package, read [Submit a package declaration](/how-to/submit-package). Do not imply the preview makes it installable or authenticated. For the complete current format and limits, read [Package format](/reference/package-format).
