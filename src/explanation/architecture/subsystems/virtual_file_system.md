---
layout: doc
docType: explanation
description: Understand the VFS as Xila's shared path namespace, access-policy layer, and router to mounted file systems, devices, and pipes.
---

# Virtual file system

Xila has several things that can look like files: persistent storage, character devices, block devices, pipes, and control endpoints such as network interfaces. The Virtual File System (VFS) gives all of them one path namespace and one place to apply access policy.

The VFS does **not** define how LittleFS stores blocks or how a device implements IO. Its job is to decide _what owns this path?_, _is this task allowed to access it?_, and _where should the operation go next?_

## Mental model

Think of the <HostReference crate="virtual_file_system" kind="struct" symbol="VirtualFileSystem" /> as a router for paths:

```mermaid
flowchart LR
    Caller[Executable or module] -->|path operation| VFS[VFS<br/>resolve + authorize]
    VFS -->|file path| FS[Mounted file system]
    VFS -->|device path| Device[Mounted device]
    VFS -->|pipe| Pipe[Pipe endpoint]
    FS --> Storage[Storage backend]
```

The VFS owns the **namespace and policy**, while the mounted backend owns the concrete storage/device behavior. That separation is what allows a caller to use the same file-facing abstractions regardless of whether `/data/example` lives in LittleFS or `/devices/network/wlan0` represents a control device.

## Following one path through the system

Suppose an executable opens `/data/config.json` through <HostReference crate="virtual_file_system" kind="struct" symbol="File" member="method.open">`File::open`</HostReference>. It does not talk directly to the root file system.

The VFS first associates the request with the supplied Xila task, derives user/group and time context from its Task, Users, and Time dependencies, and resolves which mount owns the path. It then checks the relevant permissions before translating the absolute path into the backend-relative path understood by that mount.

Only after those namespace and policy decisions does the request reach the mounted backend through the <HostReference crate="file_system" kind="trait" symbol="FileSystemOperations" /> contract.

```mermaid
sequenceDiagram
    participant App as Executable / module
    participant VFS as Virtual file system
    participant Policy as Task + users + permissions
    participant Mount as Resolved mount
    participant Backend as File system / device

    App->>VFS: open /data/config.json
    VFS->>Policy: resolve caller context and permissions
    Policy-->>VFS: authorized context
    VFS->>Mount: longest matching mount
    Mount->>Backend: backend-relative operation
    Backend-->>VFS: item / status
    VFS-->>App: typed File handle
```

The same routing idea applies to directories and devices. The difference is the kind of mounted endpoint and the operations supported after resolution, not a separate namespace implementation.

## Why Task, Users, and Time are dependencies

The namespace alone is not enough to behave like a system file layer.

[Task](/explanation/architecture/subsystems/task) tells the VFS which logical task initiated an operation and therefore which user/group context applies. [Users](/explanation/architecture/subsystems/users) answers membership questions used during permission checks. [Time](/explanation/architecture/subsystems/time) provides the timestamps written during create/access/modify operations.

This is why a `VirtualFileSystem` is explicitly constructed with references to those managers. The VFS centralizes filesystem policy without reimplementing identity or time itself.

## Backends share contracts, not implementations

Regular file-system backends implement <HostReference crate="file_system" kind="trait" symbol="FileSystemOperations" />. Character and block devices use the corresponding device contracts. Pipes are provided as in-memory endpoints by the VFS itself.

Because the VFS dispatches through these contracts, mounting a new backend does not require callers to learn a new path API. The backend can still have completely different on-disk or device semantics underneath that contract.

This division also defines a boundary: authentication/session policy lives above the VFS, while concrete block layout and wear-level/storage algorithms live below it.

## Mounts and handles have lifetimes

Resolving a path is not the end of the VFS's job. Open files/directories and mounted devices keep references into backend state, so the VFS tracks live use to prevent a normal unmount from invalidating active handles.

An unmount can therefore report a busy resource while references are alive. A forced unmount deliberately overrides some reference protections but **cannot** detach a mount that has visible nested mounts. Unmount preserves the underlying mount directory and its contents. Renaming or removing an active mount ancestor is rejected. Forced-detach resource reclamation remains future work.

For async file reads, writes, flushes and controls, an operation-specific `poll_fn` waits for the backend to signal progress; cancellation unregisters pending operations. The separate VFS `poll(...)` helper for synchronous metadata is a one-shot call and **does not** retry a busy backend. A file opened with the non-blocking state surfaces the busy condition instead of registering an asynchronous waiter.

## Under the hood

The current VFS is an explicitly owned <HostReference crate="virtual_file_system" kind="struct" symbol="VirtualFileSystem" />. `initialize(...)` constructs it from Task, Users, Time, and the root `FileSystemOperations` implementation.

