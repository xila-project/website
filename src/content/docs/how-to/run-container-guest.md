---
title: "Run Xila with Docker"
docType: how-to
description: Launch Xila's CLI shell or a WASI guest in a persistent headless Docker runtime.
---

This guide shows how to run the Xila shell or a WebAssembly (Wasm) guest in a headless Docker runtime on Linux/amd64.

## Before you begin

- Docker, installed so that you can start containers.
- A published image from [Platforms' runtime workflow](https://github.com/xila-project/platforms/actions/workflows/runtime.yml). The `latest` tag follows `main`. Pin a release tag or a commit-SHA tag for reproducible runs.
- To run a guest, a compatible `app.wasm` file compiled for `wasm32-wasip1`.

## Steps

### Prepare persistent state

1. In a host terminal, pull the image and create a volume:

   ```sh
   docker pull ghcr.io/xila-project/xila-runtime:latest
   docker volume create xila-state
   ```

The named volume persists `/var/lib/xila/drive.img` between container runs. On its first start, Xila imports the image's reference filesystem. The [seed-to-live-disk diagram](/tutorials/native/#create-a-reference-disk-image) in the native tutorial shows this first-start import. Subsequent starts reuse the existing data and credentials. The image runs as non-root UID/GID **10001**.

### Launch the interactive Xila shell

1. In a host terminal, run:

   ```sh
   docker run --rm -it --network none --read-only \
     --tmpfs /tmp:rw,noexec,nosuid,size=16m \
     --mount type=volume,src=xila-state,dst=/var/lib/xila \
     ghcr.io/xila-project/xila-runtime:latest
   ```

By default the image executes `xila-runtime shell --network=none`: this opens **Xila's own command-line shell**, not the container's Linux `bash`. On a fresh installation, log in as **administrator** with an empty password. Try `pwd` or `echo hello`, then `exit` to quit.

You may append `shell --network=none` after the image name to select this mode explicitly. The `-it` flags attach an interactive terminal. Docker's `--network none` disables container networking independently of Xila's network setting.

### Run an existing guest instead

1. In the host working directory, prepare the guest:

   ```sh
   mkdir -p fixtures
   cp /path/to/app.wasm fixtures/app.wasm
   ```

2. In the same host directory, launch the guest with the persistent disk:

   ```sh
   docker run --rm --network none --read-only \
     --tmpfs /tmp:rw,noexec,nosuid,size=16m \
     --mount type=volume,src=xila-state,dst=/var/lib/xila \
     --mount "type=bind,src=$PWD/fixtures,dst=/mnt/xila/fixtures,readonly" \
     ghcr.io/xila-project/xila-runtime:latest run --network=none \
     --mount host=/mnt/xila/fixtures,xila=/fixtures,ro \
     -- /applications/executables/wasm /fixtures/app.wasm
   ```

The Docker bind mount exposes the file to the **runtime process**. The separate Xila `--mount` grants its VFS **read-only** access at `/fixtures`. The headless runtime reference shows this [two-mount flow in a diagram](/reference/container-runtime/#isolation-and-durability). Arguments after `app.wasm` go to the guest. A nonzero guest exit status propagates to Docker.

## Verify the result

In shell mode, confirm the login prompt works and a command executes inside Xila. In guest mode, inspect the application's output and exit code. The volume survives `--rm` and holds the existing disk. Do not delete `xila-state` if it contains data that you want to keep.

For bind-mounted state instead of a named volume, grant write permission to UID/GID 10001. See the [headless runtime reference](/reference/container-runtime/) for disk/seed paths, additional read-write mounts, and explicit guest environment options.

## Related

- [Headless Xila runtime](/reference/container-runtime/)
