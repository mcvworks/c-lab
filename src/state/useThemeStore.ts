import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@resonance_lab/theme';

export type ThemeMode = 'dark' | 'oled';

interface ThemeState {
  mode: ThemeMode;
  loaded: boolean;
  load: () => Promise<void>;
  setMode: (mode: ThemeMode) => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  mode: 'dark',
  loaded: false,

  load: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw === 'oled' || raw === 'dark') {
        set({ mode: raw, loaded: true });
      } else {
        set({ loaded: true });
      }
    } catch {
      set({ loaded: true });
    }
  },

  setMode: (mode) => {
    set({ mode });
    AsyncStorage.setItem(STORAGE_KEY, mode);
  },
}));
