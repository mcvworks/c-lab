import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Preset, PresetType, ExploreSettings, ComposerSettings } from '@/src/types/preset';

const STORAGE_KEY = '@resonance_lab/presets';

interface PresetState {
  presets: Preset[];
  loaded: boolean;
  pendingLoad: Preset | null;

  loadPresets: () => Promise<void>;
  savePreset: (name: string, type: PresetType, settings: ExploreSettings | ComposerSettings) => Promise<Preset>;
  deletePreset: (id: string) => Promise<void>;
  duplicatePreset: (id: string) => Promise<Preset | null>;
  renamePreset: (id: string, name: string) => Promise<void>;
  setPendingLoad: (preset: Preset | null) => void;
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

async function persist(presets: Preset[]) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
}

export const usePresetStore = create<PresetState>((set, get) => ({
  presets: [],
  loaded: false,
  pendingLoad: null,

  loadPresets: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const presets: Preset[] = raw ? JSON.parse(raw) : [];
      set({ presets, loaded: true });
    } catch {
      set({ presets: [], loaded: true });
    }
  },

  savePreset: async (name, type, settings) => {
    const now = Date.now();
    const preset: Preset = {
      id: generateId(),
      name: name.trim() || (type === 'explore' ? 'Explore Preset' : 'Composer Preset'),
      type,
      settings,
      createdAt: now,
      updatedAt: now,
    };
    const updated = [preset, ...get().presets];
    set({ presets: updated });
    await persist(updated);
    return preset;
  },

  deletePreset: async (id) => {
    const updated = get().presets.filter((p) => p.id !== id);
    set({ presets: updated });
    await persist(updated);
  },

  duplicatePreset: async (id) => {
    const source = get().presets.find((p) => p.id === id);
    if (!source) return null;
    const now = Date.now();
    const copy: Preset = {
      ...source,
      id: generateId(),
      name: `${source.name} (copy)`,
      createdAt: now,
      updatedAt: now,
      settings: JSON.parse(JSON.stringify(source.settings)),
    };
    const idx = get().presets.findIndex((p) => p.id === id);
    const updated = [...get().presets];
    updated.splice(idx + 1, 0, copy);
    set({ presets: updated });
    await persist(updated);
    return copy;
  },

  setPendingLoad: (preset) => set({ pendingLoad: preset }),

  renamePreset: async (id, name) => {
    const updated = get().presets.map((p) =>
      p.id === id ? { ...p, name: name.trim(), updatedAt: Date.now() } : p,
    );
    set({ presets: updated });
    await persist(updated);
  },
}));
