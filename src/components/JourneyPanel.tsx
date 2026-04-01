import { useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, useColors, spacing, typography, radius } from '@/src/theme';
import PrimaryButton from './PrimaryButton';
import type { BrainState } from '@/src/types/preset';

// ── Brain state definitions ──────────────────────────────────────
const BRAIN_STATES: BrainState[] = ['delta', 'theta', 'alpha', 'beta'];

const BRAIN_STATE_INFO: Record<BrainState, { label: string; range: string; hz: [number, number]; color: string }> = {
  delta: { label: 'Delta', range: '0.5 – 4 Hz', hz: [0.5, 4], color: '#8B4513' },
  theta: { label: 'Theta', range: '4 – 8 Hz', hz: [4, 8], color: '#D97706' },
  alpha: { label: 'Alpha', range: '8 – 13 Hz', hz: [8, 13], color: '#FA3C00' },
  beta:  { label: 'Beta', range: '13 – 30 Hz', hz: [13, 30], color: '#F08321' },
};

/** Get the representative beat frequency for a brain state (midpoint). */
export function beatForState(state: BrainState): number {
  const [lo, hi] = BRAIN_STATE_INFO[state].hz;
  return (lo + hi) / 2;
}

// ── Journey templates ────────────────────────────────────────────
export interface JourneyTemplate {
  label: string;
  startState: BrainState;
  endState: BrainState;
  duration: number; // minutes
}

const JOURNEY_TEMPLATES: JourneyTemplate[] = [
  { label: 'Focus \u2192 Relax', startState: 'beta', endState: 'alpha', duration: 20 },
  { label: 'Wind Down', startState: 'alpha', endState: 'theta', duration: 30 },
  { label: 'Deep Rest', startState: 'alpha', endState: 'delta', duration: 45 },
  { label: 'Wake Up', startState: 'theta', endState: 'beta', duration: 15 },
];

// ── Props ────────────────────────────────────────────────────────
interface JourneyPanelProps {
  startState: BrainState;
  endState: BrainState;
  duration: number;
  isPlaying: boolean;
  elapsedSeconds: number;
  onStartStateChange: (s: BrainState) => void;
  onEndStateChange: (s: BrainState) => void;
  onDurationChange: (d: number) => void;
  onApplyTemplate: (t: JourneyTemplate) => void;
}

/** Compute the interpolated beat frequency at a given progress (0-1). */
export function interpolateBeat(startState: BrainState, endState: BrainState, progress: number): number {
  const startHz = beatForState(startState);
  const endHz = beatForState(endState);
  return startHz + (endHz - startHz) * Math.min(1, Math.max(0, progress));
}

