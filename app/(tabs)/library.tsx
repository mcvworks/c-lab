import { StyleSheet, Text, View } from 'react-native';
import Screen from '@/src/components/Screen';
import Card from '@/src/components/Card';
import { colors, spacing, typography } from '@/src/theme';

export default function LibraryScreen() {
  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Library</Text>
        <Text style={styles.subtitle}>Saved presets & exports</Text>
      </View>

      <Card style={styles.emptyState}>
        <Text style={styles.emptyIcon}>♪</Text>
        <Text style={styles.emptyTitle}>No presets yet</Text>
        <Text style={styles.emptyBody}>
          Save a session from Explore or Composer to see it here.
        </Text>
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
  emptyState: {
    marginTop: spacing.xl,
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: typography.lg,
    fontWeight: typography.semibold,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  emptyBody: {
    fontSize: typography.sm,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: spacing.lg,
  },
});
