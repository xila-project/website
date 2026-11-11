---
title: "Experimental package format"
docType: reference
description: "Look up the Xila package archive, manifest, signatures and limits."
---

The experimental package format describes the `.xpk` archive and its signed inventory. The source of truth is the [manifest implementation](https://github.com/xila-project/package_manager/blob/main/crates/manifest/src/lib.rs) and its [JSON schema](https://github.com/xila-project/package_manager/blob/main/schemas/package-manifest.schema.json).

## Archive

The writer produces an uncompressed USTAR archive of ordinary files. `.xila/manifest.json` is first, followed by `.xila/manifest.sig` when signed, then payload files in manifest order. The writer uses zero timestamps and owner IDs and mode `0644`. The signature is 64 raw Ed25519 bytes. Unsigned packages omit it.

## Manifest

| Field                       | Meaning                                                                             |
| --------------------------- | ----------------------------------------------------------------------------------- |
| `$schema`                   | Optional editor schema URL.                                                         |
| `format_version`            | Format version, `1`.                                                                |
| `name`, `version`, `target` | Package identity and target.                                                        |
| `minimum_xila_abi`          | Minimum ABI as an unsigned 32-bit integer.                                          |
| `capabilities`              | Requested capability strings.                                                       |
| `files`                     | Ordered inventory of `path`, `size` and lowercase hexadecimal `sha256`.             |
| `application`               | Null or an object with `entrypoint`, `display_name`, `icon` and `show_in_launcher`. |
| `metadata`                  | Optional descriptive `summary`, `license`, `source` and `homepage`.                 |

A bundle-local entrypoint and nonempty icon must name inventory files. A system entrypoint can instead refer to an existing executable under `/system/executables/` or `/applications/executables/`.

## Signature

The developer signs the exact stored manifest bytes with Ed25519. The signed message is the ASCII domain `XILA-PACKAGE-MANIFEST-V1`, one zero byte, the manifest byte length as a little-endian 32-bit integer, and the manifest bytes. SHA-256 digests cover the payload bytes. See the [bundle implementation](https://github.com/xila-project/package_manager/blob/main/crates/bundle/src/lib.rs) and [streaming reader](https://github.com/xila-project/package_manager/blob/main/crates/reader/src/stream.rs).

## Limits

- A manifest is at most 65,536 bytes; it lists at most 128 files and 256 MiB total payload.
- Paths are relative, at most 200 bytes, and cannot contain empty, `.` or `..` segments, backslashes, control characters or the reserved `.xila/` prefix. The USTAR writer has a stricter 99-byte ASCII path limit.
- Names are at most 96 bytes; versions and targets are at most 64 bytes. There are at most 32 capabilities, each at most 64 bytes.
- The streaming reader consumes 512-byte TAR blocks. It retains bounded manifest data while processing payloads.

## Related

- [Package management](/explanation/package-management/)
- [Package an application](/how-to/package-application/)
