---
layout: doc
docType: explanation
description: Understand Xila Synth's bounded WASM audio generation and native/browser playback paths.
---

# Synth (executable)

Synth is an eight-voice instrument implemented as a `wasm32-wasip1` guest. Its waveform generation goes through the Xila audio device and shared mixer, rather than accessing native or browser sound APIs directly.

## Controls and audio path

The graphical keyboard supports octaves **2–6**, sine/square/triangle waveforms and 10% volume steps (70% initially). Note presses and releases control playback; changing octave releases any held notes. The controls are session-local.

The instrument uses bounded PCM blocks, with at most one retained **128-frame block** per turn. Partial writes and output backpressure do not create an unbounded queue. Eight synthesis voices do **not** imply support for eight simultaneous fingers: the current input driver exposes one pointer.

The native example routes audio to the system's default output. In the browser, the page's **Enable audio** control must be activated by a user gesture before playback is available. If Synth is already running, use **Retry audio**.

## Failure boundaries

When an audio backend cannot start or stream writes fail, Synth remains interactive in **silent mode**. Its controls still respond; enabling audio and retrying may restore playback. Closing the window stops the notes and releases the stream.

The native and browser examples include Synth in newly seeded installations. Existing persistent disks are preserved and do not automatically install newer guest applications. Physical WT32-SC01 Plus speaker output remains pending an I2S driver and board validation; a native/browser demo does not establish it.

## PCM device interaction and voice ownership

The guest opens `/devices/audio/playback` as a writable WASI file. It obtains `GET_CONFIGURATION`, prepares the instrument for that format, reads `GET_VOLUME`, then sets its volume to **70%** and sends `START`. Audio stays in a bounded PCM producer/consumer pipeline; the guest never calls `cpal` or browser audio directly.

Device controls are issued through `wasm::fd_control`, using **16-byte-aligned** Rust wrapper storage for typed payloads. If the host reports `WouldBlock`, the command helper retries at most **eight times**, waiting 1 ms between attempts. The audio update checks `GET_WRITABLE` before submitting samples; on temporary backpressure it returns without growing an unbounded queue.

`AudioOutput` owns its WASI file and `Instrument`. Note state, waveform and octave belong to the guest UI. On drop, it stops all notes and attempts the `STOP` command; dropping the file then releases its stream reservation. This is a session-local instrument rather than a long-lived background sound service.

## Failure, latency and output restrictions

The guest may remain **interactive but silent** if audio setup fails. Audio device availability is independent of rendering: the Graphics bridge can be present while `/devices/audio/playback` or the platform playback adapter is missing. The native demo relies on a host output device, and the browser requires user activation of audio.

The synthesizer is limited to eight voices and a bounded block per turn. Voice count is independent of multi-touch support; the current pointer event model does not promise simultaneous independent fingers. The output queue may retain already submitted frames briefly after stopping notes, and a failing or contended backend can cause audible underruns.

### Source references

- <CodeReference repo="applications" path="executables/synth/src/device.rs" /> — WASI control protocol, retries and teardown.
- <CodeReference repo="applications" path="executables/synth/src/interface.rs" /> — keyboard, waveform and voice events.
- <CodeReference repo="applications" path="executables/synth/src/lib.rs" /> — bounded PCM synthesis state.
- <CodeReference repo="applications" path="executables/synth/shortcut.json" /> — bundle-local launcher descriptor.
- [Audio device contract](/explanation/architecture/libraries/audio) — shared format and mixer semantics.

## References

- <CodeReference repo="applications" path="executables/synth/README.md" />
- <CodeReference repo="applications" path="executables/synth" />
- [Audio library](/explanation/architecture/libraries/audio)
- [WASM executable](/explanation/architecture/executables/wasm)
