import { StyleSheet, Text, View } from 'react-native';
import Screen from '@/src/components/Screen';
import Card from '@/src/components/Card';
import { colors, spacing, typography } from '@/src/theme';

export default function ExploreScreen() {
  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Explore</Text>
        <Text style={styles.subtitle}>Tone generator & visualizations</Text>
      </View>

      <Card style={styles.card}>
        <Text style={styles.placeholder}>Waveform visualization coming soon</Text>
      </Card>

      <Card style={styles.card}>
        <Text style={styles.placeholder}>Tone controls coming soon</Text>
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
  placeholder: {
    fontSize: typography.sm,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
});
