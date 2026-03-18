# Resonance Lab — Launch Readiness Summary

**Generated:** 2026-03-18
**Task:** 020 — MVP Cleanup and Launch Readiness Pass
**Project Phase:** Pre-development (task queue initialized, no application code yet)

---

## Current State

The repository contains:

- Complete product specification (`CLAUDE.md`)
- 19 well-scoped development tasks in `claudeq/queue/`
- ClaudeQ task management infrastructure
- Project documentation (`README.md`, `docs/`)

**No application code has been written yet.** All 19 implementation tasks are pending.

---

## Task Execution Plan

Tasks should be executed in order. Each builds on the previous.

| Task | Title | Key Output |
|------|-------|------------|
| 001 | Initialize Project Foundation | Expo project, tabs, theme scaffold |
| 002 | Design System & Core UI | Theme tokens, reusable UI primitives |
| 003 | Explore Screen Layout | Explore screen UI shell |
| 004 | Basic Audio Engine | Tone generation (sine/square/saw/triangle) |
| 005 | Waveform Visualization | Real-time waveform component |
| 006 | Spectrum Visualization | FFT-based spectrum display |
| 007 | Noise Sources | White/pink/brown noise generators |
| 008 | Cymatics Screen UX | Cymatics screen shell |
| 009 | Sand Plate Simulation | Digital cymatics nodal pattern engine |
| 010 | Shared Audio State | Cross-feature audio state with Zustand |
| 011 | Composer Screen Layout | Composer screen UI |
| 012 | Binaural Beat Engine | Left/right tone engine with beat frequency control |
| 013 | Ambient Layer System | Layered ambient/noise sources with per-layer volume |
| 014 | Preset Save/Load | AsyncStorage preset persistence |
| 015 | Library Screen | Preset browser + export history |
| 016 | Export System | Audio file export to local storage |
| 017 | Headphone Stereo Test | Built-in stereo channel test utility |
| 018 | Settings Screen | Safety copy, volume warnings, app info |
| 019 | Tablet Polish | Responsive layout refinements for iPad |

---

## Architecture Readiness

The intended architecture is well-defined in `CLAUDE.md`:

```
app/                    # Expo Router pages
src/
  components/           # Reusable UI components
  features/             # Feature modules
    explore/
    cymatics/
    composer/
    library/
    settings/
  audio/                # Audio engine services
  state/                # Zustand stores
  hooks/                # Custom hooks
  lib/                  # Utilities
  theme/                # Design tokens
  types/                # Shared TypeScript types
```

**Principle:** Keep screens thin. Move logic into hooks, services, and components.

---

## Known Limitations (Pre-Development)

These are limitations by design for the MVP scope. None are bugs — they are explicit non-goals:

| Area | Limitation | Future Phase |
|------|-----------|--------------|
| Platform | iOS/iPadOS only for MVP | Android / web in later phases |
| Auth | No user accounts or cloud sync | Phase 2 |
| Audio input | No microphone recording or import | Phase 2 |
| AI features | None | Phase 3 |
| Advanced editing | No DAW-style timeline | Phase 2 |
| Export formats | Basic audio file export only | Phase 2 |
| Theme switching | Placeholder setting only | Phase 2 |
| Export quality | Placeholder setting only | Phase 2 |
| AR/Video | Not planned for MVP | Phase 3+ |
| Headphone calibration | Not planned for MVP | Phase 3+ |

---

## Recommended Tech Stack Decisions

Before Task 001, confirm these choices are current and well-maintained:

- **Audio generation:** Expo AV or `react-native-audio-toolkit` — verify which supports oscillator-style tone synthesis on iOS. If neither supports it natively, a custom native module or WebAssembly-based synthesis may be needed.
- **Visualization:** React Native Skia is preferred over SVG for performance-sensitive waveform/cymatics rendering.
- **State:** Zustand is appropriate — feature-scoped stores are preferred over one large global store.
- **Persistence:** `@react-native-async-storage/async-storage` for presets; file system APIs for exports.

---

## Quality Checklist (To Be Verified Per Task)

Each task should be verified against:

- [ ] TypeScript — no `any` without justification
- [ ] No dead imports or unused exports
- [ ] No placeholder components left behind
- [ ] Dark theme applied consistently
- [ ] Responsive for both phone and tablet
- [ ] Loading/empty/error states handled where relevant
- [ ] Audio click/pop prevention on parameter changes
- [ ] Volume safety defaults respected
- [ ] No medical claims in UI copy
- [ ] Navigation works without crashes
- [ ] Commit message references task number

---

## Recommended Next Steps

1. **Execute Task 001** — this is the blocker for all subsequent work
2. Confirm Expo SDK version and audio package choice before Task 004 (audio engine)
3. Confirm Skia vs SVG decision before Task 005 (waveform visualization)
4. After Task 009 (cymatics), validate performance on a physical iPad — cymatics simulation is the most CPU/GPU intensive feature
5. After Task 016 (export), test export on a real device — simulator file system behavior differs from device
6. After all tasks complete, run a final device-level QA pass before any app store submission

---

## Post-MVP Roadmap Suggestions

1. **Phase 2:** Android support, cloud sync, more export formats, advanced preset management
2. **Phase 3:** AI-assisted composition suggestions, microphone input analysis, AR cymatics visualization
3. **Phase 4:** Subscription model, community preset sharing, headphone calibration profiles
