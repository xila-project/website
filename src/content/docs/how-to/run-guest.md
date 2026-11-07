---
title: "Run a guest from Xila's terminal"
docType: how-to
description: Launch an installed WASI guest through the mounted Xila WASM executable.
---

Launch a guest already present in Xila's virtual filesystem. The Wasm runner executes applications; it does not install bundles or launcher shortcuts.

## Before you begin

- Start an Xila runtime with `/applications/executables/wasm` mounted, such as the native or browser example.
- Place a compatible guest in the VFS as a regular file. New browser seed images include `/applications/bundles/xila.calculator/executables/calculator.wasm`; the browser has no general guest upload mechanism.
- Check the guest's required imports against the [runtime](/reference/wasm-runtime) and [graphics](/reference/graphics-bindings) references.

## Launch the application

Open Xila's graphical terminal and enter an absolute VFS path:

```text
/applications/executables/wasm /applications/bundles/xila.calculator/executables/calculator.wasm
```

For another guest, replace the Calculator bundle path with its actual executable path in Xila's VFS. This command runs in **Xila's terminal**, not your host shell.

Normal execution calls `_start: () -> ()`. The loader reads the supplied path directly; use an absolute VFS path rather than relying on `Current_directory` resolution inside the WASM loader.

## Verify completion

Check the guest's expected output or interface and the terminal for reported errors. For Calculator, evaluate `1 + 2 = 3` and close its window; the desktop should remain usable. For a launcher shortcut, check that the installed bundle contains `shortcut.json` and reopen the app drawer to trigger Shell discovery; execution alone does not create a shortcut.

## Troubleshooting

- Missing file: verify the path is in Xila's VFS, not just on the host computer.
- Entry/import errors: rebuild the guest with the required target and compatible supported imports.
- Unsupported graphics call: check the supported call subset before assuming enabling `graphics` provides the entire LVGL API.

## Related documentation

- [Build a guest application](/how-to/build-guest)
- [Add a launcher shortcut](/how-to/add-shortcut)
- [Wasmi execution model](/explanation/architecture/executables/wasm)
