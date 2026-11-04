---
layout: doc
docType: explanation
description: "The WASM executable loads guest programs from Xila's VFS and runs them using Wasmi 2 with cooperative, resumable execution."
---

# WASM (executable)

The WASM executable loads guest programs from Xila's VFS and runs them using Wasmi 2. Both the native and browser examples mount it at `/applications/executables/wasm`.

## Role and feature selection

The package serves two sides of the boundary: a host interpreter integrated with Xila's executable services, and helpers compiled into guest applications. The host role also applies when Xila runs in a browser. Optional graphics connects the interpreter to the context's graphics capability.

The [runtime reference](/reference/wasm-runtime#cargo-features) defines the exact Cargo feature sets and defaults.

## Launching a guest

The launcher reads a guest from the VFS and invokes its typed, no-argument `_start: () -> ()` export. Installation and shortcut discovery are separate from execution. Path handling belongs to the caller and the VFS; the loader does not implement the old `Current_directory` resolution step.

Follow [Run a guest](/how-to/run-guest) for the procedure and [command syntax](/reference/wasm-runtime#command-syntax) for its options and required exports.

## Startup and lifecycle

1. Parse the guest path, `--stack-size`, and `--instruction-limit`, separating optional guest arguments after `--`.
2. Read bytes through the context-provided VFS and current task identifier.
3. Create a fresh Wasmi engine, module, linker, and store; there is no globally cached runtime.
4. Eagerly translate module functions before execution so fuel exhaustion cannot suspend lazy callee translation.
5. Bind standard streams, task environment, and the root directory preopen to the per-execution WASI context.
6. Register WASI and optional graphics imports, instantiate, and call `_start` resumably.
7. Yield on fuel exhaustion or supported suspension calls; report exit/trap errors and release VM-owned graphics objects.

## Runtime integration points

- `ExecutableTrait`, `ExecutableContext`, and `Standard::context` for launch capabilities.
- VFS `get_statistics` and `File::read_from_path` for module loading.
- Wasmi `Engine`, `Module`, `Linker`, and `Store<GlobalStore>` for guest execution.
- Local WASI descriptor tables for stdio and paths; guest imports do not use the removed `abi_context` crate.
- Optional checked graphics adapters, including Xila-specific pointer/canvas helpers, use explicit per-VM graphics state rather than guest pointers to host objects.

## Failure semantics and limits

- Argument, file-kind, compilation, instantiation, missing-export, and execution failures are reported on stderr and return a nonzero executable result.
- WASI `proc_exit(0)` succeeds; nonzero exit codes become runtime errors.
- Wasmi 2 meters input Wasm operators. Fuel is replenished after cooperative yielding, so its quantum controls scheduling rather than a total instruction budget and is not a stable wall-time slice.
- WASI coverage is partial; `poll_oneoff` supports clocks, not file-descriptor readiness. Start-section suspension is unsupported.
- Graphical guests need bindings compatible with the host's LVGL revision/configuration and supported call subset.

The native and browser examples now start from pre-seeded LittleFS images containing bundled WASI guests such as Calculator, Clock, Pixel Painter, Synth, Weather, and Text Editor. New images contain matching `/applications/bundles/<id>/` directories with `shortcut.json` and guest binaries; existing persistent images are preserved without automatic upgrades. The browser persists its selected live disk in OPFS. See [Browser tutorial](/tutorials/browser) for the build flow, [Browser storage](/explanation/browser-storage) for persistence, and [the headless container runtime](/reference/container-runtime) for running WASI without graphics or networking.

Exact option defaults and constraints live in the [runtime reference](/reference/wasm-runtime#execution-limits).

## Runner command and guest entrypoint contract

The native `WasmExecutable` implements `ExecutableTrait` and normally runs as the mounted `/applications/executables/wasm` program. Its arguments are parsed by `getargs`:

```text
/applications/executables/wasm /applications/bundles/xila.calculator/executables/calculator.wasm
/applications/executables/wasm --instruction-limit 50000 /applications/bundles/xila.clock/executables/clock.wasm
/applications/executables/wasm /applications/bundles/xila.calculator/executables/calculator.wasm -- first-argument --guest-option
```

The runner invokes only `_start: () -> ()`. A literal `--` separates runner options from guest arguments, which become WASI `argv` after the guest's path. The `@bundle/` prefix is expanded by the graphical Shell when launching a shortcut, **not** by the Wasm runner itself. `--help`/`--version` exit successfully; parsing errors return nonzero status.

`--instruction-limit` defaults to **100,000** and must be a nonzero `u32`. It is a **cooperative instruction quantum**, not a total instruction budget or an execution timeout. `--stack-size` defaults to 4096 but is currently a **legacy parsed option with no effect**: the code explicitly discards its value and Wasmi manages stack allocation.

## Per-execution ownership and WASI descriptors

Each invocation creates a new Wasmi engine/module/linker/store; there is no shared module cache. The engine enables fuel consumption and **eager** translation, avoiding suspended execution during lazy callee compilation. The store embeds `GlobalStore` with a dedicated `WasiContext`, optional `GraphicsState`, the caller's `ExecutableContext`, and pending suspension state.

The guest receives `fd 0/1/2` from duplicated `Standard` streams. If opening the VFS root directory succeeds, it is preopened as `fd 3` with name `/`, and the next allocated descriptor is 4; otherwise the preopen is absent. Descriptor IDs increase monotonically and are not reused by `WasiContext` until a new execution.

The host registers a subset of WASI Preview 1: process/exit, environment/args, file/directory/path I/O, time, random, scheduling and clock-only `poll_oneoff`. This is **not** a complete POSIX or WASI implementation: arbitrary FD readiness, start-section yielding and unrestricted native graphics pointers remain unsupported.

## Cooperative suspension, time and exit values

`execution::run` resumes a typed Wasmi call. On `OutOfFuel`, it yields to the Task scheduler, replenishes fuel to at least the amount needed by a single bulk operation, then resumes. Supported host suspension includes a yield import and clock-poll events; a pending clock poll sleeps in chunks capped at **50 ms** to check for shutdown and deadlines.

The monotonic WASI clock is sourced from `embassy_time::Instant`, **not** by subtracting Xila's adjustable signed UTC clock. This prevents wall-clock corrections from shifting monotonic poll deadlines. The system's UTC clock is adjustable and can be unsynchronized; invalid realtime returns a WASI clock error without aborting monotonic polling. The monotonic source is the same Embassy epoch used by the executor and is independent of wall-clock corrections.

`proc_exit(0)` succeeds; positive guest exit statuses propagate, clamped to **1–255** at the external executable boundary. Module loading/validation, missing exports, instantiation and traps produce runtime errors. VM-local graphics state is reclaimed on teardown, including trap paths.

## Build modes and integration testing

Cargo features distinguish `host` (Wasmi), `guest` (guest-side imports), optional `graphics`, `memory_32`/`memory_64`, and `c_bindings`/`default_guest`. The host runs on both native targets and inside the browser's **host** environment; being in the browser does not make host Wasmi code a guest.

Graphics calls are versioned with the LVGL configuration used to generate the bindings. Guest applications and reference disks must be rebuilt with matching host-side bindings after ABI changes.

### Source references

- <CodeReference repo="applications" path="executables/wasm/src/host/main.rs" /> — options, modules and descriptor setup.
- <CodeReference repo="applications" path="executables/wasm/src/host/execution.rs" /> — resumable calls, fuel and clock polling.
- <CodeReference repo="applications" path="executables/wasm/src/host/wasi/context.rs" /> — descriptor table and ownership.
- <CodeReference repo="applications" path="executables/wasm/src/host/wasi/register.rs" /> — implemented WASI imports.
- <CodeReference repo="applications" path="executables/wasm/Cargo.toml" /> — host/guest/graphics feature gates.
- [Graphics bindings](/explanation/architecture/executables/bindings) — checked guest UI boundary.

## References

- <HostReference repo="applications" crate="wasm" /> — host-side interpreter and integration APIs.
- <GuestReference repo="applications" crate="wasm" /> — guest-facing WebAssembly helper APIs.

- <CodeReference repo="applications" path="executables/wasm" />
- [Graphics bindings](/reference/graphics-bindings)
- [Bindings](/explanation/architecture/executables/bindings)
- [Executable runtime crate](/explanation/architecture/libraries/executable)
