---
title: "Build a guest application"
docType: how-to
description: Compile a wasm32-wasip1 guest from Applications and use the relocated xila-wasm guest API.
---

Official guest code and the `xila-wasm` guest API now live in [Applications](https://github.com/xila-project/applications). Compile application binaries for **`wasm32-wasip1`**; `wasm32-unknown-unknown` is the **Platforms browser host**, not the guest target.

## Build an existing bundled application

From the `applications` checkout, after installing [mise](https://mise.jdx.dev/):

```sh
mise trust
mise run build:applications
```

This compiles Calculator, Clock, Weather, Pixel Painter, Text Editor and Synth with `release-wasm`. For one application:

```sh
mise exec -- cargo build --locked -p xila-calculator \
  --target wasm32-wasip1 --profile release-wasm
```

The artifact is `target/wasm32-wasip1/release-wasm/calculator.wasm` relative to Applications.

## Depend on guest graphics bindings

In an external guest project's Cargo manifest, specify the **renamed package** and the new Git repository:

```toml
[dependencies]
wasm = { package = "xila-wasm", git = "https://github.com/xila-project/applications", rev = "1bedb918668b8b9606d8b61bb04c2f0931615b4f", default-features = false, features = ["guest", "graphics", "memory_32"] }
```

This example pins the Applications main revision reviewed when this page was written; select matching versions of Core/Applications/Platforms for your runtime. For local development, a relative `path` dependency on `../applications/executables/wasm` is also possible.

`default_guest` additionally enables generated C wrappers and `xila_graphics.h`. Standard WASI guests can use the supported WASI imports without importing Xila graphics. Native LVGL/Wasmi APIs are **not** exposed simply by enabling the guest feature.

Command guests export `_start: () -> ()`. Launcher discovery is **not** performed by the guest: include a `shortcut.json` in the root of its installed bundle, with `command` and `arguments` pointing to its executable (using `@bundle/` for bundle-local paths). Follow [Add a launcher shortcut](/how-to/add-shortcut) and the [graphics bindings](/reference/graphics-bindings) for compatibility limitations.

## Run or package it

Platforms assembles the native/browser runtime and creates seeded images from prebuilt application bundles (optionally supplied using `XILA_BUNDLES_DIR`), including each bundle's `shortcut.json`. Follow [Run Xila natively](/tutorials/native), [the browser tutorial](/tutorials/browser), or [run a guest](/how-to/run-guest).

The separate [host package builder](/how-to/package-application) can bundle the file into an experimental `.xpk`, **not** install or authorize it.
