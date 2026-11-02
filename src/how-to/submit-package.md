---
layout: doc
docType: how-to
description: Contribute reviewed package metadata to the static, unsigned community registry preview.
---

# Submit a package declaration

The [`xila-project/registry`](https://github.com/xila-project/registry) repository provides a **development-only registry preview**, not an installable app store. You can submit metadata for an existing external release; publishing a declaration does **not** download, verify signatures, run, or install your code.

## 1. Publish the archive outside Git

Build the experimental archive with the [native package builder](./package-application). Host the immutable `.xpk` as an external release asset, for example on your project's GitHub Releases. Record its **real** HTTPS URL, file length and SHA-256; do not use the example's fake values. The current registry code validates the _shape_ of these fields but does not fetch artifacts to verify the actual bytes.

```sh
sha256sum /path/to/released.xpk
wc -c < /path/to/released.xpk
```

Keep the release artifact immutable. Publish a new package version for changed bytes rather than silently replacing an older artifact.

## 2. Add a versioned TOML declaration

Clone `registry`, then create:

```text
packages/<namespace>/<application>/<version>.toml
```

For `community.weather` version `1.0.0`, the location is `packages/community/weather/1.0.0.toml`. Start from [the example](https://github.com/xila-project/registry/blob/main/examples/weather-1.0.0.toml) and replace every placeholder:

```toml
schema = 1

[package]
name = "community.weather"
version = "1.0.0"
summary = "An example weather application"
license = "MIT"
source = "https://github.com/example/weather"

[[artifacts]]
target = "wasm32-wasip1"
minimum_xila_abi = 1
url = "https://github.com/example/weather/releases/download/v1.0.0/weather.xpk"
sha256 = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
size = 10240
```

**All URLs, hashes and sizes above are fictitious**; they must be replaced with the actual release details before submitting. This **TOML publication declaration** is not the internal **JSON package manifest** described in [Package format](/reference/package-format).

The identifier must match its directory path. Valid namespace and application components are lowercase words/digits with internal hyphens. Each package version must use compatible SemVer without build metadata. Artifact targets must be distinct within one declaration and the SHA-256 value must be lowercase hexadecimal. The `xila` namespace is reserved for first-party applications **by convention**, but no authenticated publisher policy enforces it yet.

## 3. Validate locally

The registry uses **Python 3.12+**, only standard-library modules, and no external services:

```sh
python -m unittest discover -s tests -v
python tools/registry.py validate
python tools/registry.py build
```

The output under `_site/v1` is a deterministic unsigned JSON preview. Each package has a direct descriptor such as `v1/packages/community/weather.json`; there is no full catalog, search server or dependency resolver. `v1/registry.json` contains only metadata including package count.

The registry starts with **zero live declarations**. Its `examples/weather-1.0.0.toml` is illustrative and is not published by the builder.

## 4. Open a pull request

A GitHub Actions workflow runs tests, validates the TOML, and uploads the generated preview for review. Maintainers should review **publisher identity, provenance, artifact permissions and release immutability**; successful CI checks are not a signature or security review. An optional GitHub Pages workflow runs on merged `main` (or manual dispatch) and publishes **unsigned** JSON.

To enable Pages, maintainers must select **Settings → Pages → Build and deployment → GitHub Actions**. Protect `main` with required checks and review before accepting external submissions. Publishing never compiles or executes submitted application code.

## Current limitations

No end-to-end authenticated publication chain, official keyring, stable signed index, repository search, package installation or on-device `pkg` CLI is available yet. A valid SHA-256 field inside unsigned JSON cannot establish trustworthy publisher identity. See [the package-management architecture](/explanation/package-management) for the separation between repository metadata, signed package contents and loader authorization.
