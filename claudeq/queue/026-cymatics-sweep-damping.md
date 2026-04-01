---
task_id: "026"
title: "Cymatics: frequency sweep and damping control"
status: queued
priority: 0
requires_approval: false
---

## Objective
Add a frequency auto-sweep mode and an exposed damping control to the Cymatics tab.

## Requirements
- **Sweep mode**: toggle that slowly sweeps the frequency across a user-defined range (e.g., 100–800 Hz) at a configurable speed (Hz/sec). Use a `requestAnimationFrame` loop or interval to increment frequency smoothly. Show current sweep position on the slider.
- **Sweep controls**: start/end frequency, speed (slow/medium/fast or a slider), loop toggle
- **Damping slider**: expose the particle physics damping value (currently hardcoded per material at 0.82–0.93). Allow override from ~0.7 (very snappy) to ~0.98 (very sluggish/drifty). This stacks with the per-material base.
- Save sweep and damping settings in presets

## Acceptance Criteria
- [ ] Sweep toggle starts automatic frequency scanning
- [ ] Sweep speed and range are configurable
- [ ] Damping slider visibly changes how quickly particles settle
- [ ] Low damping = snappy, high damping = particles glide with momentum
- [ ] Settings persist in presets
