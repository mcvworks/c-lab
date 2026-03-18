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

# CLAUDE.md

## Project Name
Resonance Lab

## Product Summary
Resonance Lab is a headphone-first interactive sound exploration app focused on:
- learning and experimenting with sound
- viewing waveform/spectrum/cymatics-style visualizations
- generating tones and layered ambient soundscapes
- creating binaural beat sessions
- exporting ambient/binaural mixes for use elsewhere

This is not just a music visualizer. It is a premium, interactive sound lab that combines:
1. sound education
2. real-time visual feedback
3. ambient/binaural composition
4. high-fidelity headphone-first listening

Core brand phrase:
**Hear it. See it. Shape it.**

---

## Product Goals
Build a polished MVP that allows a user to:
- generate tones and noise
- visualize sound in real time
- explore a digital cymatics / sand plate simulation
- build simple binaural and ambient sessions
- save presets locally
- export generated audio files

The first version should feel:
- premium
- tactile
- calming but scientific
- visually impressive
- responsive and smooth
- touch-friendly on tablet and phone

---

## Platform Targets
Primary target:
- iPad first-class experience
- iPhone supported

Secondary targets later:
- Android
- desktop/web companion

For now, build the codebase in a way that can later support cross-platform expansion, but optimize first for Apple mobile/tablet UX.

---

## Recommended Stack
Use:
- **React Native with Expo** for app foundation
- **TypeScript**
- **Expo Router**
- **React Native Reanimated** for smooth motion
- **React Native Gesture Handler**
- **zustand** for lightweight app state
- **react-native-svg** or Skia for custom visual rendering
- **Expo AV / audio APIs** or suitable RN audio stack for playback/generation
- local persistence via **AsyncStorage** or better local storage abstraction
- file export using platform-appropriate local file APIs

If there is a better modern package for audio generation/playback/record/export in the current ecosystem, prefer the stable, well-maintained choice.

---

## MVP Scope
The MVP should include the following primary areas:

### 1. Explore
- tone generator
- waveform visualization
- spectrum visualization
- basic spectrogram or simplified frequency history view
- controls for frequency, amplitude, waveform type
- support for sine, square, saw, triangle
- optional pink/white/brown noise generation

### 2. Cymatics
- one “digital sand plate” visualization mode
- frequency-reactive nodal pattern simulation
- controls for:
  - frequency
  - amplitude/intensity
  - plate shape preset
  - material/particle style preset
- real-time response to generated tones

### 3. Composer
- binaural beat generator
- left/right ear control
- beat difference control
- ambient layer system
- at least a few ambient/noise layer options
- volume control per layer
- fade in/fade out
- session duration
- local save preset
- export generated audio

### 4. Library
- saved presets
- recent exports
- editable preset names
- delete/duplicate actions

### 5. Settings
- audio safety notes
- volume safety warning
- theme selection placeholder
- export quality settings placeholder
- app info

---

## Design Direction
The UI should feel like:
- premium
- dark mode first
- minimal but tactile
- slightly futuristic
- scientific without feeling sterile
- meditative without feeling too “wellness-app generic”

Visual style notes:
- dark charcoal / near-black backgrounds
- soft glow accents
- clean typography
- rounded panels/cards
- restrained neon or spectral highlight colors
- layered depth, subtle motion, subtle blur where appropriate
- avoid clutter
- avoid childish or gimmicky effects

The app should feel somewhere between:
- a modern music tool
- a science lab interface
- a calm premium ambient app

---

## UX Principles
- prioritize clarity and delight
- every major control should give immediate visible and audible feedback
- avoid tiny touch targets
- do not overload the screen
- make the “wow” factor obvious within the first 30 seconds
- the cymatics screen should feel mesmerizing
- the composer should feel easy, not like a DAW
- the app should remain useful for both beginners and curious tinkerers

---

## Audio Principles
- headphone-first design
- clearly label that binaural beats work best with stereo headphones
- include safety-minded defaults for volume
- avoid making medical claims
- include gentle warnings for prolonged loud tone playback
- prefer smooth fade transitions and click/pop prevention in playback changes
- avoid abrupt audio artifacts whenever parameters change

---

## Architecture Principles
- modular
- strongly typed
- reusable hooks/components
- no giant files
- separate UI, audio engine, visualization logic, and persistence logic
- keep screens lean and move logic into hooks/services/components
- favor composable abstractions over one-off hacks
- document non-obvious technical decisions in code comments

