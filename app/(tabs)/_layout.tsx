import { Tabs } from 'expo-router';
import { Platform, Text, StyleSheet } from 'react-native';
import { colors, typography } from '@/src/theme';

const TAB_ICONS: Record<string, string> = {
  explore: '♫',
  cymatics: '◎',
  composer: '♬',
  library: '▤',
  settings: '⚙',
};

function TabIcon({ name, color }: { name: string; color: string }) {
  return <Text style={[iconStyles.icon, { color }]}>{TAB_ICONS[name] ?? '•'}</Text>;
}

const iconStyles = StyleSheet.create({
  icon: { fontSize: 20, textAlign: 'center' },
});

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
