---
title: "Package an application"
docType: how-to
description: "Build, sign and verify a Xila application package."
---

This guide shows how to create a signed package with the desktop `xila-package` tool.

## Before you begin

- Install the [package manager tool](https://github.com/xila-project/package_manager/tree/main/crates/builder) and prepare a compiled WebAssembly (Wasm) guest application.
- Have a developer signing key: a raw 32-byte Ed25519 seed and its public key. Keep the seed outside the source directory.

## Steps

1. In a host shell in your working directory, initialize a source folder:

   ```sh
   xila-package bundle init ./weather community.weather 1.0.0 wasm32-wasip1 1 --entrypoint executables/weather.wasm --display-name Weather --icon resources/icon.png
   ```

2. Place the compiled guest at `weather/executables/weather.wasm` and its icon at `weather/resources/icon.png`. Review `weather/xila-package.json`.
3. In the same host shell, build and sign the bundle:

   ```sh
   xila-package bundle build ./weather ./Weather.app --signing-key ./signing/private.seed
   ```

4. In the same host shell, verify the bundle and make the package:

   ```sh
   xila-package bundle verify ./Weather.app --public-key ./signing/public.key
   xila-package bundle archive ./Weather.app ./Weather.xpk
   ```

## Verify the result

The commands succeed and `Weather.xpk` exists. Verification with the trusted public key checks the signed manifest and inventory.

## Related

- [Experimental package format](/reference/package-format/)
- [Submit a package](/how-to/submit-package/)