export default function JourneyPanel({
  startState,
  endState,
  duration,
  isPlaying,
  elapsedSeconds,
  onStartStateChange,
  onEndStateChange,
  onDurationChange,
  onApplyTemplate,
}: JourneyPanelProps) {
  const c = useColors();
  const totalSeconds = duration * 60;
  const progress = totalSeconds > 0 ? Math.min(1, elapsedSeconds / totalSeconds) : 0;
  const currentBeat = interpolateBeat(startState, endState, progress);

  const handleTemplate = useCallback((t: JourneyTemplate) => {
    onApplyTemplate(t);
  }, [onApplyTemplate]);

  return (
    <View style={styles.container}>
      {/* Journey Templates */}
      <Text style={styles.label}>Journey Templates</Text>
      <View style={styles.templateRow}>
        {JOURNEY_TEMPLATES.map((t) => (
          <PrimaryButton
            key={t.label}
            title={t.label}
            variant="ghost"
            onPress={() => handleTemplate(t)}
            style={styles.templateButton}
            disabled={isPlaying}
          />
        ))}
      </View>

      {/* Start / End State Selectors */}
      <View style={styles.stateSelectRow}>
        <View style={styles.stateSelectCol}>
          <Text style={styles.label}>Start State</Text>
          <View style={styles.stateButtons}>
            {BRAIN_STATES.map((s) => (
              <PrimaryButton
                key={`start-${s}`}
                title={BRAIN_STATE_INFO[s].label}
                variant={startState === s ? 'filled' : 'ghost'}
                onPress={() => onStartStateChange(s)}
                style={styles.stateButton}
                disabled={isPlaying}
              />
            ))}
          </View>
          <Text style={styles.stateHint}>{BRAIN_STATE_INFO[startState].range}</Text>
        </View>

        <Text style={styles.arrow}>{'\u2192'}</Text>

        <View style={styles.stateSelectCol}>
          <Text style={styles.label}>End State</Text>
          <View style={styles.stateButtons}>
            {BRAIN_STATES.map((s) => (
              <PrimaryButton
                key={`end-${s}`}
                title={BRAIN_STATE_INFO[s].label}
                variant={endState === s ? 'filled' : 'ghost'}
                onPress={() => onEndStateChange(s)}
                style={styles.stateButton}
                disabled={isPlaying}
              />
            ))}
          </View>
          <Text style={styles.stateHint}>{BRAIN_STATE_INFO[endState].range}</Text>
        </View>
      </View>

      {/* Duration quick-picks */}
      <Text style={[styles.label, styles.topSpacing]}>Journey Duration</Text>
      <View style={styles.durationRow}>
        {[10, 15, 20, 30, 45, 60].map((d) => (
          <PrimaryButton
            key={d}
            title={`${d}m`}
            variant={duration === d ? 'filled' : 'ghost'}
            onPress={() => onDurationChange(d)}
            style={styles.durationButton}
            disabled={isPlaying}
          />
        ))}
      </View>

      {/* Timeline Visualization */}
      <Text style={[styles.label, styles.topSpacing]}>Timeline</Text>
      <View style={styles.timelineContainer}>
        {/* Zone labels */}
        <View style={styles.timelineLabels}>
          <Text style={[styles.zoneLabel, { color: BRAIN_STATE_INFO[startState].color }]}>
            {BRAIN_STATE_INFO[startState].label}
          </Text>
          <Text style={[styles.zoneLabel, { color: BRAIN_STATE_INFO[endState].color }]}>
            {BRAIN_STATE_INFO[endState].label}
          </Text>
        </View>

        {/* Gradient bar */}
        <View style={[styles.timelineBar, { backgroundColor: c.surfaceElevated }]}>
          <View
            style={[
              styles.timelineGradientStart,
              { backgroundColor: BRAIN_STATE_INFO[startState].color, opacity: 0.6 },
            ]}
          />
          <View
            style={[
              styles.timelineGradientEnd,
              { backgroundColor: BRAIN_STATE_INFO[endState].color, opacity: 0.6 },
            ]}
          />
          {/* Progress indicator */}
          {isPlaying && (
            <View style={[styles.timelineProgress, { left: `${progress * 100}%` }]}>
              <View style={styles.timelineMarker} />
            </View>
          )}
        </View>

        {/* Time labels */}
        <View style={styles.timelineLabels}>
          <Text style={styles.timeLabel}>0:00</Text>
          <Text style={styles.timeLabel}>{duration}:00</Text>
        </View>
      </View>

      {/* Current status readout (during playback) */}
      {isPlaying && (
        <View style={[styles.readout, { backgroundColor: c.background }]}>
          <View style={styles.readoutItem}>
            <Text style={styles.readoutLabel}>CURRENT BEAT</Text>
            <Text style={styles.readoutValue}>{currentBeat.toFixed(1)} Hz</Text>
          </View>
          <View style={[styles.readoutDivider, { backgroundColor: c.surfaceElevated }]} />
          <View style={styles.readoutItem}>
            <Text style={styles.readoutLabel}>PROGRESS</Text>
            <Text style={styles.readoutValue}>{Math.round(progress * 100)}%</Text>
          </View>
        </View>
      )}

      <Text style={styles.disclaimer}>
        Brain state labels are approximate frequency ranges commonly referenced in EEG research. Individual experiences may vary.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  label: {
    fontSize: typography.sm,
    fontWeight: typography.medium,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  topSpacing: {
    marginTop: spacing.lg,
  },
  templateRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  templateButton: {
    flex: 1,
    minWidth: 100,
    paddingVertical: spacing.xs,
  },
  stateSelectRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  stateSelectCol: {
    flex: 1,
  },
  stateButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  stateButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    minWidth: 0,
  },
  stateHint: {
    fontSize: typography.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  arrow: {
    fontSize: typography.xl,
    color: colors.textMuted,
    marginTop: 28,
    paddingHorizontal: 2,
  },
  durationRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  durationButton: {
    flex: 1,
    minWidth: 44,
    paddingVertical: spacing.xs,
  },
  // Timeline
  timelineContainer: {
    marginTop: spacing.xs,
  },
  timelineLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  zoneLabel: {
    fontSize: typography.xs,
    fontWeight: typography.semibold,
    letterSpacing: 0.5,
  },
  timeLabel: {
    fontSize: typography.xs,
    color: colors.textMuted,
    fontVariant: ['tabular-nums'],
  },
  timelineBar: {
    height: 12,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceElevated,
    overflow: 'hidden',
    marginVertical: spacing.xs,
    flexDirection: 'row',
    position: 'relative',
  },
  timelineGradientStart: {
    flex: 1,
    borderTopLeftRadius: radius.full,
    borderBottomLeftRadius: radius.full,
  },
  timelineGradientEnd: {
    flex: 1,
    borderTopRightRadius: radius.full,
    borderBottomRightRadius: radius.full,
  },
  timelineProgress: {
    position: 'absolute',
    top: -4,
    marginLeft: -6,
    width: 12,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineMarker: {
    width: 4,
    height: 20,
    borderRadius: 2,
    backgroundColor: colors.textPrimary,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4,
  },
  // Readout
  readout: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  readoutItem: {
    flex: 1,
    alignItems: 'center',
  },
  readoutDivider: {
    width: 1,
    backgroundColor: colors.surfaceElevated,
    marginHorizontal: spacing.sm,
  },
  readoutLabel: {
    fontSize: typography.xs,
    fontWeight: typography.semibold,
    color: colors.textMuted,
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  readoutValue: {
    fontSize: typography.xl,
    fontWeight: typography.bold,
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  disclaimer: {
    fontSize: typography.xs,
    color: colors.textMuted,
    marginTop: spacing.md,
    lineHeight: 16,
    fontStyle: 'italic',
  },
});
