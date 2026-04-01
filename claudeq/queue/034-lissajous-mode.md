---
task_id: "034"
title: "Lissajous figure visualization"
status: queued
priority: 0
requires_approval: false
---

## Objective
Add a Lissajous curve visualization mode that feeds two frequencies into X and Y axes, drawing the classic oscilloscope figures in real time.

## Requirements
- New visualization component (could be a viz option in Explore or its own screen section)
- Two frequency inputs: one drives the X axis, one drives the Y axis
- Draw the parametric curve: x = sin(a·t + δ), y = sin(b·t)
- Controls for:
  - Frequency A (X axis)
  - Frequency B (Y axis)
  - Phase offset (δ)
  - Trail length / persistence (how long the curve stays visible)
- Render using SVG path or Skia canvas for smooth animation
- Slowly detuning one frequency against the other should produce mesmerizing rotating/morphing figures
- Quick presets for famous ratios: unison (1:1), octave (2:1), fifth (3:2), fourth (4:3)
- Glow/color based on the frequency ratio
- Optional: tie Frequency A to the Explore tone generator so it visualizes what you're hearing

## Acceptance Criteria
- [ ] Lissajous figure renders smoothly in real time
- [ ] Changing frequencies morphs the figure visually
- [ ] Phase offset slider rotates/distorts the figure
- [ ] Ratio presets produce clean, recognizable patterns
- [ ] Slow detuning creates the classic rotating effect
- [ ] Feels like a premium oscilloscope aesthetic
