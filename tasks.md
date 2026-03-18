# TASKS.md

## Project Workflow Rule
For every task below:

1. First review the existing codebase and relevant handoff docs.
2. Complete only the scoped task.
3. Keep changes limited and organized.
4. End the response with:
   - What changed
   - How to test
   - Notes / follow-ups
5. Create or update the corresponding handoff file in `/handoffs`.

All tasks are intentionally chat-sized.

---

# Task 01 — Initialize Project Foundation

## Goal
Set up the initial Expo + React Native + TypeScript project foundation for Resonance Lab with clean structure and starter navigation.

## Requirements
- Initialize app structure if needed
- Use Expo Router
- Set up main folder structure
- Add primary tabs:
  - Explore
  - Cymatics
  - Composer
  - Library
  - Settings
- Add a global dark theme foundation
- Add a simple reusable `Screen` and `Card` component
- Ensure app runs locally

## Deliverables
- Base project structure
- Tab navigation shell
- Placeholder screens for all tabs
- Theme scaffolding
- Initial handoff doc

## End with
Create `/handoffs/task-01-handoff.md`

---

# Task 02 — Design System and Core UI Primitives

## Goal
Create the reusable UI foundation so future tasks stay visually consistent.

## Requirements
- Add core theme tokens:
  - colors
  - spacing
  - radius
  - typography sizing
  - shadows/glow conventions
- Build reusable components:
  - `SectionHeader`
  - `PrimaryButton`
  - `IconButton`
  - `PrimarySlider`
  - `SegmentedControl`
- Make components fit the premium dark scientific/ambient design direction
- Keep them simple and reusable

## Deliverables
- Reusable themed UI primitives
- At least one demo usage on a screen

## End with
Create `/handoffs/task-02-handoff.md`

---

# Task 03 — Explore Screen Basic Layout

## Goal
Build the first real version of the Explore screen UI without full audio engine complexity yet.

## Requirements
- Create Explore screen layout with:
  - waveform card area
  - spectrum card area
  - tone controls section
- Add controls for:
  - waveform type
  - frequency
  - amplitude
- Use mocked/sample data for charts if needed for now
- Make the screen look polished and responsive on phone + tablet

## Deliverables
- Real Explore screen layout
- Working UI controls
- Clean component structure

## End with
Create `/handoffs/task-03-handoff.md`

---

# Task 04 — Basic Audio Engine for Tone Generation

## Goal
Add the first simple audio generation/playback layer for tones used by Explore.

## Requirements
- Implement basic tone playback
- Support:
  - sine
  - square
  - saw
  - triangle
- Wire Explore controls to audio playback state
- Handle start/stop cleanly
- Avoid abrupt clicks/pops where reasonably possible
- Keep architecture extensible for later composer work

## Deliverables
- Functional tone generator
- Explore screen controls affecting live playback

## End with
Create `/handoffs/task-04-handoff.md`

---

# Task 05 — Live Waveform Visualization

## Goal
Replace mocked waveform visuals with a real or near-real waveform visualization driven by current tone settings.

## Requirements
- Build `WaveformView`
- Reflect waveform type, frequency, amplitude visually
- Smooth animation/rendering
- Keep performance reasonable
- Use SVG/Skia or the most suitable current rendering approach

## Deliverables
- Reusable waveform visualization component
- Integrated into Explore screen

## End with
Create `/handoffs/task-05-handoff.md`

---

# Task 06 — Spectrum Visualization

## Goal
Add a spectrum/frequency visualization for the Explore screen.

## Requirements
- Build `SpectrumView`
- Show a visually believable representation of current signal energy
- It does not need to be lab-grade accurate for MVP, but should be coherent and responsive
- Style should match the premium dark theme

## Deliverables
- Reusable spectrum component
- Integrated Explore screen with waveform + spectrum working together

## End with
Create `/handoffs/task-06-handoff.md`

---

# Task 07 — Add Noise Sources

## Goal
Expand Explore beyond simple oscillator tones.

## Requirements
- Add support for:
  - white noise
  - pink noise
  - brown noise
- Update UI to choose these sources
- Ensure visuals update appropriately
- Handle switching between tone and noise cleanly

## Deliverables
- Noise source support
- Updated Explore UI and playback handling

## End with
Create `/handoffs/task-07-handoff.md`

---

