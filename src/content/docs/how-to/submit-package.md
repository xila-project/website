---
title: "Submit a package"
docType: how-to
description: "Submit a signed package version to the Xila registry."
---

This guide shows how to submit a released package to the registry.

## Before you begin

- Build a signed package and retain its developer public key. See [Package an application](/how-to/package-application/).
- Publish the `.xpk` at an HTTPS release URL and install the [desktop tool](https://github.com/xila-project/package_manager/tree/main/crates/builder).
- Obtain a checkout of the [registry repository](https://github.com/xila-project/registry) and access to open a pull request.

## Steps

1. In a host shell in the registry repository root, generate the entry using your package, public key, publisher ID and release URL:

   ```sh
   xila-package registry entry ./Weather.xpk ./public.key community https://example.org/Weather.xpk packages/community/weather/1.0.0.json
   ```

2. If this is the publisher's first contribution, add its developer-key JSON under `keys/developers/`. Its namespaces must authorize the package identifier. Follow the [developer-key schema](https://github.com/xila-project/package_manager/blob/main/schemas/developer-key.schema.json).
3. In a host shell in the registry repository root, validate the checkout:

   ```sh
   bash tools/validate.sh
   ```

4. Open a pull request adding the entry and, if needed, the developer key. Published version entries cannot be modified or deleted; submit a new version instead.

## Verify the result

Validation checks entry placement, publisher authorization and downloaded package signatures, hashes and metadata. The pull request runs registry validation as well.

## Related

- [Package management](/explanation/package-management/)
- [Experimental package format](/reference/package-format/)
