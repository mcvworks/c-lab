import { StyleSheet, Text, View } from 'react-native';
import Screen from '@/src/components/Screen';
import Card from '@/src/components/Card';
import { colors, spacing, typography } from '@/src/theme';

export default function ComposerScreen() {
  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Composer</Text>
        <Text style={styles.subtitle}>Binaural beats & ambient layers</Text>
      </View>

      <Card style={styles.card}>
        <Text style={styles.sectionLabel}>Binaural Beat</Text>
        <Text style={styles.placeholder}>Binaural beat engine coming soon</Text>
      </Card>

      <Card style={styles.card}>
        <Text style={styles.sectionLabel}>Ambient Layers</Text>
        <Text style={styles.placeholder}>Ambient layer system coming soon</Text>
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
  placeholder: {
    fontSize: typography.sm,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
});
