import { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { colors, typography, useColors } from '@/src/theme';
import { useAudioStore } from '@/src/state/useAudioStore';

const TAB_ICONS: Record<string, string> = {
  explore: '♫',
  cymatics: '◎',
  composer: '♬',
  garden: '❋',
  library: '▤',
  settings: '⚙',
};

type SourceKey = 'explore' | 'cymatics' | 'composer' | 'garden';

function isSourceTab(name: string): name is SourceKey {
  return ['explore', 'cymatics', 'composer', 'garden'].includes(name);
}

function TabIcon({ name, color }: { name: string; color: string }) {
  const { activeSource, isPlaying, composerPlaying, gardenPlaying, stop, setComposerPlaying, setGardenPlaying } =
    useAudioStore();

  // Determine if this tab is playing
  let tabIsPlaying = false;
  if (isSourceTab(name)) {
    if (name === 'composer') {
      tabIsPlaying = composerPlaying;
    } else if (name === 'garden') {
      tabIsPlaying = gardenPlaying;
    } else {
      tabIsPlaying = isPlaying && activeSource === name;
    }
  }

  // Pulse animation
  const pulseOpacity = useSharedValue(1);

  useEffect(() => {
    if (tabIsPlaying) {
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(0.3, { duration: 600 }),
          withTiming(1, { duration: 600 }),
        ),
        -1,
        false,
      );
    } else {
      pulseOpacity.value = 1;
    }
  }, [tabIsPlaying, pulseOpacity]);

  const dotStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  const handleStopPress = () => {
    if (name === 'composer') {
      setComposerPlaying(false);
    } else if (name === 'garden') {
      setGardenPlaying(false);
    } else {
      stop();
    }
  };

  return (
    <View style={iconStyles.container}>
      <Text style={[iconStyles.icon, { color }]}>{TAB_ICONS[name] ?? '•'}</Text>
      {tabIsPlaying && (
        <Pressable onPress={handleStopPress} hitSlop={8} style={iconStyles.dotPress}>
          <Animated.View style={[iconStyles.dot, dotStyle]} />
        </Pressable>
      )}
    </View>
  );
}

const iconStyles = StyleSheet.create({
  container: {
    width: 28,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { fontSize: 20, textAlign: 'center' },
  dotPress: {
    position: 'absolute',
    top: -2,
    right: -4,
    padding: 2,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 3,
    elevation: 4,
  },
});

export default function TabLayout() {
  const c = useColors();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: c.surface,
          borderTopColor: c.border,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: c.tabActive,
        tabBarInactiveTintColor: c.tabInactive,
        tabBarLabelStyle: {
          fontSize: typography.xs,
          fontWeight: typography.medium,
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color }) => <TabIcon name="explore" color={color} />,
        }}
      />
      <Tabs.Screen
        name="cymatics"
        options={{
          title: 'Cymatics',
          tabBarIcon: ({ color }) => <TabIcon name="cymatics" color={color} />,
        }}
      />
      <Tabs.Screen
        name="composer"
        options={{
          title: 'Composer',
          tabBarIcon: ({ color }) => <TabIcon name="composer" color={color} />,
        }}
      />
      <Tabs.Screen
        name="garden"
        options={{
          title: 'Garden',
          tabBarIcon: ({ color }) => <TabIcon name="garden" color={color} />,
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: 'Library',
          tabBarIcon: ({ color }) => <TabIcon name="library" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <TabIcon name="settings" color={color} />,
        }}
      />
    </Tabs>
  );
}
