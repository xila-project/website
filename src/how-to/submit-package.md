---
layout: doc
docType: how-to
description: Publish a released, signed package version to the Xila package registry.
---

# Submit a package to the registry

The [`xila-project/registry`](https://github.com/xila-project/registry) repository is Xila's package registry. It holds **metadata only**: one JSON **registry entry** per released version, and the developer keys allowed to publish. Archives stay where you release them. The registry is served as static files at [registry.xila.dev](https://registry.xila.dev/), for example [`packages/xila/clock/0.1.0.json`](https://registry.xila.dev/packages/xila/clock/0.1.0.json).

## 1. Release a signed archive

Build and sign the `.xpk` with the [native package builder](./package-application), or the reusable packaging workflow, and attach it to an immutable release of your project, for example on GitHub Releases. Never replace the bytes of a published version: release a new version instead.

To create a developer key:

```sh
xila-package key generate signing/private.seed signing/public.key
base64 -w0 signing/public.key   # value of public_key in your key file
```

Keep the seed private. In CI, provide it as a secret (`base64 -w0 signing/private.seed | gh secret set …`).

## 2. Generate the registry entry

Entries are **generated from the archive, never written by hand**:

```sh
xila-package registry entry app.xpk signing/public.key <publisher-id> \
  https://github.com/<owner>/<repo>/releases/download/<tag>/app.xpk \
  packages/<namespace>/<name>/<version>.json
```

The command verifies the archive's signature, records its URL, SHA-256 and size, and copies the identity, compatibility, capabilities, display name and metadata from the signed manifest. An entry lives at `packages/<identifier, dots as />/<version>.json`; for `community.weather` 1.0.0, that is `packages/community/weather/1.0.0.json`.

The first time you publish, also add `keys/developers/<publisher-id>.json` with your `id`, `author`, `algorithm` (`ed25519`), `public_key` and the `namespaces` you publish (the first label of your identifiers, `community` for `community.weather`). The `xila` namespace is reserved for official applications.

## 3. Validate locally

```sh
bash tools/validate.sh origin/main
```

The script installs `xila-package` at the registry's pinned revision and runs `xila-package registry check --archives`. It checks that every key and entry is valid and canonical, that each entry sits at its own path, that its publisher may publish its namespace, and that each downloaded archive matches its entry's size, SHA-256, signature and copied fields. It also refuses changes to already published entries. It needs `cargo`, `curl` and `jq`.

## 4. Open a pull request

CI runs the same script with read-only permissions; a maintainer reviews provenance, content and the publisher's identity. After merge, the entry is published at `registry.xila.dev`. Publication never builds or executes your code.

## Current limitations

Entries are not yet signed by the **repository key**, and there is no signed index with an expiry, so devices cannot yet authenticate the registry itself, only the developer signature on each archive. Installing from the registry on a device is not available yet. See [the package-management architecture](/explanation/package-management) and the [registry architecture](https://github.com/xila-project/registry/blob/main/docs/architecture.md).
