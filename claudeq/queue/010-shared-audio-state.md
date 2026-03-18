---
task_id: "010"
title: Shared Audio State Between Explore and Cymatics
status: queued
priority: 9
requires_approval: false
---

## Objective
Create a coherent shared audio/settings layer so the app behaves consistently across tabs.

## Requirements
- Refactor or add state so generator settings can be shared cleanly
- Prevent messy duplicated logic between Explore and Cymatics
- Ensure tab switching does not create broken playback behavior
- Keep state predictable and modular
- Commit all changes with a clear message referencing the task number
- Push to the remote repository

## Acceptance Criteria
- [ ] Cleaner shared audio/settings architecture
- [ ] Explore and Cymatics interoperating sensibly
- [ ] No broken playback on tab switch
- [ ] State is modular and predictable
- [ ] Changes committed with clear message referencing task number
- [ ] Changes pushed to remote
