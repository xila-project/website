---
layout: doc
docType: explanation
description: Understand how Xila fits together, why its major boundaries exist, and what trade-offs they create.
---

# Explanation

Explanation is where Xila's architecture is made understandable: what the main parts are, how they relate, and why the system is shaped this way.

If you are new to Xila, start with the [architecture overview](./architecture/). It gives you the mental model that the more detailed subsystem, library, driver, runtime, and storage pages build on.

## Start with the system

- [Architecture overview](./architecture/) explains how executables, Xila services, shared contracts, drivers, and target platforms fit together.
- [Component map](./architecture/components) helps you locate a subsystem, library, driver, or executable by the role it plays in that system.
- [Subsystems](./architecture/subsystems/) explains runtime-owned services such as graphics, networking, tasks, time, and users.
- [Libraries](./architecture/libraries/) documents reusable contracts and implementations.

## Follow the question you have

**How can the same Xila code run on an MCU, a native host, and in a browser?**

Read [development environments and targets](./development-environments) for the relationship between toolchains, validation targets, and platform ownership.

**How will application packages be built, published and installed?**

Read [package management architecture](./package-management) for the separation of portable Rust tooling, the static package registry and planned on-device trust/installer integration.

**How does the browser version keep a persistent disk?**

Read [browser storage](./browser-storage) for the relationship between OPFS, the in-memory disk image, autosave, and durability.

**What happens when Xila executes a WebAssembly guest?**

Read the [WASM runtime](./architecture/executables/wasm) for Wasmi integration, WASI imports, and cooperative execution.

**How do guest graphics calls cross into the host runtime?**

Read [graphics bindings](./architecture/executables/bindings) for the ownership and memory boundary between guest handles and host objects.

## When your question changes

Explanation is intentionally not a task guide or an API catalogue. When you know _why_ a part of Xila works the way it does and want to do something with it, continue with the [how-to guides](/how-to/). When you need an exact command, limit, symbol, or API contract, use the [reference section](/reference/).
