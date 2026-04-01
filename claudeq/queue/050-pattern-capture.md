---
task_id: "050"
title: Cymatics pattern capture
status: queued
priority: 0
requires_approval: false
---

## Objective
Extend the Cymatics freeze button to capture patterns to the Atlas.

## Requirements
- Add "Capture to Atlas" action alongside existing Freeze
- Save pattern data: frequency, waveform, plate shape, material, amplitude
- Approximate node count from particle distribution
- Store in discovery store's patterns array
- Show brief confirmation on capture

## Acceptance Criteria
- [ ] Capture button visible on Cymatics tab
- [ ] Pattern data saved to discovery store
- [ ] Node count approximated
- [ ] Confirmation shown on capture
- [ ] Captured patterns persist across sessions