Its mutable routing state is divided across `RwLock<CriticalSectionRawMutex, ...>` collections:

- `file_systems: Vec<InternalFileSystem>` stores mount points, backend pointers, and reference counts;
- a character-device `BTreeMap` maps inodes to mounted character endpoints;
- a block-device `BTreeMap` does the same for block endpoints;
- a pipe `BTreeMap` tracks in-memory pipe endpoints.

Mount resolution selects the file system whose mount point owns the requested path and forwards a relative path to that backend. Typed `File` and `Directory` wrappers retain the VFS/backend context needed for later operations rather than resolving the absolute path again for every byte transferred.

```mermaid
flowchart LR
    VFS[VirtualFileSystem]
    Mounts[(mounted file systems)]
    Char[(character devices)]
    Block[(block devices)]
    Pipes[(pipes)]
    Handle[File / Directory handle]

    VFS --> Mounts
    VFS --> Char
    VFS --> Block
    VFS --> Pipes
    Mounts --> Handle
    Char --> Handle
    Pipes --> Handle
```

Those collection choices, lock boundaries, inode maps, and reference-count strategy are current implementation details. The stable architectural idea is the shared namespace, policy gate, mount dispatch, and typed handle semantics.

## Default namespace shape

`create_default_hierarchy(...)` gives a newly assembled runtime a conventional set of locations. The exact tree is useful because these paths communicate intent across modules, but it should be read as a namespace convention rather than a statement about one physical disk:

- `/system` — system-owned accounts (`/system/accounts/users` and `/system/accounts/groups`), executables, libraries and services;
- `/configuration` — configuration for system, applications and shared use;
- `/applications` — application executables, libraries and installed bundle directories (`/applications/bundles/<id>/`);
- `/data` — system and application data, with logs under `/data/system/logs`;
- `/devices` — device endpoints organized by kind (including `/devices/network` and `/devices/standard_io`);
- `/users` — per-user home data;
- `/temporary` — caches and sessions intended for cleanup across runtime startup.

The root backend provides the base tree, while additional file systems and devices can be mounted into that namespace later. `create_default_hierarchy` creates directories and applies baseline permissions; it does **not** itself implement automatic temporary-directory cleanup or log rotation.

Core does not assign an identity or an access-control exception to individual applications. Access under `/data/applications/*` and `/configuration/applications/*` follows ordinary POSIX-style UID/GID/mode checks; the default global application data/configuration directories are root-only. Per-user `/users/<uid>/applications/*` directories (including `configuration`, `data` and `cache`) are provisioned with mode `0700`. These permissions isolate **users and groups**, not applications running under the **same UID**. See <CodeReference path="subsystems/virtual_file_system/src/hierarchy.rs" /> and <CodeReference path="subsystems/virtual_file_system/src/home.rs" />.

## Symbolic links and resolution

