---
title: "Component map"
docType: explanation
description: Find the runtime owner, reusable contract, driver or executable responsible for a Xila capability.
---

The Xila codebase separates four **roles** across Core, Applications and Platforms: [subsystems](/explanation/architecture/subsystems/), [libraries](/explanation/architecture/libraries/), [drivers](/explanation/architecture/drivers/) and [executables](/explanation/architecture/executables/). All are Rust crates; a Rust module is a language construct, not a separate architectural category.

## Where does a component belong?

- **Subsystem:** owns or coordinates an installed runtime capability with a lifecycle in the assembled Xila instance. The [VFS](/explanation/architecture/subsystems/virtual_file_system) owns the mounted namespace; [graphics](/explanation/architecture/subsystems/graphics) coordinates LVGL and input state.
- **Library:** defines reusable contracts, helpers or implementations that do not need a separate installation/lifecycle. [File system](/explanation/architecture/libraries/file_system) defines storage contracts; [LittleFS](/explanation/architecture/libraries/little_fs) implements them.
- **Driver:** adapts a generic capability to a particular platform, as in the [browser driver](/explanation/architecture/drivers/wasm) or [native driver](/explanation/architecture/drivers/native).
- **Executable:** consumes the assembled services as a program, launcher or guest runtime. The [WASM executable](/explanation/architecture/executables/wasm) owns [Wasmi execution within WASM](/explanation/architecture/executables/wasm) and [guest/host bindings](/explanation/architecture/executables/bindings).

Core retains portable subsystem and library crates, Applications owns official executables and Wasmi, and Platforms owns the concrete drivers and final runtime assembly. See the [repository architecture](/explanation/architecture/) for those boundaries.

Internal mutable state alone is not evidence of a subsystem: the key is **runtime ownership and assembly**. Some reusable executable helpers depend on subsystem interfaces without themselves becoming runtime services.

## Follow a request

A file request starts in an [executable](/explanation/architecture/executables/), reaches the [VFS](/explanation/architecture/subsystems/virtual_file_system), uses [file-system contracts](/explanation/architecture/libraries/file_system), then dispatches to a mounted [LittleFS](/explanation/architecture/libraries/little_fs) instance or device driver.

A WebAssembly guest uses the [WASM runtime and bindings](/explanation/architecture/executables/wasm) owned by the WASM executable. Those adapters pass operations to the same task/VFS/time/graphics subsystem managers used by native executables.

See the [architecture overview](/explanation/architecture/) for lifecycle, dependency and process-global integration details.
