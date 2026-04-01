---
task_id: "021"
title: "Explore: detune, panning, and frequency scale"
status: done
priority: 0
requires_approval: false
---

## Objective
Add three new sound controls to the Explore tab: fine-tune detune in cents, stereo panning (L/R balance), and a linear/logarithmic frequency scale toggle.

## Requirements
- Add a **Detune** slider (range: -100 to +100 cents) to ToneGenerator — apply via `oscillator.detune` on web, regenerate buffer on native
- Add a **Pan** slider (range: -1.0 left to +1.0 right) using a StereoPannerNode on web
- Add a **Frequency Scale** toggle (linear / log) that changes how the frequency slider maps its range — log makes low-end more usable
- Wire all three controls into the Explore screen UI, audio store, and preset save/load
- Ensure detune and pan are smooth-ramped (no clicks)

## Acceptance Criteria
- [ ] Detune slider appears in tone mode, audibly shifts pitch in small increments
- [ ] Pan slider positions tone/noise in stereo field
- [ ] Frequency scale toggle changes slider behavior — log feels more musical
- [ ] All three values save/load with presets
- [ ] No audio clicks on parameter changes
