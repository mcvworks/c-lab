import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useColors } from '@/src/theme';
import { useThemeStore } from '@/src/state/useThemeStore';
import DiscoveryToast from '@/src/components/DiscoveryToast';

// Prevent splash from hiding until we're ready.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const c = useColors();

  useEffect(() => {
    useThemeStore.getState().load();
    SplashScreen.hideAsync();
  }, []);

  return (
    <>
      <StatusBar style="light" backgroundColor={c.background} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
      <DiscoveryToast />
    </>
  );
}
