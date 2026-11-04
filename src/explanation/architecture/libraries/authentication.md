---
layout: doc
docType: explanation
description: "This crate implements persistent account/group data handling and password verification flows used by the host runtime."
---

# Authentication

This crate implements persistent account/group data handling and password verification flows used by the host runtime.

## Role

- Owns persistence and transformation logic for users/groups (`/system/accounts/users`, `/system/accounts/groups`).
- Bridges runtime managers (`users`) with persistent storage (`virtual_file_system`) and device-backed entropy/hash operations.

## Boundaries

- In scope: reading/writing JSON user and group records, salted password hashing, authentication checks.
- Out of scope: session/task identity ownership (handled by [Users](/explanation/architecture/subsystems/users) + [Task](/explanation/architecture/subsystems/task)).
- In scope: coordinating with `/devices/random` and `/devices/hasher`; out of scope: implementing those devices.

## Internal structure

- `lib.rs`: crate entry points (`load_all_users_and_groups`) and canonical paths.
- `user.rs`: `User` model + account operations (`authenticate_user`, `create_user`, password/name mutation).
- `group.rs`: `Group` model + group creation and file loading helpers.
- `hash.rs`: salt generation and hash-device command sequence.
- `error.rs`: typed error mapping across file-system, users, and task flows.

## Runtime interaction

1. Caller builds `authentication::Context { virtual_file_system, task_manager, users_manager, task }` and passes a reference to authentication functions.
2. File reads/writes occur through `virtual_file_system::File` / `Directory` using the supplied VFS and task.
3. Salt bytes are read from `/devices/random/source`.
4. Password+salt bytes are written to `/devices/hasher` after `SET_ALGORITHM(HashAlgorithm::Sha512)`.
5. Results are propagated into `context.users_manager` when loading persistent records. Groups are loaded before users; restored primary-group membership is accepted.

For example, startup calls `authentication::load_all_users_and_groups(&context).await`. The browser example does this for an existing OPFS disk and creates the default administrator only for a fresh disk.

## Dependency model

- Internal: [File System](/explanation/architecture/libraries/file_system), [Device](/explanation/architecture/libraries/device), [Virtual file system](/explanation/architecture/subsystems/virtual_file_system), [Users](/explanation/architecture/subsystems/users), [Task](/explanation/architecture/subsystems/task).
- External: `miniserde` for JSON serialization/deserialization.

## Failure semantics

- Distinguishes open/read/parse/write failures for user/group files.
- Authentication mismatch returns `InvalidPassword` (not file or parse failure).
- During bulk load, malformed entries are skipped while iteration continues.

## Extension points

- Alternate hash strategies can be introduced by extending device commands and `hash.rs` flow.
- File schema can evolve through `User`/`Group` structs while keeping public function contracts stable.

## Contract vs implementation

- **Contract**: async user/group creation, authentication, and persistence APIs returning typed `authentication::Error`.
- **Current implementation**: JSON files under `/system/accounts/*`, salt from `/devices/random/source`, hashing through `/devices/hasher` with SHA-512 selection.

## Limitations and trade-offs

- Hash algorithm selection is currently hardwired to SHA-512 device command path.
- Storage format is file-per-user/group JSON; this is simple and inspectable but not optimized for large account sets.

## Public API and account lifecycle

Each operation receives `&authentication::Context`, which borrows the VFS, Task manager, Users manager and caller's `TaskIdentifier`. The core entrypoints are `load_all_users_and_groups`, `initialize_seeded`, `authenticate_user`, `create_user`, `create_group`, `change_user_password`, and `change_user_name`. Unlike a user-session manager, this library does not own a long-running authentication service.

```rust
let context = authentication::Context {
    virtual_file_system: vfs,
    task_manager,
    users_manager,
    task: task_id,
};
authentication::load_all_users_and_groups(&context).await?;
let user = authentication::authenticate_user(&context, "alice", password).await?;
```

The example assumes the referenced services exist, and the caller has permission to access the account files and hash device. Each user and group has a JSON file under `/system/accounts/users` or `/system/accounts/groups`. Bulk loading imports **groups before users** so primary group memberships can be restored. Malformed entries encountered while reading are skipped, but failures to add a successfully parsed record to the in-memory manager are propagated.

## First-install provisioning

`initialize_seeded(&context)` checks for `authentication::SEED_PENDING_CONTENT` (`b"xila-seed-v1\n"`) at `authentication::SEED_PENDING_PATH` (`/system/accounts/.seed-pending`), then loads existing groups and users. **An unmarked disk only loads records**; it does not create or replace the administrator account. When marked, it checks the expected administrator identifiers, provisions missing records through temporary files and rename, and removes the marker after success. Invalid or conflicting pre-existing identifiers are errors rather than a reason to overwrite credentials.

## Security and consistency boundaries

The current password construction concatenates password and salt, then asks `/devices/hasher` to produce a **SHA-512 digest**. Salt generation reads 16 bytes from `/devices/random` and maps each byte modulo 26 to a lowercase letter. It stores 16 characters, with **modulo bias and at most 26 choices per character**. This is a salted fast hash, **not** a modern deliberately slow, memory-hard password KDF such as Argon2id. Do not present it as equivalent to a hardened production password database.

`create_user` and `create_group` update the in-memory Users manager **before** writing the persistent file. If hashing or storage subsequently fails, the function has no comprehensive transactional rollback; runtime state and disk may disagree. User/group names are used in filesystem path construction, so provisioning code must enforce its own trusted naming policy.

The `users::Manager::check_credentials` placeholder is **not** used as password verification here: call `authenticate_user` when verifying a stored password. Reading malformed non-UTF-8 JSON currently reaches an `unwrap()` in some parsers, so input corruption can panic rather than returning a typed parsing error.

### Source and API references

- <CodeReference path="libraries/authentication/src/lib.rs" /> — Context and bulk loading.
- <CodeReference path="libraries/authentication/src/seed.rs" /> — guarded administrator provisioning.
- <CodeReference path="libraries/authentication/src/user.rs" /> — authentication and account mutation.
- <CodeReference path="libraries/authentication/src/hash.rs" /> — actual salt/hash construction.
- <HostReference crate="authentication" kind="struct" symbol="Context" /> — explicit capabilities.

## References

- <HostReference crate="authentication" />
- <CodeReference path="libraries/authentication" />
- [Users Module](/explanation/architecture/subsystems/users)
