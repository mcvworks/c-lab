import { Platform, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import Screen from '@/src/components/Screen';
import Card from '@/src/components/Card';
import HeadphoneTest from '@/src/components/HeadphoneTest';
import { useResponsive } from '@/src/hooks/useResponsive';
import { useAudioStore } from '@/src/state/useAudioStore';
import { getHapticEngine } from '@/src/audio';
import { colors, spacing, typography } from '@/src/theme';

export default function SettingsScreen() {
  const { isTablet } = useResponsive();
  const hapticEnabled = useAudioStore((s) => s.hapticEnabled);
  const setHapticEnabled = useAudioStore((s) => s.setHapticEnabled);
  const hapticSupported = Platform.OS !== 'web';

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
          <Text style={styles.subtitle}>Preferences & information</Text>
        </View>

        {/* Audio Safety */}
        <Card style={styles.card}>
          <Text style={styles.sectionLabel}>Audio Safety</Text>
          <Text style={styles.body}>
            Protect your hearing by keeping volume at a comfortable level,
            especially during extended listening sessions. If you experience
            discomfort, ringing, or fatigue, lower the volume or take a break.
          </Text>
          <View style={styles.divider} />
          <Text style={styles.bodyBold}>Headphone use</Text>
          <Text style={styles.body}>
            Binaural beats require stereo headphones to produce the intended
            auditory effect. For the best experience across all features, use
            quality over-ear or in-ear headphones.
          </Text>
          <View style={styles.divider} />
          <Text style={styles.bodyBold}>Volume guidance</Text>
          <Text style={styles.bulletItem}>
            {'\u2022'} Start at a low volume and increase gradually.
          </Text>
          <Text style={styles.bulletItem}>
            {'\u2022'} If others nearby can hear your headphones, the volume is likely too high.
          </Text>
          <Text style={styles.bulletItem}>
            {'\u2022'} Take regular breaks during long sessions.
          </Text>
        </Card>

        {/* Headphone Stereo Test */}
        <HeadphoneTest />

        {/* Haptic Feedback */}
        <Card style={styles.card}>
          <Text style={styles.sectionLabel}>Haptic Feedback</Text>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.bodyBold}>Sync vibration to audio</Text>
              <Text style={styles.body}>
                Feel bass tones and binaural beat rhythms through subtle device vibration.
              </Text>
            </View>
            <Switch
              value={hapticEnabled}
              onValueChange={setHapticEnabled}
              disabled={!hapticSupported}
              trackColor={{ false: colors.border, true: colors.accentDim }}
              thumbColor={hapticEnabled ? colors.accent : colors.textMuted}
            />
          </View>
          {!hapticSupported && (
            <>
              <View style={styles.divider} />
              <Text style={styles.bodyMuted}>
                Haptic feedback is not available on this device.
              </Text>
            </>
          )}
          {hapticSupported && (
            <>
              <View style={styles.divider} />
              <Text style={styles.body}>
                When enabled, low-frequency tones produce a steady vibration, binaural beats pulse rhythmically, and cymatics frequency changes trigger gentle taps.
              </Text>
            </>
          )}
        </Card>

        {/* About Binaural Beats */}
        <Card style={styles.card}>
          <Text style={styles.sectionLabel}>About Binaural Beats</Text>
          <Text style={styles.body}>
            A binaural beat is an auditory perception that occurs when two slightly
            different frequencies are presented to each ear through headphones. The
            brain perceives a third tone at the difference between the two
            frequencies.
          </Text>
          <View style={styles.divider} />
          <Text style={styles.body}>
            For example, a 200 Hz tone in the left ear and a 210 Hz tone in the
            right ear produces a perceived 10 Hz binaural beat.
          </Text>
          <View style={styles.divider} />
          <Text style={styles.bodyMuted}>
            Resonance Lab is an exploratory sound tool. It does not make medical,
            therapeutic, or neurological claims. Binaural beats are presented here
            for personal exploration and creative use.
          </Text>
        </Card>

        {/* Small info cards — side by side on tablet */}
        <View style={isTablet ? styles.twoColumnRow : undefined}>
          {/* Export Quality */}
          <Card style={[styles.card, isTablet && styles.halfColumn]}>
            <Text style={styles.sectionLabel}>Export</Text>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Format</Text>
              <Text style={styles.rowValue}>WAV</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Sample Rate</Text>
              <Text style={styles.rowValue}>44,100 Hz</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Bit Depth</Text>
              <Text style={styles.rowValue}>16-bit</Text>
            </View>
            <Text style={styles.footnote}>
              Additional format and quality options in a future update.
            </Text>
          </Card>

          {/* Appearance */}
          <Card style={[styles.card, isTablet && styles.halfColumn]}>
            <Text style={styles.sectionLabel}>Appearance</Text>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Theme</Text>
              <Text style={styles.rowValue}>Dark</Text>
            </View>
            <Text style={styles.footnote}>
              Additional themes coming in a future update.
            </Text>
          </Card>
        </View>

        {/* App Info */}
        <Card style={styles.card}>
          <Text style={styles.sectionLabel}>About</Text>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>App</Text>
            <Text style={styles.rowValue}>Resonance Lab</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Version</Text>
            <Text style={styles.rowValue}>1.0.0</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Build</Text>
            <Text style={styles.rowValue}>MVP</Text>
          </View>
          <View style={styles.divider} />
          <Text style={styles.bodyMuted}>
            Hear it. See it. Shape it.
          </Text>
          <Text style={[styles.bodyMuted, { marginTop: spacing.xs }]}>
            An interactive sound lab for exploring tones, frequencies,
            visualizations, and ambient soundscapes.
          </Text>
        </Card>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: {
    fontSize: typography.xxl,
    fontWeight: typography.bold,
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
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
  body: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  bodyBold: {
    fontSize: typography.sm,
    color: colors.textPrimary,
    fontWeight: typography.medium,
    marginBottom: spacing.xs,
  },
  bodyMuted: {
    fontSize: typography.sm,
    color: colors.textMuted,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  bulletItem: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    lineHeight: 22,
    paddingLeft: spacing.sm,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  rowLabel: {
    fontSize: typography.sm,
    color: colors.textSecondary,
  },
  rowValue: {
    fontSize: typography.sm,
    color: colors.textPrimary,
    fontWeight: typography.medium,
  },
  footnote: {
    fontSize: typography.xs,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  twoColumnRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  halfColumn: {
    flex: 1,
  },
  bottomSpacer: {
    height: spacing.xxl,
  },
});
