---
task_id: "054"
title: Garden visual evolution
status: queued
priority: 0
requires_approval: false
---

## Objective
Make garden seeds visually grow or wilt based on harmonic consonance.

## Requirements
- Consonant seeds: grow larger, bloom (petal/leaf shapes), brighter glow
- Dissonant seeds: shrink slightly, muted color, subtle wilt
- Neutral/isolated seeds: stay as current default
- Growth transitions over ~2-3 seconds when harmony changes
- Use Reanimated for smooth animations
- Visual changes based on per-seed consonance from task 053

## Acceptance Criteria
- [ ] Consonant seeds visually bloom
- [ ] Dissonant seeds visually wilt
- [ ] Transitions are smooth (2-3s)
- [ ] Single seed shows neutral state
- [ ] Visual state updates when seeds added/removed
