/**
 * Catalog of notable frequencies for the Frequency Collector.
 * Each entry has a unique slug, display name, exact frequency,
 * category, and a short educational description.
 */

export type FrequencyCategory =
  | 'solfeggio'
  | 'musical'
  | 'scientific'
  | 'brainwave'
  | 'harmonic'
  | 'cultural';

export interface CatalogEntry {
  slug: string;
  name: string;
  frequency: number;
  category: FrequencyCategory;
  description: string;
}

export const CATEGORY_LABELS: Record<FrequencyCategory, string> = {
  solfeggio: 'Solfeggio',
  musical: 'Musical',
  scientific: 'Scientific',
  brainwave: 'Brainwave',
  harmonic: 'Harmonic Series',
  cultural: 'Cultural',
};

export const CATEGORY_ICONS: Record<FrequencyCategory, string> = {
  solfeggio: '✦',
  musical: '♪',
  scientific: '⚛',
  brainwave: '◠',
  harmonic: '∿',
  cultural: '◈',
};

export const FREQUENCY_CATALOG: CatalogEntry[] = [
  // ── Solfeggio (9) ──────────────────────────────────────
  {
    slug: 'solf-174',
    name: 'Foundation',
    frequency: 174,
    category: 'solfeggio',
    description:
      'The lowest Solfeggio frequency. Said to provide a sense of security and grounding. Acts as a natural anesthetic, reducing physical and energetic tension.',
  },
  {
    slug: 'solf-285',
    name: 'Quantum Cognition',
    frequency: 285,
    category: 'solfeggio',
    description:
      'Associated with tissue healing in alternative practices. This frequency is linked to cellular regeneration and energetic restoration.',
  },
  {
    slug: 'solf-396',
    name: 'Liberation',
    frequency: 396,
    category: 'solfeggio',
    description:
      'The first of the original six Solfeggio tones from the medieval hymn to St. John the Baptist. Traditionally associated with releasing guilt and fear.',
  },
  {
    slug: 'solf-417',
    name: 'Resonance',
    frequency: 417,
    category: 'solfeggio',
    description:
      'The second Solfeggio tone, associated with facilitating change. In acoustics, this mid-range frequency sits in the vocal formant region.',
  },
  {
    slug: 'solf-528',
    name: 'Transformation',
    frequency: 528,
    category: 'solfeggio',
    description:
      'Often called the "Love frequency" or "Miracle tone." Sits close to C5 in scientific tuning (523.25 Hz). One of the most discussed frequencies in sound healing.',
  },
  {
    slug: 'solf-639',
    name: 'Connection',
    frequency: 639,
    category: 'solfeggio',
    description:
      'The fourth Solfeggio tone. Near E♭5 in equal temperament. Associated with harmonious relationships and interpersonal communication.',
  },
  {
    slug: 'solf-741',
    name: 'Awakening',
    frequency: 741,
    category: 'solfeggio',
    description:
      'The fifth Solfeggio tone, close to F#5. Associated with intuition and self-expression. Falls in the bright upper-mid frequency range.',
  },
  {
    slug: 'solf-852',
    name: 'Intuition',
    frequency: 852,
    category: 'solfeggio',
    description:
      'The sixth Solfeggio tone. Sits near A5 in equal temperament. Traditionally linked to returning to spiritual order and heightened awareness.',
  },
  {
    slug: 'solf-963',
    name: 'Transcendence',
    frequency: 963,
    category: 'solfeggio',
    description:
      'The highest Solfeggio frequency, close to B5. Known as the "frequency of the gods." Completes the Solfeggio scale and is associated with unity and oneness.',
  },

  // ── Musical (10) ───────────────────────────────────────
  {
    slug: 'mus-a440',
    name: 'Concert A',
    frequency: 440,
    category: 'musical',
    description:
      'The international standard for musical tuning since 1955 (ISO 16). A4 = 440 Hz is the reference pitch that orchestras worldwide tune to before performances.',
  },
  {
    slug: 'mus-middle-c',
    name: 'Middle C',
    frequency: 261.63,
    category: 'musical',
    description:
      'C4, the central note on a piano keyboard. The boundary between treble and bass clefs, and the starting point for learning music theory.',
  },
  {
    slug: 'mus-a432',
    name: 'Verdi Pitch',
    frequency: 432,
    category: 'musical',
    description:
      'An alternative tuning standard championed by Giuseppe Verdi. Some musicians prefer it for its warmer quality. Also called "philosophical pitch."',
  },
  {
    slug: 'mus-low-e',
    name: 'Low E String',
    frequency: 82.41,
    category: 'musical',
    description:
      'E2 — the lowest string on a standard guitar in standard tuning. A fundamental tone that anchors guitar voicings and bass lines.',
  },
  {
    slug: 'mus-high-e',
    name: 'High E String',
    frequency: 329.63,
    category: 'musical',
    description:
      'E4 — the highest (thinnest) string on a standard guitar. Two octaves above the low E, this string carries melodies and lead lines.',
  },
  {
    slug: 'mus-a3',
    name: 'Violin A String',
    frequency: 220,
    category: 'musical',
    description:
      'A3 — one octave below concert pitch. The open A string on violin, viola, and cello. A natural harmonic reference in string instrument tuning.',
  },
  {
    slug: 'mus-c-low',
    name: 'Bass C',
    frequency: 65.41,
    category: 'musical',
    description:
      'C2 — the lowest C on a standard piano. This deep tone sits at the threshold of melodic pitch perception, where rhythm and tone begin to merge.',
  },
  {
    slug: 'mus-bb3',
    name: 'Tuning B♭',
    frequency: 233.08,
    category: 'musical',
    description:
      'B♭3 — the standard tuning note for clarinets, trumpets, and many wind instruments. When they play their "C," concert pitch B♭ sounds.',
  },
  {
    slug: 'mus-e-fifth',
    name: 'Perfect Fifth of A',
    frequency: 659.26,
    category: 'musical',
    description:
      'E5 — a perfect fifth above A4 (440 Hz). The perfect fifth is the most consonant interval after unison and octave, ratio 3:2.',
  },
  {
    slug: 'mus-c-high',
    name: 'Soprano C',
    frequency: 1046.5,
    category: 'musical',
    description:
      'C6 — "High C" for sopranos. One of the most celebrated notes in opera, requiring exceptional vocal technique to produce cleanly.',
  },

  // ── Scientific (8) ─────────────────────────────────────
  {
    slug: 'sci-schumann',
    name: 'Schumann Resonance',
    frequency: 7.83,
    category: 'scientific',
    description:
      'The fundamental electromagnetic resonance of the Earth\'s atmosphere. Created by lightning discharges exciting the cavity between Earth\'s surface and ionosphere.',
  },
  {
    slug: 'sci-hearing-low',
    name: 'Hearing Threshold',
    frequency: 20,
    category: 'scientific',
    description:
      'The lower limit of human hearing. Below this, vibrations are felt rather than heard — the domain of infrasound, earthquakes, and whale calls.',
  },
  {
    slug: 'sci-speech-center',
    name: 'Speech Center',
    frequency: 1000,
    category: 'scientific',
    description:
      'The center of the human speech frequency range. Audiologists use 1 kHz as the reference frequency for hearing tests and sound level measurements.',
  },
  {
    slug: 'sci-ut-256',
    name: 'Scientific C',
    frequency: 256,
    category: 'scientific',
    description:
      'C4 in scientific pitch (also called "philosopher\'s pitch"). All octaves of C are exact powers of 2 Hz. Used in physics demonstrations.',
  },
  {
    slug: 'sci-mains-60',
    name: 'Mains Hum (US)',
    frequency: 60,
    category: 'scientific',
    description:
      'The frequency of AC electrical power in North America and parts of Asia. This ever-present 60 Hz hum is the sound of the modern power grid.',
  },
  {
    slug: 'sci-mains-50',
    name: 'Mains Hum (EU)',
    frequency: 50,
    category: 'scientific',
    description:
      'The frequency of AC power in Europe, Africa, and most of Asia. Audio engineers must filter this frequency to keep recordings clean.',
  },
  {
    slug: 'sci-dial-tone',
    name: 'Dial Tone',
    frequency: 350,
    category: 'scientific',
    description:
      'One of two frequencies in the North American dial tone (350 + 440 Hz). A piece of telecommunications history from the analog telephone era.',
  },
  {
    slug: 'sci-tuning-fork',
    name: 'Physics Tuning Fork',
    frequency: 512,
    category: 'scientific',
    description:
      'The C5 tuning fork used in medical diagnostics (Rinne and Weber tests) to assess hearing and bone conduction. A power of 2, making it convenient for physics.',
  },

  // ── Brainwave Boundaries (8) ───────────────────────────
  {
    slug: 'brain-delta-low',
    name: 'Deep Delta',
    frequency: 0.5,
    category: 'brainwave',
    description:
      'The low end of delta brainwaves (0.5–4 Hz). Associated with the deepest stages of dreamless sleep and unconscious bodily processes.',
  },
  {
    slug: 'brain-delta-peak',
    name: 'Delta Peak',
    frequency: 2,
    category: 'brainwave',
    description:
      'Peak delta wave frequency, dominant during deep sleep. The brain\'s slowest rhythm, associated with healing, regeneration, and growth hormone release.',
  },
  {
    slug: 'brain-theta-low',
    name: 'Theta Gate',
    frequency: 4,
    category: 'brainwave',
    description:
      'The delta-theta boundary (4 Hz). The threshold between deep sleep and the dreamlike theta state. Light meditation often hovers near this frequency.',
  },
  {
    slug: 'brain-theta-peak',
    name: 'Theta Peak',
    frequency: 6,
    category: 'brainwave',
    description:
      'Mid-theta (6 Hz). Dominant during deep meditation, creativity, and REM sleep. The frequency most associated with vivid imagery and insight.',
  },
  {
    slug: 'brain-alpha-low',
    name: 'Alpha Gate',
    frequency: 8,
    category: 'brainwave',
    description:
      'The theta-alpha boundary (8 Hz). Crossing this threshold corresponds to the transition between drowsy meditation and relaxed wakefulness.',
  },
  {
    slug: 'brain-alpha-peak',
    name: 'Alpha Peak',
    frequency: 10,
    category: 'brainwave',
    description:
      'The classic alpha rhythm (10 Hz). Dominant when you close your eyes and relax. First discovered by Hans Berger in 1924, the dawn of EEG research.',
  },
  {
    slug: 'brain-beta-low',
    name: 'Beta Gate',
    frequency: 13,
    category: 'brainwave',
    description:
      'The alpha-beta boundary (13 Hz). Above this, the brain shifts into active thinking, focused attention, and engaged problem-solving.',
  },
  {
    slug: 'brain-beta-peak',
    name: 'Beta Focus',
    frequency: 20,
    category: 'brainwave',
    description:
      'Active beta (20 Hz). Associated with alert concentration, analytical thinking, and active cognition. The rhythm of a focused, awake mind.',
  },

  // ── Harmonic Series (8) ────────────────────────────────
  {
    slug: 'harm-fundamental',
    name: 'Fundamental (1st)',
    frequency: 110,
    category: 'harmonic',
    description:
      'A2 at 110 Hz — a convenient fundamental for exploring the harmonic series. Every harmonic is a whole-number multiple of this frequency.',
  },
  {
    slug: 'harm-2nd',
    name: '2nd Harmonic',
    frequency: 220,
    category: 'harmonic',
    description:
      'The first overtone: exactly double the fundamental (2:1 ratio). This is the octave — the most consonant interval, where two notes blend almost as one.',
  },
  {
    slug: 'harm-3rd',
    name: '3rd Harmonic',
    frequency: 330,
    category: 'harmonic',
    description:
      'Three times the fundamental (3:1). An octave plus a perfect fifth above the root. This harmonic gives instruments their characteristic brightness.',
  },
  {
    slug: 'harm-4th',
    name: '4th Harmonic',
    frequency: 440,
    category: 'harmonic',
    description:
      'Four times the fundamental (4:1). Two octaves up. In this series, the 4th harmonic of A2 (110 Hz) lands on concert pitch A4 = 440 Hz.',
  },
  {
    slug: 'harm-5th',
    name: '5th Harmonic',
    frequency: 550,
    category: 'harmonic',
    description:
      'Five times the fundamental (5:1). Two octaves plus a major third. This harmonic defines the sweetness of major chords in just intonation.',
  },
  {
    slug: 'harm-6th',
    name: '6th Harmonic',
    frequency: 660,
    category: 'harmonic',
    description:
      'Six times the fundamental (6:1). Two octaves plus a perfect fifth. Combined with the 4th and 5th harmonics, outlines a major triad in pure tuning.',
  },
  {
    slug: 'harm-7th',
    name: '7th Harmonic',
    frequency: 770,
    category: 'harmonic',
    description:
      'Seven times the fundamental (7:1). The "natural seventh" — flatter than the equal temperament minor seventh. Gives barbershop chords their ring.',
  },
  {
    slug: 'harm-8th',
    name: '8th Harmonic',
    frequency: 880,
    category: 'harmonic',
    description:
      'Eight times the fundamental (8:1). Three octaves above the root. A3 → A6 at 880 Hz. Powers of two always produce pure octaves.',
  },

  // ── Cultural / Historical (7) ──────────────────────────
  {
    slug: 'cult-om',
    name: 'Om Frequency',
    frequency: 136.1,
    category: 'cultural',
    description:
      'The "Earth year tone" — the 32nd octave of Earth\'s orbital frequency. Used in Indian classical music and meditation as the cosmic keynote.',
  },
  {
    slug: 'cult-tibetan-bowl',
    name: 'Tibetan Bowl',
    frequency: 473,
    category: 'cultural',
    description:
      'A common resonant frequency of traditional Tibetan singing bowls. These hand-hammered metal bowls produce rich, beating harmonics when struck or rubbed.',
  },
  {
    slug: 'cult-pythagorean',
    name: 'Pythagorean Comma',
    frequency: 531.19,
    category: 'cultural',
    description:
      'Twelve pure fifths (ratio 3:2) stacked from C yield a note slightly sharp of seven octaves. This discrepancy — the Pythagorean comma — drove centuries of tuning innovation.',
  },
  {
    slug: 'cult-baroque-a',
    name: 'Baroque Pitch',
    frequency: 415,
    category: 'cultural',
    description:
      'A common tuning standard in Baroque music (roughly A♭ in modern tuning). Period instrument ensembles often tune to 415 Hz for historical authenticity.',
  },
  {
    slug: 'cult-concert-1939',
    name: 'Pre-War Pitch',
    frequency: 435,
    category: 'cultural',
    description:
      'The French standard pitch of 1859, widely used until 1939. The shift to 440 Hz was a compromise between brighter continental and warmer English tuning.',
  },
  {
    slug: 'cult-gamelan-pelog',
    name: 'Gamelan Pelog',
    frequency: 295,
    category: 'cultural',
    description:
      'An approximate tone from the Javanese pelog scale. Gamelan tuning is unique to each ensemble — no two are identical, embodying communal musical identity.',
  },
  {
    slug: 'cult-didgeridoo',
    name: 'Didgeridoo Drone',
    frequency: 75,
    category: 'cultural',
    description:
      'A typical fundamental drone frequency of the Aboriginal Australian didgeridoo. One of the oldest wind instruments, producing rich overtone spectra through circular breathing.',
  },
];

/** Quick lookup by slug */
export const CATALOG_BY_SLUG = new Map(
  FREQUENCY_CATALOG.map((e) => [e.slug, e]),
);

/** Total number of discoverable frequencies */
export const CATALOG_SIZE = FREQUENCY_CATALOG.length;
