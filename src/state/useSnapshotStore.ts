import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Snapshot, SnapshotSource } from '@/src/types/snapshot';
import type { ExploreSettings, ComposerSettings } from '@/src/types/preset';

const STORAGE_KEY = '@resonance_lab/snapshots';

interface SnapshotState {
  snapshots: Snapshot[];
  loaded: boolean;
  pendingRestore: Snapshot | null;

  loadSnapshots: () => Promise<void>;
  addSnapshot: (
    name: string,
    source: SnapshotSource,
    settings: ExploreSettings | ComposerSettings,
  ) => Promise<Snapshot>;
  deleteSnapshot: (id: string) => Promise<void>;
  renameSnapshot: (id: string, name: string) => Promise<void>;
  setPendingRestore: (snapshot: Snapshot | null) => void;
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

async function persist(snapshots: Snapshot[]) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(snapshots));
}

export const useSnapshotStore = create<SnapshotState>((set, get) => ({
  snapshots: [],
  loaded: false,
  pendingRestore: null,

  loadSnapshots: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const snapshots: Snapshot[] = raw ? JSON.parse(raw) : [];
      set({ snapshots, loaded: true });
    } catch {
      set({ snapshots: [], loaded: true });
    }
  },

  addSnapshot: async (name, source, settings) => {
    const snapshot: Snapshot = {
      id: generateId(),
      name: name.trim() || 'Snapshot',
      source,
      settings: JSON.parse(JSON.stringify(settings)),
      createdAt: Date.now(),
    };
    const updated = [snapshot, ...get().snapshots];
    set({ snapshots: updated });
    await persist(updated);
    return snapshot;
  },

  deleteSnapshot: async (id) => {
    const updated = get().snapshots.filter((s) => s.id !== id);
    set({ snapshots: updated });
    await persist(updated);
  },

  renameSnapshot: async (id, name) => {
    const updated = get().snapshots.map((s) =>
      s.id === id ? { ...s, name: name.trim() } : s,
    );
    set({ snapshots: updated });
    await persist(updated);
  },

  setPendingRestore: (snapshot) => set({ pendingRestore: snapshot }),
}));
