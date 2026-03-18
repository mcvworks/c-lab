import { StyleSheet, Text, View } from 'react-native';
import Screen from '@/src/components/Screen';
import Card from '@/src/components/Card';
import { colors, spacing, typography } from '@/src/theme';

export default function CymaticsScreen() {
  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Cymatics</Text>
        <Text style={styles.subtitle}>Digital sand plate simulation</Text>
      </View>

      <Card glowing style={styles.plate}>
        <Text style={styles.placeholder}>Sand plate visualization coming soon</Text>
      </Card>

      <Card style={styles.card}>
        <Text style={styles.placeholder}>Frequency & amplitude controls coming soon</Text>
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
  plate: {
    marginBottom: spacing.md,
    height: 280,
    alignItems: 'center',
    justifyContent: 'center',
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
