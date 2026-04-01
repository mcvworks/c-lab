---
task_id: "029"
title: "Composer: per-layer panning and filter cutoff"
status: queued
priority: 0
requires_approval: false
---

## Objective
Add per-layer stereo panning and filter cutoff controls to the Composer ambient layer system.

## Requirements
- **Per-layer pan** slider (-1.0 L to +1.0 R): add a StereoPannerNode per layer in AmbientGenerator. Default to center (0).
- **Per-layer filter cutoff** slider: expose the existing BiquadFilterNode frequency as a user-controllable "Brightness" slider (range depends on ambient type, roughly 200–8000 Hz). Higher = brighter, lower = darker/muffled.
- Update the layer card UI: add a compact pan slider and brightness slider below the existing volume slider
- Live-update both params while playing (smooth ramp)
- Add pan and filterCutoff to the AmbientLayerConfig interface
- Save in ComposerSettings presets and export

## Acceptance Criteria
- [ ] Each ambient layer has a pan slider
- [ ] Each ambient layer has a brightness/filter slider
- [ ] Panning audibly positions the layer in stereo
- [ ] Filter slider audibly brightens/darkens the texture
- [ ] Values persist in presets and are used during export rendering