Recommended high-level folders:
- `app/`
- `src/components/`
- `src/features/explore/`
- `src/features/cymatics/`
- `src/features/composer/`
- `src/features/library/`
- `src/features/settings/`
- `src/audio/`
- `src/state/`
- `src/hooks/`
- `src/lib/`
- `src/theme/`
- `src/types/`

---

## Non-Goals for MVP
Do NOT build these yet unless a task explicitly asks for them:
- user authentication
- cloud sync
- social/community features
- backend services
- subscriptions/paywall implementation
- advanced DAW timeline editing
- microphone recording/import pipeline
- advanced AI features
- desktop build
- Android-specific polish
- AR mode
- video export
- live external audio input processing
- headphone calibration profiles database

These can come later.

---

## Quality Bar
Every deliverable should aim for:
- clean TypeScript
- no dead code
- no placeholder junk left behind unless explicitly marked
- responsive layout for phone + tablet
- visually coherent dark theme
- easy local run instructions
- stable navigation
- minimal dependency bloat
- sensible naming throughout

---

## How To Work
When working tasks for this project:

1. First inspect the current repo/app state.
2. Summarize what exists and what is missing.
3. Make only the changes needed for the assigned task.
4. Keep tasks scoped and chat-sized.
5. Do not silently refactor unrelated areas unless necessary.
6. If a task requires a small supporting refactor, do it cleanly and explain it.
7. After each task, provide a concise handoff note.

---

## Required Output For Every Task
At the end of every task, always include:

### What changed
Short bullet summary of files created/updated and behavior added.

### How to test
Concrete local verification steps.

### Notes / follow-ups
Anything important, unfinished, or recommended next.

### Handoff doc
Create/update a small markdown handoff file for that task in a `/handoffs` folder.
File naming format:
- `handoffs/task-01-handoff.md`
- `handoffs/task-02-handoff.md`
etc.

Each handoff should include:
- task number/title
- summary
- files changed
- run/test notes
- known issues
- next recommended task

---

## Coding Standards
- TypeScript only
- prefer functional components
- prefer hooks over class patterns
- avoid `any` unless absolutely necessary
- keep components focused
- extract repeated styles/logic
- keep naming descriptive
- no large inline anonymous components if they can be reused
- handle loading/empty/error states when relevant
- do not over-engineer

---

## Visual Component Expectations
Reusable UI components should likely include:
- `Screen`
- `Card`
- `SectionHeader`
- `PrimarySlider`
- `SegmentedControl`
- `WaveformView`
- `SpectrumView`
- `SandPlateView`
- `LayerRow`
- `PresetCard`
- `PrimaryButton`
- `IconButton`

Keep these consistent and theme-aware.

---

## State Expectations
Use lightweight predictable state.
Suggested split:
- playback/audio state
- current generator settings
- current cymatics settings
- composer/session settings
- saved presets/export metadata
- UI preferences

Avoid one giant global store if feature-scoped stores/hooks are cleaner.

---

## Testing Expectations
For each feature, ensure:
- it renders without crash
- navigation works
- parameter changes update the UI
- parameter changes update playback/visual output where applicable
- save/delete flows behave correctly
- exported outputs are named and stored sensibly

Use reasonable lightweight tests where practical, but prioritize working product progress for MVP.

---

## Important Product Constraints
- Do not make medical or neurological treatment claims around binaural beats.
- Phrase things in a neutral, exploratory, educational way.
- Keep safety in mind around volume and prolonged listening.
- Preserve a polished premium tone in UI copy.

---

## Suggested MVP Navigation
Main tabs:
- Explore
- Cymatics
- Composer
- Library
- Settings

Keep the first-run experience simple and intuitive.

---

## First-Run Experience
The user should be able to launch the app and quickly:
- play a tone
- see a waveform
- open cymatics
- build a simple binaural/ambient preset

This should be achievable without reading documentation.

---

## Definition of Done
A task is done when:
- the requested scoped functionality exists
- it runs locally
- it is wired into the UI where appropriate
- code is reasonably clean
- a handoff markdown file is created/updated
- clear testing instructions are provided

---

## Final Instruction
Prefer practical, shippable progress over perfection.
Keep each task small enough to complete cleanly in one chat.
Do not jump ahead beyond the current task unless explicitly asked.