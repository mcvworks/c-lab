import { Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Platform } from 'react-native';
import { colors, typography } from '@/src/theme';

type TabIconProps = {
  color: string;
  iosName: string;
  androidName: string;
};

function TabIcon({ color, iosName, androidName }: TabIconProps) {
  return (
    <SymbolView
      name={{ ios: iosName, android: androidName, web: androidName } as any}
      tintColor={color}
      size={24}
    />
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.tabActive,
        tabBarInactiveTintColor: colors.tabInactive,
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
          tabBarIcon: ({ color }) => (
            <TabIcon color={color} iosName="waveform" androidName="graphic_eq" />
          ),
        }}
      />
      <Tabs.Screen
        name="cymatics"
        options={{
          title: 'Cymatics',
          tabBarIcon: ({ color }) => (
            <TabIcon color={color} iosName="circle.hexagongrid" androidName="grain" />
          ),
        }}
      />
      <Tabs.Screen
        name="composer"
        options={{
          title: 'Composer',
          tabBarIcon: ({ color }) => (
            <TabIcon color={color} iosName="music.note.list" androidName="queue_music" />
          ),
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: 'Library',
          tabBarIcon: ({ color }) => (
            <TabIcon color={color} iosName="books.vertical" androidName="library_books" />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => (
            <TabIcon color={color} iosName="gearshape" androidName="settings" />
          ),
        }}
      />
    </Tabs>
  );
}