# Task 08 — Cymatics Screen Initial UX

## Goal
Build the first polished Cymatics screen layout and controls before complex simulation logic.

## Requirements
- Create a full-screen or nearly full-screen Cymatics visual area
- Add controls for:
  - frequency
  - amplitude/intensity
  - plate shape preset
  - particle/material preset
- Include play/pause/freeze/reset controls
- Match the premium mesmerizing design direction

## Deliverables
- Cymatics screen UI shell
- Visual placeholder area ready for simulation integration

## End with
Create `/handoffs/task-08-handoff.md`

---

# Task 09 — Digital Sand Plate Simulation v1

## Goal
Implement the first digital cymatics / sand plate simulation.

## Requirements
- Build `SandPlateView`
- Simulate frequency-reactive nodal pattern behavior
- It does not need to be physically perfect, but should feel plausible, beautiful, and interactive
- Support at least:
  - 2 plate shapes
  - 2 material/particle presets
- Wire controls to visible pattern changes

## Deliverables
- Working cymatics visualization v1
- Reusable sand plate component

## End with
Create `/handoffs/task-09-handoff.md`

---

# Task 10 — Shared Audio State Between Explore and Cymatics

## Goal
Create a coherent shared audio/settings layer so the app behaves consistently across tabs.

## Requirements
- Refactor or add state so generator settings can be shared cleanly
- Prevent messy duplicated logic between Explore and Cymatics
- Ensure tab switching does not create broken playback behavior
- Keep state predictable and modular

## Deliverables
- Cleaner shared audio/settings architecture
- Explore and Cymatics interoperating sensibly

## End with
Create `/handoffs/task-10-handoff.md`

---

# Task 11 — Composer Screen Layout

## Goal
Build the first real Composer screen UI.

## Requirements
- Add composer sections for:
  - binaural controls
  - ambient layers
  - session settings
- Include controls for:
  - left ear frequency
  - right ear frequency
  - beat difference
  - duration
  - fade in/out
- Add UI shell for multiple layers
- Use placeholders where necessary, but prepare for real wiring next

## Deliverables
- Composer screen structure
- Clean UX for future audio wiring

## End with
Create `/handoffs/task-11-handoff.md`

---

# Task 12 — Binaural Beat Engine

## Goal
Implement the actual binaural beat generation logic.

## Requirements
- Stereo headphone-oriented playback
- Independent left/right frequency control
- Beat difference display
- Start/stop handling
- Safe defaults
- Prevent abrupt audio artifacts when adjusting settings

## Deliverables
- Functional binaural beat generation
- Wired to Composer controls

## End with
Create `/handoffs/task-12-handoff.md`

---

# Task 13 — Ambient Layer System v1

## Goal
Add the first ambient sound layer system to Composer.

## Requirements
- Support a small set of ambient layer types, such as:
  - rain
  - ocean
  - wind
  - brown noise bed
- Allow per-layer:
  - enable/disable
  - volume
- Keep architecture open for more layers later
- Focus on a simple but clean MVP implementation

## Deliverables
- Ambient layer playback support
- Layer controls visible in Composer

## End with
Create `/handoffs/task-13-handoff.md`

---

# Task 14 — Preset Save/Load System

## Goal
Allow the user to save and reload sound setups locally.

## Requirements
- Save presets locally
- Include:
  - generator/composer settings
  - layer settings
  - user-provided preset name
- Load saved presets back into Composer/Explore as appropriate
- Add duplicate/delete actions

## Deliverables
- Local preset persistence
- Functional save/load UX

## End with
Create `/handoffs/task-14-handoff.md`

---

# Task 15 — Library Screen

## Goal
Build the Library screen for saved presets and recent exported items.

## Requirements
- Show saved presets list
- Show recent exports list placeholder or real data if available
- Add actions:
  - open/load
  - duplicate
  - rename
  - delete
- Keep UI clean and premium

## Deliverables
- Functional Library screen
- Connected to preset persistence

## End with
Create `/handoffs/task-15-handoff.md`

---

# Task 16 — Export System v1

## Goal
Allow users to export generated sessions/audio files locally.

## Requirements
- Implement export flow for composer sessions
- Start with one or two export formats if necessary
- Add filename handling
- Add export success/failure feedback
- Store export metadata for Library screen
- Keep implementation practical for MVP

