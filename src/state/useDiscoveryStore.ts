import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  FrequencyDiscovery,
  CymaticsPattern,
  GardenStats,
  Milestone,
  DiscoveryData,
} from '@/src/types/discovery';

const STORAGE_KEY = '@resonance_lab/discoveries';

const DEFAULT_GARDEN_STATS: GardenStats = {
  bestScore: 0,
  totalSeedsPlanted: 0,
  harmoniousGardens: 0,
};

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

interface DiscoveryState extends DiscoveryData {
  loaded: boolean;

  // Lifecycle
  load: () => Promise<void>;

  // Frequency discoveries
  addDiscovery: (slug: string, source: FrequencyDiscovery['source']) => void;
  isDiscovered: (slug: string) => boolean;
  discoveryCount: () => number;

  // Cymatics patterns
  addPattern: (pattern: Omit<CymaticsPattern, 'id' | 'capturedAt'>) => CymaticsPattern;
  deletePattern: (id: string) => void;
  patternCountByShape: (shape: CymaticsPattern['plateShape']) => number;

  // Garden stats
  updateGardenStats: (update: Partial<GardenStats>) => void;
  incrementSeedsPlanted: (count?: number) => void;

  // Milestones
  addMilestone: (id: string, title: string) => void;
  hasMilestone: (id: string) => boolean;
}

async function persist(data: DiscoveryData) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function snapshot(state: DiscoveryState): DiscoveryData {
  return {
    discoveries: state.discoveries,
    patterns: state.patterns,
    gardenStats: state.gardenStats,
    milestones: state.milestones,
  };
}

export const useDiscoveryStore = create<DiscoveryState>((set, get) => ({
  discoveries: [],
  patterns: [],
  gardenStats: { ...DEFAULT_GARDEN_STATS },
  milestones: [],
  loaded: false,

  // ── Lifecycle ────────────────────────────────────────────

  load: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data: DiscoveryData = JSON.parse(raw);
        set({
          discoveries: data.discoveries ?? [],
          patterns: data.patterns ?? [],
          gardenStats: { ...DEFAULT_GARDEN_STATS, ...data.gardenStats },
          milestones: data.milestones ?? [],
          loaded: true,
        });
      } else {
        set({ loaded: true });
      }
    } catch {
      set({ loaded: true });
    }
  },

  // ── Frequency discoveries ────────────────────────────────

  addDiscovery: (slug, source) => {
    const state = get();
    if (state.discoveries.some((d) => d.slug === slug)) return;
    const discovery: FrequencyDiscovery = {
      slug,
      discoveredAt: Date.now(),
      source,
    };
    const updated = { ...snapshot(state), discoveries: [...state.discoveries, discovery] };
    set({ discoveries: updated.discoveries });
    persist(updated);
  },

  isDiscovered: (slug) => {
    return get().discoveries.some((d) => d.slug === slug);
  },

  discoveryCount: () => {
    return get().discoveries.length;
  },

  // ── Cymatics patterns ────────────────────────────────────

  addPattern: (patternData) => {
    const pattern: CymaticsPattern = {
      ...patternData,
      id: generateId(),
      capturedAt: Date.now(),
    };
    const state = get();
    const updated = { ...snapshot(state), patterns: [...state.patterns, pattern] };
    set({ patterns: updated.patterns });
    persist(updated);
    return pattern;
  },

  deletePattern: (id) => {
    const state = get();
    const patterns = state.patterns.filter((p) => p.id !== id);
    const updated = { ...snapshot(state), patterns };
    set({ patterns });
    persist(updated);
  },

  patternCountByShape: (shape) => {
    return get().patterns.filter((p) => p.plateShape === shape).length;
  },

  // ── Garden stats ─────────────────────────────────────────

  updateGardenStats: (update) => {
    const state = get();
    const gardenStats = { ...state.gardenStats, ...update };
    // Track best score
    if (update.bestScore !== undefined && update.bestScore > state.gardenStats.bestScore) {
      gardenStats.bestScore = update.bestScore;
    } else {
      gardenStats.bestScore = state.gardenStats.bestScore;
    }
    const updated = { ...snapshot(state), gardenStats };
    set({ gardenStats });
    persist(updated);
  },

  incrementSeedsPlanted: (count = 1) => {
    const state = get();
    const gardenStats = {
      ...state.gardenStats,
      totalSeedsPlanted: state.gardenStats.totalSeedsPlanted + count,
    };
    const updated = { ...snapshot(state), gardenStats };
    set({ gardenStats });
    persist(updated);
  },

  // ── Milestones ───────────────────────────────────────────

  addMilestone: (id, title) => {
    const state = get();
    if (state.milestones.some((m) => m.id === id)) return;
    const milestone: Milestone = { id, title, achievedAt: Date.now() };
    const milestones = [...state.milestones, milestone];
    const updated = { ...snapshot(state), milestones };
    set({ milestones });
    persist(updated);
  },

  hasMilestone: (id) => {
    return get().milestones.some((m) => m.id === id);
  },
}));
