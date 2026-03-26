import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ExportRecord } from '@/src/types/preset';

const STORAGE_KEY = '@resonance_lab/exports';

interface ExportState {
  exports: ExportRecord[];
  loaded: boolean;

  loadExports: () => Promise<void>;
  addExport: (record: ExportRecord) => Promise<void>;
  deleteExport: (id: string) => Promise<void>;
}

async function persist(exports: ExportRecord[]) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(exports));
}

export const useExportStore = create<ExportState>((set, get) => ({
  exports: [],
  loaded: false,

  loadExports: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const exports: ExportRecord[] = raw ? JSON.parse(raw) : [];
      set({ exports, loaded: true });
    } catch {
      set({ exports: [], loaded: true });
    }
  },

  addExport: async (record) => {
    const updated = [record, ...get().exports];
    set({ exports: updated });
    await persist(updated);
  },

  deleteExport: async (id) => {
    const updated = get().exports.filter((e) => e.id !== id);
    set({ exports: updated });
    await persist(updated);
  },
}));
