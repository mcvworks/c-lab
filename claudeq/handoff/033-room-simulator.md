# Handoff
- Task: 033 — Room simulator with reverb and visual space
- Status: done
- Summary: Added algorithmic room reverb engine with 5 room presets, wet/dry control, animated room visualization, and smooth crossfade transitions between rooms. Reverb applies to both tone and noise modes.
- Files Changed:
  - `src/audio/RoomReverbEngine.ts` — new Schroeder-style reverb (parallel comb + series allpass filters) with 5 presets
  - `src/audio/ToneGenerator.ts` — spliced reverb engine into signal chain between panner and destination
  - `src/audio/index.ts` — exported RoomReverbEngine types and constants
  - `src/state/useAudioStore.ts` — added roomEnabled, roomPreset, roomWetDry state + actions
  - `src/components/RoomVisualizer.tsx` — new SVG visualization with room shape outlines and animated ripple/reflection effects
  - `src/components/index.ts` — exported RoomVisualizer
  - `src/types/preset.ts` — added room fields to ExploreSettings
  - `app/(tabs)/explore.tsx` — added SPACE section with room toggle, preset selector, visualizer, wet/dry slider
- Commands Run: `npx tsc --noEmit` — clean build
- Testing:
  1. Open Explore tab
  2. Scroll to SPACE section, toggle Room Reverb ON
  3. Play any tone or noise — should hear reverb applied
  4. Switch between room presets (Small Room, Cathedral, Cave, Open Air, Box) — each should have distinct character, no clicks
  5. Adjust wet/dry slider — 0% = dry, 100% = heavily reverbed
  6. Visualization should show room shape outline with animated ripples when playing
  7. Save a preset with room enabled, load it from Library — room settings should restore
- Blockers: none
- Next Recommended Task: 034 (Lissajous mode)
- Notes:
  - Reverb uses algorithmic approach (comb + allpass filters) rather than convolution — no impulse response files needed
  - Room switching uses crossfade to avoid clicks from abrupt reverb tail cutoff
  - On native platforms, reverb is a passthrough (Web Audio only) — native reverb would need a different approach
  - Each room has distinct lowpass cutoff to simulate air absorption differences
