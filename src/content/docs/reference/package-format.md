---
title: "Experimental package format"
docType: reference
description: Exact current experimental XPK/TAR layout, Miniserde manifest limits, signed message and registry entries.
---

:::caution[Experimental format]
This page describes the **implemented development prototype** in [`Xila-Project/package_manager`](https://github.com/xila-project/package_manager), not a stable installer wire protocol. **Do not assume the `.xpk` extension, manifest version 1, TAR framing or signature envelope will remain unchanged.** The final decision is tracked in [Core #402](https://github.com/xila-project/core/issues/402).
:::

## Archive entries

The host `xila-package-writer` emits a deterministic, uncompressed **USTAR** archive. Only ordinary files are allowed.

```text
calculator.xpk                 # experimental TAR profile
  .xila/manifest.json         # required FIRST entry, Miniserde JSON
  .xila/manifest.sig          # optional SECOND entry, raw 64-byte Ed25519 signature
  bin/calculator.wasm          # first manifest-declared payload
  share/icon.png               # second manifest-declared payload (if any)
```

The optional signature is absent in **unsigned development packages**. Payload entries must follow the manifest's exact list and order. The writer fixes metadata such as mtime and uid/gid to zero and uses mode `0644`. It never emits directories, symlinks, compressed content, PAX or GNU long-name extensions.

The reader uses `tar-no-std` 0.5.0's full-archive slice API. It rejects unexpected/nonordinary archive entries, missing or reordered payloads, size/hash mismatches and unsupported paths. This is **inspection**, not installation. Its API does not accept a streaming reader and requires the whole archive in memory.

## Package manifest (JSON, not contributor TOML)

```json
{
  "format_version": 1,
  "name": "xila.calculator",
  "version": "1.0.0",
  "target": "wasm32-wasip1",
  "minimum_xila_abi": 1,
  "capabilities": [],
  "files": [
    {
      "path": "bin/calculator.wasm",
      "size": 12345,
      "sha256": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
    }
  ]
}
```

This is a **shape example**, not a real digest or downloadable package. The `sha256` field is the lowercase hex digest of the **uncompressed logical file bytes**. There is currently no compression or alternate file type.

| Implemented field/constraint | Current bound or rule                                                                                                               |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Manifest encoded bytes       | Maximum **65,536 bytes**                                                                                                            |
| Number of payload files      | **1–128**                                                                                                                           |
| Total declared file lengths  | At most **256 MiB**                                                                                                                 |
| Payload path                 | Relative, nonempty, at most **200 bytes**, no `.`, `..`, empty segments, controls, backslashes, absolute paths or reserved `.xila/` |
| Writer TAR path              | ASCII only, at most **99 bytes** (stricter than manifest validation)                                                                |
| Package name                 | Dotted lowercase/digit/dash segments, maximum **96 bytes**                                                                          |
| Version                      | Nonempty, maximum **64 bytes**, ASCII alphanumeric plus `.`, `+`, `-`; **not** a complete SemVer enforcement policy                 |
| Target                       | Nonempty, maximum **64 bytes**, ASCII alphanumeric, dash or underscore                                                              |
| `minimum_xila_abi`           | Unsigned 32-bit field; no installer enforces it yet                                                                                 |
| Capabilities                 | At most **32** nonempty strings of at most **64 bytes**; requests **do not grant permissions**                                      |
| File hash                    | Exactly 64 lowercase hexadecimal characters                                                                                         |
| Signature                    | Optional raw **64-byte** Ed25519 signature stored as second entry                                                                   |

Manifest parsing is `no_std + alloc` using **Miniserde JSON**, not an allocation-free parser. The reader uses `alloc` for the message buffer when verifying signatures. Current validation provides **no dependency solver, path destination mapping, privilege policy, symlink installation or compression framing**.

## Exact provisional signing statement

For a canonical serialized manifest JSON byte array `M`, the implementation constructs:

```text
signed_message = ASCII("XILA-PACKAGE-MANIFEST-V1\0")
              || LE_U32(byte_length(M))
              || M
```

Here `\0` means **one zero byte** and `LE_U32` is a four-byte **little-endian** length. Ordinary, strict Ed25519 verification checks the signature over these **exact stored manifest bytes**. The reader must not reserialize the JSON before verification.

`xila-package-builder pack` accepts an optional **externally prepared** 64-byte signature file. For a signed package, it checks that the supplied JSON is in the writer's canonical serialization. The tool does **not** create or validate the signer's identity or key authorization. There is no production key-ID envelope, revocation or rollback protection. The exact statement remains provisional until #402 freezes it and provides independent golden vectors.

Use `xila_package_reader::inspect_unsigned(&archive)` only for untrusted structural inspection, **never as an install-time authorization check**. `verify_signed(&archive, &trusted_public_key)` authenticates the manifest and then checks file hashes, but the caller must have established key trust separately.

## Registry entries and developer keys

The [`registry` repository](https://github.com/xila-project/registry) holds metadata only, served at `registry.xila.dev`:

```text
keys/developers/<id>.json                        # developer (publisher) key
packages/<identifier, dots as />/<version>.json  # registry entry, e.g. packages/xila/clock/0.1.0.json
```

A **registry entry** ([schema](https://github.com/xila-project/package_manager/blob/main/schemas/registry-entry.schema.json)) pins one released archive by HTTPS `url`, lowercase `sha256` and `size`, names its `publisher`, and copies `name`, `version`, `target`, `minimum_xila_abi`, `capabilities`, `display_name` and `metadata` from the archive's signed manifest. It is generated with `xila-package registry entry` from the signed archive and must stay in its canonical form; published entries are immutable.

A **developer key** ([schema](https://github.com/xila-project/package_manager/blob/main/schemas/developer-key.schema.json)) holds `id`, `author`, `algorithm` (`ed25519`), the canonical base64 `public_key` and the `namespaces` it may publish: the first label of an identifier (`xila` for `xila.clock`).

`xila-package registry check <root> [--archives <dir>]` validates a registry checkout: keys, entry placement and canonical form, known publishers and namespace authorization, and, with downloaded archives, each archive's size, SHA-256, signature and copied fields. Entries are not yet signed by a repository key, and there is no signed index with expiry; see the [registry architecture](https://github.com/xila-project/registry/blob/main/docs/architecture.md).

## Source references

- [Manifest source](https://github.com/xila-project/package_manager/blob/main/crates/manifest/src/lib.rs) - fields, limits, encoding, provisional signed statement.
- [TAR reader source](https://github.com/xila-project/package_manager/blob/main/crates/reader/src/lib.rs) - `inspect_unsigned` and `verify_signed`.
- [TAR writer source](https://github.com/xila-project/package_manager/blob/main/crates/writer/src/lib.rs) - deterministic USTAR writer.
- [Container architecture proposal](https://github.com/xila-project/package_manager/blob/main/docs/package-container-proposal.md) - open alternatives and requirements.
- [Registry commands](https://github.com/xila-project/package_manager/blob/main/crates/builder/src/registry.rs) - `registry entry`, `verify` and `check`.
- [Registry architecture](https://github.com/xila-project/registry/blob/main/docs/architecture.md) - planned authenticated publication model.
