import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '@/src/theme';
import { StereoTestEngine, StereoTestMode } from '@/src/audio';
import Card from './Card';

const TESTS: { mode: StereoTestMode; label: string; icon: string; description: string }[] = [
  { mode: 'left', label: 'Left', icon: 'L', description: 'Tone plays in left ear only' },
  { mode: 'right', label: 'Right', icon: 'R', description: 'Tone plays in right ear only' },
  { mode: 'both', label: 'Both', icon: 'LR', description: 'Tone plays in both ears equally' },
  { mode: 'phase', label: 'Phase', icon: '\u00d8', description: 'Inverted phase — sounds hollow in stereo, silent in mono' },
];

export default function HeadphoneTest() {
  const engineRef = useRef<StereoTestEngine | null>(null);
  const [activeMode, setActiveMode] = useState<StereoTestMode | null>(null);

  useEffect(() => {
    return () => {
      engineRef.current?.dispose();
    };
  }, []);

  const getEngine = useCallback(() => {
    if (!engineRef.current) {
      engineRef.current = new StereoTestEngine();
    }
    return engineRef.current;
  }, []);

  const handlePress = useCallback(async (mode: StereoTestMode) => {
    const engine = getEngine();
    if (activeMode === mode) {
      await engine.stop();
      setActiveMode(null);
    } else {
      await engine.play(mode);
      setActiveMode(mode);
    }
  }, [activeMode, getEngine]);

  return (
    <Card style={styles.card}>
      <Text style={styles.sectionLabel}>Headphone Check</Text>
      <Text style={styles.hint}>
        Put on your stereo headphones and tap each button. You should hear the tone only in the indicated ear.
      </Text>

      <View style={styles.grid}>
        {TESTS.map((test) => {
          const isActive = activeMode === test.mode;
          return (
            <Pressable
              key={test.mode}
              onPress={() => handlePress(test.mode)}
              style={({ pressed }) => [
                styles.testButton,
                isActive && styles.testButtonActive,
                pressed && !isActive && styles.testButtonPressed,
              ]}
            >
              <Text style={[styles.testIcon, isActive && styles.testIconActive]}>
                {test.icon}
              </Text>
              <Text style={[styles.testLabel, isActive && styles.testLabelActive]}>
                {test.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {activeMode && (
        <Text style={styles.description}>
          {TESTS.find((t) => t.mode === activeMode)?.description}
        </Text>
      )}

      <View style={styles.noteRow}>
        <Text style={styles.noteIcon}>&#x1F3A7;</Text>
        <Text style={styles.noteText}>
          Binaural beats and stereo features require headphones for the intended effect. Speakers will not produce proper channel separation.
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
  },
  sectionLabel: {
    fontSize: typography.sm,
    fontWeight: typography.semibold,
    color: colors.accent,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  hint: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  grid: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  testButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  testButtonActive: {
    backgroundColor: colors.accentGlow,
    borderColor: colors.accent,
  },
  testButtonPressed: {
    opacity: 0.7,
  },
  testIcon: {
    fontSize: typography.xl,
    fontWeight: typography.bold,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  testIconActive: {
    color: colors.accent,
  },
  testLabel: {
    fontSize: typography.xs,
    fontWeight: typography.semibold,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  testLabelActive: {
    color: colors.accent,
  },
  description: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
    fontStyle: 'italic',
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  noteIcon: {
    fontSize: typography.md,
  },
  noteText: {
    flex: 1,
    fontSize: typography.xs,
    color: colors.textMuted,
    lineHeight: 16,
  },
});
