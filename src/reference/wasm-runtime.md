---
layout: doc
docType: reference
description: Xila WASM command options, package features, WASI constraints, and browser capabilities.
---

# WASM runtime

The `xila-wasm` Cargo package implements the Wasmi runtime and guest helper APIs. The native and browser examples mount its executable at `/applications/executables/wasm`. Sources: <CodeReference repo="applications" path="executables/wasm/Cargo.toml" /> and <CodeReference repo="applications" path="executables/wasm/src/host/main.rs" />.

## Command syntax

```text
/applications/executables/wasm [--stack-size <bytes>] [--instruction-limit <fuel>] <path> [-- <guest-argument> ...]
```

The command runs in Xila's terminal. `<path>` must identify a regular guest file in the VFS; the loader reads the supplied path directly and does not perform `Current_directory` resolution. The runner invokes the typed `_start: () -> ()` export. The guest receives its module path as the first WASI argument, followed by any arguments after the literal `--` separator, and inherits the task environment.

| Argument/option       | Default  | Behavior                                                                                                                     |
| --------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `<path>`              | Required | Guest module file path. Use an absolute VFS path.                                                                            |
| `--stack-size`        | 4096     | Parsed as a stack size, but currently not applied by the runtime.                                                            |
| `--instruction-limit` | 100,000  | Nonzero fuel quantum used by resumable execution. Fuel is replenished after yielding; this is not a total instruction limit. |

## Cargo features

| Feature         | Purpose                                                                                       |
| --------------- | --------------------------------------------------------------------------------------------- |
| `host`          | Wasmi interpreter and Xila executable integration; includes browser-hosted Xila.              |
| `guest`         | Guest helpers without the interpreter when default features are disabled.                     |
| `graphics`      | Generated graphics wrappers and supported host imports.                                       |
| `c_bindings`    | Guest C wrappers/header generation; enables guest/graphics dependencies.                      |
| `memory_32`     | 32-bit guest-word translation configuration; default.                                         |
| `memory_64`     | Alternate 64-bit guest-word translation configuration; bundled applications remain wasm32.    |
| `default_guest` | `guest,graphics,c_bindings,memory_32`; emits `xila_graphics.h` in the build output directory. |

Default features are `host,memory_32`. Guest-only consumers must disable defaults. Core's `xila` package has neither a `host` nor a `wasm` feature; these runtime features belong to the `xila-wasm` package.

## Results and errors

- WASI `proc_exit(0)` succeeds; a nonzero exit code becomes a runtime error.
- Argument, file-kind, compilation, instantiation, missing-export, and execution failures are reported on stderr and return a nonzero executable result.
- Standard streams are descriptors 0/1/2 in the per-execution WASI context. The root directory is preopened if available.
- Graphics status and capability errors are defined in the [graphics reference](./graphics-bindings).

## Execution limits

| Capability                  | Current constraint                                                                                                                                  |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Interpreter                 | Wasmi 2 with validation, memory64 support, and automatic portable/native dispatch as available.                                                     |
| Translation                 | Functions are translated eagerly before execution so fuel exhaustion cannot suspend lazy callee translation. This can increase startup work.        |
| Scheduling                  | Fuel exhaustion and `sched_yield` yield cooperatively to the executor. Wasmi 2 meters input Wasm operators, so slice timing is not version-stable.  |
| `poll_oneoff`               | Up to 64 supported realtime/monotonic subscriptions. Invalid UTC does not prevent monotonic polling; file-descriptor readiness remains unsupported. |
| Startup clock               | Uses the monotonic Embassy source; adjustable UTC is separate and can be unsynchronized.                                                            |
| WebAssembly start sections  | Suspension is unsupported. WASI command guests should use exported `_start`.                                                                        |
| WASI/graphics compatibility | Partial WASI coverage and a supported graphics subset, not full compatibility.                                                                      |
| Graphics ABI                | Guest and host must match the LVGL revision/configuration; only registry-supported wrappers are generated, with no capability negotiation yet.      |

## Browser capabilities

| Area            | Browser example behavior                                                                                                                                                                                                                                                                                                                                                                    |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Host target     | Xila builds for `wasm32-unknown-unknown`; application guests build for `wasm32-wasip1`.                                                                                                                                                                                                                                                                                                     |
| Storage APIs    | Requires OPFS, `FileSystemFileHandle.createWritable`, and Web Locks on localhost/HTTPS.                                                                                                                                                                                                                                                                                                     |
| Disk format     | The selected disk is a 16 MiB MBR/LittleFS image local to the browser origin.                                                                                                                                                                                                                                                                                                               |
| Disk names      | `xila_drive.img` remains the legacy/default image. New disks use `xila_YYYY-MM-DD.img` with numeric collision suffixes.                                                                                                                                                                                                                                                                     |
| Disk management | The Xila Help panel lists, creates, selects, and removes managed images. The selected image is remembered for the origin.                                                                                                                                                                                                                                                                   |
| Disk ownership  | One Xila tab can hold a given disk's lifetime Web Lock. Different tabs may use different disks.                                                                                                                                                                                                                                                                                             |
| Disk switching  | New writes stop, pending changes are saved, the current lock is released, and the page reloads on the selected image. An image open elsewhere cannot be removed.                                                                                                                                                                                                                            |
| Saves           | At boot, every second when dirty, and on normal shutdown; synchronous flushes update the memory cache.                                                                                                                                                                                                                                                                                      |
| Memory          | 16 MiB selected-disk cache plus one temporary 16 MiB snapshot and browser buffering during saves. Guest/interpreter/graphics and embedded application bytes add further costs.                                                                                                                                                                                                              |
| Fresh account   | `administrator` with an empty password; created only for a fresh disk. Existing accounts are restored.                                                                                                                                                                                                                                                                                      |
| Bundled guests  | The native image includes Calculator, Clock, Pixel Painter, Synth, Weather, and Text Editor; the browser image includes Calculator, Clock, Pixel Painter, Synth, and Text Editor. Both seed application bundles under `/applications/bundles/<id>/` with `shortcut.json`. Matching guest artifacts are needed for image creation. Existing persistent disks are not upgraded automatically. |
| Guest upload    | No general upload mechanism. Other guests must already be present in the VFS.                                                                                                                                                                                                                                                                                                               |
| Networking      | No Xila network manager; HTTP uses Fetch under CORS/browser restrictions and does not expose raw sockets.                                                                                                                                                                                                                                                                                   |

Browser-managed storage can be evicted or lost; abrupt termination can lose changes since the last completed save. See [Browser storage](/explanation/browser-storage) for the durability model and [Manage browser disks](/how-to/reset-browser-storage) for user-facing disk operations.

## Related documentation

- [Build a guest](/how-to/build-guest) and [run a guest](/how-to/run-guest).
- [Run Calculator in the browser](/tutorials/browser).
- [Graphics bindings](./graphics-bindings), including the indexed-canvas helpers used by Pixel Painter.
- [Wasmi execution model](/explanation/architecture/executables/wasm).
