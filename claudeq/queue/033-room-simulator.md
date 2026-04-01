---
task_id: "033"
title: "Room simulator with reverb and visual space"
status: queued
priority: 0
requires_approval: false
---

## Objective
Add a simple room/space simulator that applies reverb and delay to the generated sound, with a visual representation of the acoustic space.

## Requirements
- Add a "Space" or "Room" control section (could live in Explore or be shared)
- Offer a few room presets: Cathedral, Cave, Small Room, Open Air, Box
- Each preset configures convolution reverb or algorithmic reverb parameters (decay time, wet/dry mix, pre-delay)
- Visual showing the "space" — could be a simple shape/silhouette with particle reflections or wave propagation lines
- Wet/dry mix slider
- Room size or decay slider
- Use Web Audio ConvolverNode with impulse responses, or algorithmic reverb via delay/feedback networks
- Even a plain sine wave should feel alive and immersive with reverb applied
- Smooth transitions when switching rooms (crossfade reverb tails)

## Acceptance Criteria
- [ ] At least 4 room presets with distinct acoustic character
- [ ] Wet/dry mix slider controls reverb blend
- [ ] Visual reflects the selected room style
- [ ] Reverb applies to all sound modes (tone and noise)
- [ ] Switching rooms doesn't produce clicks or artifacts
- [ ] Makes simple tones feel rich and spatial
