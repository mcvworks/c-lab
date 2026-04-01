---
task_id: "037"
title: "Drone garden freeform sound canvas"
status: queued
priority: 0
requires_approval: false
---

## Objective
Create a new "Drone Garden" screen — a freeform canvas where you tap to place persistent tone "seeds" at different pitches. They bloom into visual organisms and combine into an evolving drone soundscape.

## Requirements
- New tab or sub-screen accessible from navigation
- Canvas area where taps place "seeds" (tone sources)
- Vertical position maps to pitch (low at bottom, high at top)
- Horizontal position maps to stereo pan (left to right)
- Each seed:
  - Plays a continuous tone at the mapped frequency
  - Renders as a small animated visual element (circle, bloom, or organic shape)
  - Visual size/glow pulses gently with the tone's amplitude
  - Has a subtle waveform (sine by default, or randomized from a gentle palette)
- Long-press a seed to remove it (with fade-out)
- Multiple seeds combine into a chord/drone cluster
- Maximum seed count (e.g., 8–12) to prevent overload
- No sliders, no numbers visible by default — purely spatial and intuitive
- Optional: pinch to adjust a seed's volume, or drag to move it
- Gentle visual connections (lines or threads) between harmonically related seeds
- Overall volume control or master fade

## Acceptance Criteria
- [ ] Tapping the canvas places a tone seed with pitch mapped to Y position
- [ ] Pan mapped to X position — audible in headphones
- [ ] Seeds render as animated visual elements
- [ ] Long-press removes a seed with fade-out
- [ ] Multiple seeds play simultaneously and blend
- [ ] Maximum seed limit prevents audio overload
- [ ] Feels toy-like, intuitive, and meditative — zero learning curve
