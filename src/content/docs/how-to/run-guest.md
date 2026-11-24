---
title: "Run a guest application"
docType: how-to
description: "Launch a WebAssembly guest application in Xila from the terminal using the mounted Wasm executable."
---

This guide shows how to run a WebAssembly (Wasm) guest application from Xila's terminal using the host Wasm runner.

## Before you begin

- A running Xila runtime with `/applications/executables/wasm` mounted, for example the native runtime or the browser runtime.
- The compiled `wasm32-wasip1` guest binary in Xila's virtual file system (VFS), for example `/applications/bundles/xila.calculator/executables/calculator.wasm`.

## Steps

1. In Xila, open the terminal from the application drawer or desktop.
2. In Xila's terminal, run the Wasm executable followed by the absolute VFS path to the guest binary:
   ```text
   /applications/executables/wasm /applications/bundles/xila.calculator/executables/calculator.wasm
   ```
3. Optional: Pass command-line arguments to the guest application by appending them after a `--` separator:
   ```text
   /applications/executables/wasm /applications/bundles/xila.calculator/executables/calculator.wasm -- arg1 arg2
   ```
4. Optional: Set a custom fuel instruction quantum per execution slice with `--instruction-limit`:
   ```text
   /applications/executables/wasm --instruction-limit 50000 /applications/bundles/xila.calculator/executables/calculator.wasm
   ```

## Verify the result

Confirm that the guest application runs:

- For a graphical guest, for example Calculator, the application window appears on the desktop.
- For a command-line guest, output appears in Xila's terminal.
- When execution completes, the terminal prompt returns without error.

## Troubleshooting

| Symptom                   | Cause                                                        | Fix                                                                        |
| ------------------------- | ------------------------------------------------------------ | -------------------------------------------------------------------------- |
| `Error: NotAWasmFile`     | The path does not point to a regular file in the VFS         | Check the absolute path in the VFS with `ls`                               |
| `Error parsing arguments` | Runner flags were placed after the guest path without `--`   | Place runner options before the guest path, and guest arguments after `--` |
| Nonzero exit status       | The guest application panicked or exited with a failure code | Inspect the error messages printed to standard error                       |

## Related

- [Build a guest application](/how-to/build-guest/)
- [Add a launcher shortcut](/how-to/add-shortcut/)
- [Wasm runtime](/reference/wasm-runtime/)
- [Wasm](/explanation/architecture/executables/wasm/)
