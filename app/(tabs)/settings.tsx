import { StyleSheet, Text, View } from 'react-native';
import Screen from '@/src/components/Screen';
import Card from '@/src/components/Card';
import { colors, spacing, typography } from '@/src/theme';

export default function SettingsScreen() {
  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>Preferences & information</Text>
      </View>

      <Card style={styles.card}>
        <Text style={styles.sectionLabel}>Audio Safety</Text>
        <Text style={styles.body}>
          Use caution with prolonged exposure to loud tones. Keep volume at a comfortable level.
          Binaural beats work best with stereo headphones.
        </Text>
      </Card>

      <Card style={styles.card}>
        <Text style={styles.sectionLabel}>App Info</Text>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Version</Text>
          <Text style={styles.rowValue}>1.0.0</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Build</Text>
          <Text style={styles.rowValue}>MVP</Text>
        </View>
      </Card>

      <Card style={styles.card}>
        <Text style={styles.sectionLabel}>Appearance</Text>
        <Text style={styles.placeholder}>Theme selection coming soon</Text>
      </Card>

      <Card style={styles.card}>
        <Text style={styles.sectionLabel}>Export</Text>
        <Text style={styles.placeholder}>Export quality settings coming soon</Text>
      </Card>
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
  placeholder: {
    fontSize: typography.sm,
    color: colors.textMuted,
    paddingVertical: spacing.sm,
  },
});
