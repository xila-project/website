---
title: "Verification"
docType: explanation
description: "Understand the shared SHA-256 and Ed25519 verification library."
---

The package manager's `xila-package-verification` library supplies `no_std` SHA-256 and Ed25519 primitives for checking content and signatures.

## Context

Package tools and the Applications installer need the same cryptographic checks without depending on a host file system. The library supplies primitives; its callers decide which key to trust and what bytes to verify.

## How it works

A content verifier incrementally hashes bytes and checks their expected length and digest. A public key verifies an Ed25519 signature over a message. Package manifest and reader code define the signed message and check the inventory using these primitives.

## Design choices and trade-offs

The library supports incremental hashing and `no_std` consumers. Cryptographic validity alone does not authorize a developer key; repository metadata or a directly trusted key supplies that decision.

## API reference

- [Hash verification](https://github.com/xila-project/package_manager/blob/main/crates/verification/src/hash.rs) — incremental SHA-256 and length checks.
- [Signature verification](https://github.com/xila-project/package_manager/blob/main/crates/verification/src/signature.rs) — public keys and strict Ed25519 verification.
- [Streaming package reader](https://github.com/xila-project/package_manager/blob/main/crates/reader/src/stream.rs) — package verification consumer.

## Related

- [Package management](/explanation/package-management/)
- [Experimental package format](/reference/package-format/)
