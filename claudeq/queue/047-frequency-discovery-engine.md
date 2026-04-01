---
task_id: "047"
title: Frequency discovery engine
status: queued
priority: 0
requires_approval: false
---

## Objective
Create a hook that monitors active playback frequency and auto-discovers cataloged frequencies.

## Requirements
- Hook `useFrequencyDiscovery` that watches the audio store's current frequency
- When user plays within ±2 Hz of a cataloged frequency for ≥1.5 seconds, mark it discovered
- Works across Explore (tone), Cymatics (plate frequency), and Composer (base frequency)
- Fires a callback on new discovery (for notification UI)
- Tracks discovery timestamp and source tab
- Uses the discovery store from task 046

## Acceptance Criteria
- [ ] Hook monitors frequency during playback
- [ ] ±2 Hz tolerance with 1.5s dwell time
- [ ] Discovery persisted to store
- [ ] Callback fires on new discovery
- [ ] Works on Explore, Cymatics, and Composer tabs
