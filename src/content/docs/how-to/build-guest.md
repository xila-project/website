---
title: "Build a guest application"
docType: how-to
description: "Compile a WebAssembly guest application for Xila using the wasm32-wasip1 target and xila-wasm crate."
---

This guide shows how to compile a WebAssembly (Wasm) guest application targeting `wasm32-wasip1` for execution in Xila.

## Before you begin

- Install Rust with the `wasm32-wasip1` target: run `rustup target add wasm32-wasip1`.
- Install [mise](https://mise.jdx.dev/) if you build existing applications in the Applications repository.
- Have a guest application project ready, such as the [Wasm application template](https://github.com/xila-project/wasm_application_template).

## Steps

### Build an existing application in the Applications repository

1. In the Applications repository root, trust the local mise configuration:
   ```sh
   mise trust
   ```
2. Build all bundled guest applications:
   ```sh
   mise run build:applications
   ```
   To build a single guest such as Calculator, run:
   ```sh
   cargo build --target wasm32-wasip1 --profile release-wasm -p xila-calculator
   ```

### Configure and build a standalone guest application

1. In your project Cargo manifest (`Cargo.toml`), add `xila-wasm` with default features disabled and guest features enabled:
   ```toml
   [target.'cfg(target_arch = "wasm32")'.dependencies]
   wasm = { package = "xila-wasm", git = "https://github.com/xila-project/applications", default-features = false, features = ["default_guest"] }
   ```
2. Configure Cargo to target `wasm32-wasip1` in `.cargo/config.toml`:
   ```toml
   [build]
   target = "wasm32-wasip1"
   ```
3. Optional: Configure release optimizations in `Cargo.toml`:
   ```toml
   [profile.release]
   opt-level = "s"
   lto = true
   strip = true
   ```
4. In your project root, compile the release binary:
   ```sh
   cargo build --release
   ```

## Verify the result

Check that the compiled Wasm binary exists in the target directory:

- For bundled applications, check `target/wasm32-wasip1/release-wasm/calculator.wasm`.
- For standalone applications, check `target/wasm32-wasip1/release/<binary-name>.wasm`.

In the Applications repository root, verify the binary format using the host shell:

```sh
file target/wasm32-wasip1/release-wasm/calculator.wasm
```

The output is similar to:

```text
target/wasm32-wasip1/release-wasm/calculator.wasm: WebAssembly (wasm) binary module version 0x1 (MVP)
```

## Troubleshooting

| Symptom                                   | Cause                                                  | Fix                                                           |
| ----------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------- |
| Missing target `wasm32-wasip1`            | The Rust toolchain lacks the WASI target               | Run `rustup target add wasm32-wasip1`                         |
| Host dependencies pulled into compilation | Default features were not disabled on `xila-wasm`      | Set `default-features = false` on `xila-wasm` in `Cargo.toml` |
| Missing `_start` export when running      | The crate was compiled as a library or lacks `fn main` | Add a binary target (`src/main.rs`) with `fn main`            |

## Related

- [Run a guest application](/how-to/run-guest/)
- [Add a launcher shortcut](/how-to/add-shortcut/)
- [Guest API](/reference/guest/)
- [Wasm runtime](/reference/wasm-runtime/)
