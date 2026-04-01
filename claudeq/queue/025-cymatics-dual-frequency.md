---
task_id: "025"
title: "Cymatics: dual-frequency interference mode"
status: queued
priority: 0
requires_approval: false
---

## Objective
Add a dual-frequency mode to Cymatics that overlays two frequencies to create interference patterns, simulating a plate excited at multiple resonant modes simultaneously.

## Requirements
- Add a toggle for "Dual Frequency" mode on the Cymatics screen
- When enabled, show a second frequency slider
- In SandPlateView, compute the Chladni field as the sum of both frequency fields — particles settle at the intersection of both nodal line sets
- Play both frequencies simultaneously (add a second oscillator or use the existing ToneGenerator with an additive approach)
- Second frequency defaults to a harmonically related value (e.g., 1.5x the primary)
- Save dual-freq state in presets

## Acceptance Criteria
- [ ] Dual frequency toggle appears on Cymatics screen
- [ ] Second frequency slider appears when enabled
- [ ] Sand plate shows visibly different (more complex) interference patterns
- [ ] Both tones are audible simultaneously
- [ ] Dual-freq settings persist in presets
