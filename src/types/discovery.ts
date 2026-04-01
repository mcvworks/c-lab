import type { FrequencyCategory } from '@/src/data/frequencyCatalog';

/** A frequency the user has discovered by playing it */
export interface FrequencyDiscovery {
  /** Slug from the catalog entry */
  slug: string;
  /** Timestamp of first discovery */
  discoveredAt: number;
  /** Which tab the discovery was made on */
  source: 'explore' | 'cymatics' | 'composer';
}

/** A cymatics pattern captured to the atlas */
export interface CymaticsPattern {
  id: string;
  /** Frequency that produced the pattern */
  frequency: number;
  /** Waveform type used */
  waveform: string;
  /** Plate shape */
  plateShape: 'circle' | 'square' | 'hexagon';
  /** Particle material */
  material: 'sand' | 'salt' | 'metal';
  /** Amplitude at capture time */
  amplitude: number;
  /** Approximate node count detected */
  nodeCount: number;
  /** Symmetry/complexity score 1–3 */
  starRating: number;
  /** Second frequency if dual-frequency mode was active */
  frequency2?: number;
  waveform2?: string;
  /** Timestamp of capture */
  capturedAt: number;
}

/** Lifetime garden statistics */
export interface GardenStats {
  /** Best harmony score ever achieved (0–100) */
  bestScore: number;
  /** Total seeds planted across all sessions */
  totalSeedsPlanted: number;
  /** Number of gardens that reached score >= 80 */
  harmoniousGardens: number;
}

/** A milestone the user has achieved */
export interface Milestone {
  id: string;
  /** Human-readable title */
  title: string;
  /** When it was achieved */
  achievedAt: number;
}

/** Full persisted discovery state */
export interface DiscoveryData {
  discoveries: FrequencyDiscovery[];
  patterns: CymaticsPattern[];
  gardenStats: GardenStats;
  milestones: Milestone[];
}
