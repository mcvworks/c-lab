import React, { useCallback, useRef } from 'react';
import { Alert, Animated, StyleSheet, Text, View } from 'react-native';
import IconButton from './IconButton';
import { useSnapshotStore } from '@/src/state/useSnapshotStore';
import type { SnapshotSource } from '@/src/types/snapshot';
import type { ExploreSettings, ComposerSettings } from '@/src/types/preset';
import { colors } from '@/src/theme';

interface SnapshotButtonProps {
  /** Which screen this button lives on */
  source: SnapshotSource;
  /** Current parameter settings to capture */
  getSettings: () => ExploreSettings | ComposerSettings;
  /** Auto-generated name for the snapshot */
  defaultName: string;
  /** Only allow capture when audio is playing */
  disabled?: boolean;
}

export default function SnapshotButton({
  source,
  getSettings,
  defaultName,
  disabled = false,
}: SnapshotButtonProps) {
  const addSnapshot = useSnapshotStore((s) => s.addSnapshot);
  const flashOpacity = useRef(new Animated.Value(0)).current;

  const handleCapture = useCallback(async () => {
    const settings = getSettings();
    const snapshot = await addSnapshot(defaultName, source, settings);

    // Flash feedback
    Animated.sequence([
      Animated.timing(flashOpacity, {
        toValue: 1,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(flashOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    Alert.alert('Snapshot saved', `"${snapshot.name}" added to Library.`);
  }, [getSettings, defaultName, source, addSnapshot, flashOpacity]);

  return (
    <View>
      <IconButton variant="outline" onPress={handleCapture} disabled={disabled}>
        <Text style={styles.icon}>📷</Text>
      </IconButton>
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          styles.flash,
          { opacity: flashOpacity },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  icon: {
    fontSize: 18,
  },
  flash: {
    backgroundColor: colors.accent,
    borderRadius: 22,
  },
});