## Deliverables
- Working export flow
- Library updated with export history

## End with
Create `/handoffs/task-16-handoff.md`

---

# Task 17 — Headphone Check / Stereo Test

## Goal
Add a simple headphone-oriented utility screen section or modal.

## Requirements
- Add stereo left/right test
- Add phase test or simple stereo verification
- Add clear note that binaural beats work best with stereo headphones
- Keep UX simple and polished

## Deliverables
- Headphone/stereo verification utility
- Accessible from Composer or Settings

## End with
Create `/handoffs/task-17-handoff.md`

---

# Task 18 — Settings Screen and Safety Copy

## Goal
Finish the Settings screen with practical MVP settings and safety-oriented guidance.

## Requirements
- Add settings for:
  - audio safety note
  - default export quality placeholder or real setting
  - theme placeholder
  - app info/about
- Add neutral wording around binaural beats
- Avoid medical/neurological claims

## Deliverables
- Functional Settings screen
- Product-safe user-facing copy

## End with
Create `/handoffs/task-18-handoff.md`

---

# Task 19 — Tablet Polish Pass

## Goal
Improve the app experience specifically for iPad/tablet layouts.

## Requirements
- Audit layouts on tablet-sized screens
- Improve spacing and panel layout
- Take advantage of larger screen space
- Avoid stretched phone-only layouts
- Preserve clean UX on smaller devices

## Deliverables
- Better tablet responsiveness
- Layout improvements across key screens

## End with
Create `/handoffs/task-19-handoff.md`

---

# Task 20 — MVP Cleanup and Launch Readiness Pass

## Goal
Do a final MVP cleanup pass without adding major new features.

## Requirements
- remove dead code
- improve naming where necessary
- smooth rough UI edges
- verify navigation and local flows
- improve empty/loading/error states where applicable
- document remaining limitations
- ensure handoff docs are present and coherent

## Deliverables
- Cleaner MVP codebase
- launch-readiness summary
- clear next-step recommendations

## End with
Create `/handoffs/task-20-handoff.md`

---

# Optional Post-MVP Tasks

## Task 21 — Spectrogram View
Add a richer scrolling spectrogram to Explore.

## Task 22 — More Cymatics Modes
Add liquid surface and particle field modes.

## Task 23 — Audio Import
Allow user-imported audio to drive visuals.

## Task 24 — Guided Learning Cards
Add educational mini-lessons to Explore/Cymatics.

## Task 25 — Premium Preset Packs
Create bundled ambient presets and themed sound packs.

## Task 26 — Video Export of Visualizations
Export ambient sessions with visuals as video.

## Task 27 — Android Optimization Pass
Adapt/polish performance and audio behaviors for Android.

## Task 28 — Desktop/Web Planning Doc
Create a technical planning document for future desktop/web companion.

---

# Suggested Execution Order
Run tasks in this order:
1. Task 01
2. Task 02
3. Task 03
4. Task 04
5. Task 05
6. Task 06
7. Task 07
8. Task 08
9. Task 09
10. Task 10
11. Task 11
12. Task 12
13. Task 13
14. Task 14
15. Task 15
16. Task 16
17. Task 17
18. Task 18
19. Task 19
20. Task 20

---

# Reusable Prompt Prefix For Each Task
Use this before pasting any individual task into Claude Code:

Please refer to the existing `CLAUDE.md` and all prior relevant handoff docs before making changes.

Work only on the specific task I am giving you right now.
Keep the implementation scoped and chat-sized.
Do not jump ahead to future tasks unless absolutely necessary for minimal support structure.
At the end, provide:
1. What changed
2. How to test
3. Notes / follow-ups

Also create or update the corresponding handoff markdown file in `/handoffs`.

---

# Example Prompt For Task 01
Please refer to the existing `CLAUDE.md` and all prior relevant handoff docs before making changes.

Complete Task 01 — Initialize Project Foundation.

Requirements:
- Initialize app structure if needed
- Use Expo Router
- Set up main folder structure
- Add primary tabs:
  - Explore
  - Cymatics
  - Composer
  - Library
  - Settings
- Add a global dark theme foundation
- Add a simple reusable `Screen` and `Card` component
- Ensure app runs locally

At the end, provide:
1. What changed
2. How to test
3. Notes / follow-ups

Also create `/handoffs/task-01-handoff.md`.