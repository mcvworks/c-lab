# Resonance Lab

**Hear it. See it. Shape it.**

A headphone-first interactive sound exploration app built with React Native + Expo.

---

## What It Is

Resonance Lab is a premium, interactive sound lab that combines:

- **Sound education** — learn how tones, waveforms, and binaural beats work
- **Real-time visualizations** — waveform, spectrum, and digital cymatics / sand plate simulations
- **Ambient & binaural composition** — build layered soundscapes and binaural beat sessions
- **High-fidelity headphone-first listening** — designed and tuned for stereo headphones

---

## Platform Targets

- iPad (primary, first-class experience)
- iPhone (supported)
- Android / desktop (future phases)

---

## Tech Stack

| Concern | Choice |
|---|---|
| Framework | React Native + Expo |
| Language | TypeScript |
| Navigation | Expo Router |
| Animation | React Native Reanimated |
| Gestures | React Native Gesture Handler |
| State | Zustand |
| Rendering | React Native Skia / SVG |
| Audio | Expo AV |
| Persistence | AsyncStorage |

---

## MVP Features

| Screen | Status |
|---|---|
| Explore (tone generator, waveform, spectrum) | Queued |
| Cymatics (digital sand plate simulation) | Queued |
| Composer (binaural beats + ambient layers) | Queued |
| Library (saved presets + exports) | Queued |
| Settings (safety info, preferences) | Queued |

---

## Project Status

This project is in the **pre-development / task queue initialization phase**.

All 19 application tasks are defined and queued in `claudeq/queue/`. No application code exists yet.

See [`docs/launch-readiness.md`](docs/launch-readiness.md) for the full readiness summary and recommended execution plan.

---

## Development Setup

Once Task 001 is executed, setup will be:

```bash
npm install
npx expo start
```

Open in Expo Go on iOS/iPadOS or run in the simulator.

---

## Architecture

```
app/                    # Expo Router screens
src/
  components/           # Shared UI components
  features/
    explore/            # Tone generator + waveform/spectrum
    cymatics/           # Sand plate simulation
    composer/           # Binaural + ambient session builder
    library/            # Presets + exports
    settings/           # Settings + safety info
  audio/                # Audio engine
  state/                # Zustand stores
  hooks/                # Shared hooks
  lib/                  # Utilities
  theme/                # Design tokens + theme config
  types/                # Shared TypeScript types
claudeq/                # ClaudeQ task queue management
docs/                   # Project documentation
handoffs/               # Task handoff notes
```

---

## Important Notes

- Binaural beats work best with stereo headphones. Label this clearly in the UI.
- Do not make medical or neurological treatment claims.
- Include volume safety warnings for prolonged playback.
- Dark mode first. iPad-optimized layout. Premium aesthetic.

---

## Non-Goals (MVP)

- User authentication / cloud sync
- Social or community features
- Backend services
- Subscriptions or paywall
- Advanced DAW timeline editing
- Microphone input processing
- Android-specific polish
- AR mode / video export
