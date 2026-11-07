---
title: "Run Xila with Docker"
docType: how-to
description: Launch Xila's CLI shell or a WASI guest in a persistent headless Docker runtime.
---

The `ghcr.io/xila-project/xila-runtime` image **runs Xila**, instead of supplying build tools. You can open Xila's interactive command-line shell or run an existing `wasm32-wasip1` guest. This guide uses Docker on **Linux/amd64**. This image is headless: it does not provide the graphical desktop.

## Before you begin

- Install Docker and ensure you can start containers.
- Use a published image from [Platforms' runtime workflow](https://github.com/xila-project/platforms/actions/workflows/runtime.yml). `latest` follows `main`; pin a release or commit-SHA tag for reproducible runs.
- To run a guest, have a compatible `app.wasm` file compiled for `wasm32-wasip1`.

## 1. Pull the runtime and prepare persistent state

From a **host terminal**:

```sh
docker pull ghcr.io/xila-project/xila-runtime:latest
docker volume create xila-state
```

The named volume persists `/var/lib/xila/drive.img` between container runs. On its first start, Xila imports the image's reference filesystem; subsequent starts reuse the existing data and credentials. The image runs as non-root UID/GID **10001**.

## 2. Launch the interactive Xila shell

```sh
docker run --rm -it --network none --read-only \
  --tmpfs /tmp:rw,noexec,nosuid,size=16m \
  --mount type=volume,src=xila-state,dst=/var/lib/xila \
  ghcr.io/xila-project/xila-runtime:latest
```

By default the image executes `xila-runtime shell --network=none`: this opens **Xila's own command-line shell**, not the container's Linux `bash`. On a fresh installation, log in as **administrator** with an empty password. Try `pwd` or `echo hello`, then `exit` to quit.

You may append `shell --network=none` after the image name to select this mode explicitly. The `-it` flags attach an interactive terminal, while Docker's `--network none` disables container networking independently of Xila's network setting.

## 3. Run an existing WASI guest instead

From the **host working directory**, prepare the guest:

```sh
mkdir -p fixtures
cp /path/to/app.wasm fixtures/app.wasm
```

Launch the guest with the same persistent disk:

```sh
docker run --rm --network none --read-only \
  --tmpfs /tmp:rw,noexec,nosuid,size=16m \
  --mount type=volume,src=xila-state,dst=/var/lib/xila \
  --mount "type=bind,src=$PWD/fixtures,dst=/mnt/xila/fixtures,readonly" \
  ghcr.io/xila-project/xila-runtime:latest run --network=none \
  --mount host=/mnt/xila/fixtures,xila=/fixtures,ro \
  -- /applications/executables/wasm /fixtures/app.wasm
```

The Docker bind mount exposes the file to the **runtime process**. The separate Xila `--mount` grants its VFS **read-only** access at `/fixtures`. Arguments after `app.wasm` go to the guest, and a nonzero guest exit status propagates to Docker.

## Check your result

In shell mode, confirm the login prompt works and a command executes inside Xila. In guest mode, inspect the application's output and exit code. The volume survives `--rm` and holds the existing disk; do not delete `xila-state` if it contains data you wish to keep.

For bind-mounted state instead of a named volume, grant write permission to UID/GID 10001. See the [headless runtime reference](/reference/container-runtime) for disk/seed paths, additional read-write mounts, and explicit guest environment options.
