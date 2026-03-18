# CLAUDE.md


---

## ClaudeQ Integration

This project is managed by ClaudeQ — a remote task queue and approval system.

### Task Structure
Tasks live in `claudeq/queue/` as markdown files named `NNN-short-title.md`.

### Task File Format
Each task file must use YAML frontmatter:
```yaml
---
task_id: "001"
title: Short descriptive title
status: queued
priority: 0
requires_approval: false
---

## Objective
What to accomplish.

## Requirements
- Detailed requirement 1
- Detailed requirement 2

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2
```

### When executing a task:
1. Check the latest handoff doc in `claudeq/handoff/` first
2. Read the task file for full requirements
3. Do the work, commit with clear messages
4. Write a handoff doc to `claudeq/handoff/NNN-short-title.md`

### Handoff Doc Template
Every completed task must produce a handoff doc:
```
# Handoff
- Task:
- Status:
- Summary:
- Files Changed:
- Commands Run:
- Testing:
- Blockers:
- Next Recommended Task:
- Notes:
```

### Folder Layout
```
claudeq/
  project.yaml        # project metadata
  queue/               # pending tasks (NNN-short-title.md)
  running/             # currently executing
  done/                # completed tasks
  failed/              # failed tasks
  logs/                # execution logs
  handoff/             # handoff docs from completed tasks
```
