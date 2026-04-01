---
task_id: "032"
title: "Sympathetic strings resonance mode"
status: queued
priority: 0
requires_approval: false
---

## Objective
Add a "Sympathetic Strings" visualization/audio feature to the Explore tab (or as a new sub-mode). A bank of virtual strings tuned to specific notes resonate visually and audibly when the played tone is near their resonant frequency.

## Requirements
- Display a set of virtual strings (e.g., 6–12) tuned to common notes (C3, D3, E3, etc.)
- Each string is rendered as a horizontal line that vibrates/glows when excited
- When the active tone's frequency (or a harmonic) is near a string's tuned frequency, that string resonates
- Resonance intensity based on proximity to the string's frequency (tighter = stronger)
- Strings produce a soft sympathetic tone layered on top of the main tone
- Sympathetic volume should be subtle and adjustable
- Visual animation: strings oscillate with amplitude proportional to resonance strength
- Works with tone mode; passive/dormant during noise mode
- Teach resonance intuitively — no physics jargon needed in the UI

## Acceptance Criteria
- [ ] Bank of tuned strings rendered visually
- [ ] Strings vibrate/glow when the played frequency matches or is harmonically related
- [ ] Sympathetic audio is audible and blends naturally
- [ ] Changing the played frequency updates which strings resonate in real time
- [ ] Feature can be toggled on/off
- [ ] Feels educational and mesmerizing, not cluttered