The VFS now supports symbolic links (Core #479). A link stores a target path and can point to an absent entry or cross mount boundaries. Path resolution follows intermediate links and, according to the operation, can either follow or preserve the final link. Reading a link returns its stored target without following it; removing or renaming a link acts on the link itself. Resolution and link creation remain subject to VFS path validation and permissions.

Where a backend persists `Kind::SymbolicLink` metadata, the VFS writes the target into a staged file and publishes the typed entry by rename. Backends without that metadata capability can use their native symlink interface; backend support is not universal. This does **not** make the current WASI preopen implementation a security boundary against symlink traversal: Core #479 explicitly leaves WASI symlink-aware confinement and `path_open`/`readlink` semantics as follow-up work. Do not assume untrusted WASI guests are confined by lexical path checks alone.

## Permission and metadata hardening (Core #523 and #527)

Permission checks select **owner else group else others**, rather than falling back from a denied matching class to more permissive unrelated classes. Path ownership changes are **root-only**; ordinary owners (and root) can change mode under the existing policy. Path convenience reads fill the requested buffer or report early EOF; writes complete or return an error on zero progress. Zero-capacity named pipes are rejected before creating entries.

Open file descriptors retain an opaque manager/task/generation authority, and metadata changes check **current** task credentials. Task exit or numeric task-ID reuse invalidates that authority. This is a guard against API misuse by kernel code, **not** isolation among mutually trusted native components. Descriptor ownership changes are unsupported for root and denied for ordinary users; read-only handles cannot change stored metadata. LittleFS checks native object identity when coordinating independent handle metadata, and rejects stale cached state rather than authorizing a mutation against a replaced file. Renaming a source file with live LittleFS opens is rejected until those opens close.

Synchronous descriptor mutations try the namespace and task locks once and may report `RessourceBusy`. The original VFS polling I/O contract is preserved. The x86_64 file-handle struct grew from 80 to 104 bytes in a measured fixture; this is **not** an MCU total-memory result.

Unresolved concerns remain under Core #521: WASI symlink-aware preopen containment, detach reclamation, close/Drop failures, mount-table contention, append/durability semantics, directory statistics and target-specific performance. Do not assume lexical path checks securely contain untrusted WASI guests.

See <CodeReference path="subsystems/virtual_file_system/README.md" /> and <CodeReference path="libraries/little_fs/src/open_metadata.rs" />.

## Failure and policy boundaries

A path can fail before the backend is called: the path may be invalid, its mount may not resolve, required metadata may be absent, or permissions may reject the operation. Backend errors then enter the VFS error domain after dispatch.

This distinction is useful when debugging: `PermissionDenied` is a policy decision made before backend execution, while a backend `NotFound`/IO failure describes what happened after routing to the selected implementation.

Device cleanup helpers intentionally tolerate stale device identifiers in expected cleanup cases, making repeated startup cleanup more idempotent. By contrast, live-reference protection on unmount is deliberately strict unless force is requested.

## Async operation semantics and cancellation

The current VFS explicitly distinguishes operations that can be polled from synchronous metadata calls:

- `File::read`, `File::write`, `File::flush` and typed `File::control` use `core::future::poll_fn` through the operation layer in blocking mode. A device can return `Pending` and arrange wake-up.
- Dropping one of those futures drops an operation guard that calls `cancel_operation`, detaching its device registration. This is important when a guest exits, cancels work or abandons an async file call.
- Files opened with `StateFlags::NonBlocking` instead issue synchronous attempts and return available data or busy/error directly.
- `virtual_file_system::poll(operation)` is currently a **one-shot call**, not a busy-retry loop. It runs the supplied closure exactly once and returns its result. Metadata operations using it can surface `RessourceBusy` immediately.

### Example: read a named file

```rust
let mut file = virtual_file_system::File::open(
    vfs,
    task_id,
    file_system::Path::from_str("/data/config.json"),
    file_system::Flags::new(file_system::AccessFlags::Read, None, None),
)
.await?;
let mut bytes = [0u8; 256];
let count = file.read(&mut bytes).await?;
file.close(vfs).await?;
```

This is an integration example: `vfs` and `task_id` come from the assembled runtime, and errors must be handled for absent files, permissions or unsupported operations. Like other reads, the result may be shorter than the supplied buffer.

## Limitations and trade-offs

Centralizing namespace and permission policy gives all callers consistent semantics, but it also means shared VFS metadata locks can become contention points under heavy parallel access.

Symbolic links are implemented at the VFS level but their backend support and WASI translation/confinement semantics remain incomplete. Advisory file locking and some C/ABI filesystem entry points (including timestamps and truncate) also remain incomplete. Internal Rust VFS capabilities should not be confused with the guest ABI.

New file systems can be integrated by implementing the file-system contracts and mounting them; new devices can implement the direct character/block contracts and be placed at namespace paths. Callers should depend on those semantics rather than on internal collection types or initialization helpers.

## Explore further

- <HostReference crate="virtual_file_system" /> — complete host-side VFS Rustdoc.
- <HostReference crate="virtual_file_system" kind="struct" symbol="VirtualFileSystem" /> — namespace and mount manager API.
- <HostReference crate="virtual_file_system" kind="struct" symbol="File" /> — async file handle API.
- <HostReference crate="file_system" kind="trait" symbol="FileSystemOperations" /> — backend contract consumed by the VFS.
- <CodeReference path="subsystems/virtual_file_system/src/file_system/mod.rs" /> — mount and path routing.
- <CodeReference path="subsystems/virtual_file_system/src/file.rs" /> — async file API.
- <CodeReference path="subsystems/virtual_file_system/src/operation.rs" /> — poll and cancellation guard.
- <CodeReference path="subsystems/virtual_file_system/src/lib.rs" /> — one-shot metadata poll.
- <CodeReference path="subsystems/virtual_file_system/src/hierarchy.rs" /> — actual default directory tree.
- <CodeReference path="subsystems/virtual_file_system/src/file_system/mod.rs" /> — symlink creation, lookup and readback.
- [File-system crate](/explanation/architecture/libraries/file_system) — shared storage/device contracts beneath the VFS.
- [Network](/explanation/architecture/subsystems/network) — an example of a module exposing control devices through the namespace.
- [Task](/explanation/architecture/subsystems/task) and [Users](/explanation/architecture/subsystems/users) — identity context used by VFS policy.
