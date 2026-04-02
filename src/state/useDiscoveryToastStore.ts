import { create } from 'zustand';
import type { CatalogEntry } from '@/src/data/frequencyCatalog';

interface DiscoveryToastState {
  /** The entry currently being shown in the toast, or null */
  entry: CatalogEntry | null;
  /** Show a discovery toast */
  show: (entry: CatalogEntry) => void;
  /** Dismiss the current toast */
  dismiss: () => void;
}

export const useDiscoveryToastStore = create<DiscoveryToastState>((set) => ({
  entry: null,
  show: (entry) => set({ entry }),
  dismiss: () => set({ entry: null }),
}));
