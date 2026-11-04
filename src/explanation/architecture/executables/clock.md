---
layout: doc
docType: explanation
description: "Clock is a Rust/WASM graphical application providing UTC time, alarms, a stopwatch, and a countdown timer through Xila's guest APIs."
---

# Clock (executable)

Clock is a `wasm32-wasip1` guest application distributed in a self-contained bundle and launched through Xila's WASM runtime. It uses the guest graphics bindings, WASI clocks, and VFS-backed settings while keeping timing state bounded.

## Available views

- **Clock** displays the host-provided UTC date/time with a saved 12/24-hour preference.
- **Alarm** stores one UTC alarm with optional weekdays, enable/disable/delete, five-minute snooze, and dismiss.
- **Stopwatch** supports start, pause/resume, reset, and up to 32 cumulative laps.
- **Timer** supports a one-second to 24-hour countdown, pause/resume, restart/cancel, and an in-app completion alert.

The application deliberately presents alarm times as UTC. It does not currently provide timezone/DST data or city clocks.

## Runtime integration

New native/browser reference images include `/applications/bundles/xila.clock/shortcut.json` alongside `executables/clock.wasm`. When the app drawer opens, the Shell discovers this descriptor and resolves its `@bundle/executables/clock.wasm` argument relative to that bundle; it does not run an installation hook. The Wasm runner creates private user application directories and sets `XILA_APPLICATION_CONFIGURATION` for Clock's settings. See [Add a launcher shortcut](/how-to/add-shortcut).

Stopwatch, timer, and snooze durations use the WASI monotonic/startup clock. Alarms use wall time. The guest cooperatively sleeps between event checks because the current graphics ABI does not provide a blocking window-event wait.

## Persistence model

Clock alternates two fixed-size settings records (`settings.0` and `settings.1`) in the directory named by `XILA_APPLICATION_CONFIGURATION` (normally `/users/<uid>/applications/xila.clock/configuration`). This lets startup fall back to the previous valid record when the newest record is corrupt or partially written.

The stored state includes clock-format and alarm settings. Timer state, stopwatch state/laps, and snooze are intentionally not restored after process exit or reboot. Current WASI file APIs do not provide rename/sync semantics, so the alternating records improve recoverability but do not guarantee power-loss durability.

## Notification limits

Alerts are visual and remain active while the Clock process runs, even if another Xila window is focused. There is no host background alarm service, system notification, audio alert, RTC wake, or powered-off alarm. Closing Clock stops delivery until the guest is launched again.

## Resource and scheduling behavior

Normal display updates happen once per second; the visible stopwatch refreshes at tenths of a second. Retained laps and event work are bounded. Alarm/timer delivery depends on executor scheduling and is not a real-time guarantee.

## Timing contract and alarm edge cases

The `clock` crate keeps the timing models separate from the graphical interface:

- `Stopwatch` measures elapsed **monotonic milliseconds**, accumulating time across pause/resume. It stores at most `MAX_LAPS = 32` cumulative readings.
- `Timer` stores a duration, remaining time and optional monotonic deadline. Its `start` rejects zero duration and overflow; `tick` marks completion once the deadline has passed.
- `Alarm::new(hour, minute, weekdays)` accepts UTC clock values, with Monday through Sunday represented by seven weekday bits (0 indicates a one-shot alarm). The scheduler searches up to seven days ahead and coalesces missed triggers rather than emitting a burst.
- `AlarmAlert` handles the visible ringing state and a **five-minute** snooze. It does not register a kernel timer or start another service.

Wall-clock changes can affect when an alarm fires. Stopwatch and countdown deadlines are not recalculated from wall time, so they avoid that particular drift. The guest must still run and be scheduled; none of these types schedules an interrupt or wakes a powered-down device.

## Settings encoding and recovery

`Settings::encode` produces a **26-byte** versioned `CLK1` payload containing the time-format flag, optional alarm and schedule metadata. `storage::Store` prefixes an **8-byte generation counter** and adds a **4-byte checksum** to create **38-byte** records. Its two rotating slots (`settings.0`/`settings.1`) are selected by generation parity.

On load the store validates record length, checksum and logical alarm fields, then chooses the latest valid generation. If one slot is corrupt it can recover from the other; if no valid slot remains but a corrupted record exists, loading returns an error instead of silently replacing settings. The store does **not** persist stopwatch laps, active timer, or snooze.

```rust
use clock::{Alarm, Settings};
let mut alarm = Alarm::new(7, 30, 0).expect("valid UTC hour");
alarm.arm(1_700_000_000);
let settings = Settings { twelve_hour: false, alarm: Some(alarm) };
let encoded = settings.encode();
assert_eq!(encoded.len(), clock::SETTINGS_SIZE);
```

This is a data-model example; `storage::Store` performs actual file I/O on guest/host storage. A successful `flush()` does not guarantee power-loss durability, because the current WASI backend lacks the required durable sync/rename sequence.

### Source references

- <CodeReference repo="applications" path="executables/clock/src/lib.rs" /> — Stopwatch, Timer, Alarm, Settings.
- <CodeReference repo="applications" path="executables/clock/src/storage.rs" /> — alternating records and checksums.
- <CodeReference repo="applications" path="executables/clock/src/interface.rs" /> — GUI, event cadence and notifications.
- <CodeReference repo="applications" path="executables/clock/shortcut.json" /> — bundle-local launcher descriptor.

## References

- <CodeReference repo="applications" path="executables/clock" />
- [WASM runtime](/reference/wasm-runtime)
- [Graphics bindings](/reference/graphics-bindings)
