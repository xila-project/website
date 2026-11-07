---
title: "Verification"
docType: explanation
description: Shared no_std SHA-256 and strict Ed25519 primitives, the Core Git pin, feature gates and security boundaries.
---

Xila uses reusable **`no_std` SHA-256 and strict Ed25519** primitives for signed firmware simulation and package-format prototyping. The canonical implementation was **moved** from Core to [`Xila-Project/package_manager/crates/verification`](https://github.com/xila-project/package_manager/tree/main/crates/verification) (package-manager #3, Core #537). Core **deleted** its former `libraries/verification` sources; older documentation referencing that directory is obsolete.

This is a **cryptographic primitive crate**, not a package installer, trust store, signature-policy engine or runtime authorization boundary. See the [package ecosystem architecture](/explanation/package-management).

## Shared source and version pin

The current shared workspace's Cargo package is **`xila-package-verification`**, with Rust library import `xila_package_verification`. Core #537 pins an **earlier immutable Git commit** `f5e3f0b323a79a80d106ce2b88b77bfa8667d71b`, where the Cargo package is still named `verification`, retaining Core's existing `use verification::…` source imports.

**Do not casually update Core's Git pin to `package_manager/main`:** the shared package was later renamed. Upgrading it requires the Cargo dependency alias `verification = { package = "xila-package-verification", git = "…", rev = "…" }`, updating Core's and the standalone probe's lockfiles, and running native/WASM/Cortex-M/firmware regressions. Keep Git dependencies fixed to reviewed immutable revisions rather than following a moving branch.

See [Core's migration notes](https://github.com/xila-project/core/blob/main/docs/shared-verification.md) and the [shared verification README](https://github.com/xila-project/package_manager/blob/main/crates/verification/README.md).

## APIs and feature boundaries

The default `sha256` feature provides:

- `Sha256Verifier::new()`, `update(&[u8])`, and consuming `finalize()` for streaming SHA-256.
- `ContentVerifier::new(expected_length, expected_digest)`, `update` and `verify` to enforce both the **exact logical input length** and the **full 32-byte expected digest**.

SHA-256 accepts at most `2^61 - 1` bytes; errors poison a verifier, and short streams cannot be finalized successfully. Bytes are supplied by the caller, with **no package/full-file buffer allocation**.

Optional `ed25519` exposes `PublicKey::from_bytes(&[u8;32])` and strict ordinary Ed25519 `verify(message, &[u8;64])`. Invalid/noncanonical/weak key encodings and malformed signatures fail. The implementation uses Dalek's **strict** verification. This is **not Ed25519ph**, and signing only a SHA-256 digest is not interchangeable with signing the original message.

A no-feature build exports typed errors and results but neither hashing nor signing functionality. The shared crate is not a signer; private-key generation, identity, authorization, certificate/TLS policy and repository key rotation are outside it.

### Example with the shared Cargo crate

```rust
use xila_package_verification::ContentVerifier;

let expected_digest: [u8; 32] = [
    0xba, 0x78, 0x16, 0xbf, 0x8f, 0x01, 0xcf, 0xea,
    0x41, 0x41, 0x40, 0xde, 0x5d, 0xae, 0x22, 0x23,
    0xb0, 0x03, 0x61, 0xa3, 0x96, 0x17, 0x7a, 0x9c,
    0xb4, 0x10, 0xff, 0x61, 0xf2, 0x00, 0x15, 0xad,
];

let mut verifier = ContentVerifier::new(3, expected_digest)?;
verifier.update(b"a")?;
verifier.update(b"bc")?;
verifier.verify()?;
```

This proves the data matches an **expected** digest; the example cannot prove that the expected digest came from a trusted publisher. When using **Core's current pinned source revision**, the import is `verification::ContentVerifier` instead.

## Trust and package integration

A SHA-256 digest authenticates no one unless its expected value is itself trusted. Strict Ed25519 can authenticate a message under a **previously trusted** public key, but it cannot establish _which publishers_ are authorized, grant device capabilities, prove freshness or make installation atomic.

The [experimental package manifest](/reference/package-format#exact-provisional-signing-statement) constructs a versioned message over exact JSON bytes. The shared reader can verify that message with a key supplied by its caller, but the **publisher trust policy and on-device installer do not exist**. The [firmware update prototype](/explanation/architecture/libraries/firmware_update) uses the same algorithms with a **different simulator-specific signed image format**, not an application package.

Core issue [#402](https://github.com/xila-project/core/issues/402) owns canonical package bytes, [#491](https://github.com/xila-project/core/issues/491) owns trusted installation and [#495](https://github.com/xila-project/core/issues/495) owns execution enforcement. Keep those independent from the cryptographic algorithm implementation.

## Resource evidence and testing

The original x86_64 tests measured 120 bytes of SHA-256 state, 160 bytes of content-verifier state and 192 bytes of validated public-key state; individual verify paths made no heap allocation. These are **not** MCU peak-stack, total-RAM, linked-flash or runtime-energy measurements.

The shared crate retains the feature-matrix and allocation tests; Core retains separate no-allocator full-link probes for Cortex-M4 and Wasm. From the relevant repository roots:

```sh
# In Xila-Project/package_manager
mise run test
bash crates/verification/check.sh

# In Xila-Project/core, using its pinned shared revision
MISE_ENV=ci mise run ci:verification
```

Hardware timing, firmware security proofs and package trust still need separate validation.

## Source references

- [Shared verification source](https://github.com/xila-project/package_manager/tree/main/crates/verification/src).
- [Shared tests](https://github.com/xila-project/package_manager/tree/main/crates/verification/tests).
- [Core's pinned dependency](https://github.com/xila-project/core/blob/main/Cargo.toml).
- [Core verification link probes](https://github.com/xila-project/core/tree/main/tools/verification_probe).
- [Package management](/explanation/package-management) and [package format](/reference/package-format).
