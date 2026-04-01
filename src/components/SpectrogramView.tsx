import React, { useCallback, useEffect, useRef } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

type NoiseType = 'white' | 'pink' | 'brown';

interface SpectrogramViewProps {
  frequency: number;
  amplitude: number;
  width: number;
  height: number;
  isPlaying?: boolean;
  noiseType?: NoiseType | null;
  analyserNode?: AnalyserNode | null;
  style?: ViewStyle;
}

const FREQ_BINS = 48;
const TIME_ROWS = 64;

// ── Color palette: black → deep blue → cyan → yellow → white ──────
const PALETTE: [number, number, number][] = [];
function lerp3(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
}

// Build 256-entry lookup table — warm ember palette
const STOPS: { t: number; c: [number, number, number] }[] = [
  { t: 0.0,  c: [26, 22, 18] },      // dark leather (background)
  { t: 0.15, c: [60, 30, 10] },      // deep brown
  { t: 0.35, c: [140, 50, 10] },     // burnt sienna
  { t: 0.55, c: [250, 60, 0] },      // hot orange
  { t: 0.75, c: [240, 131, 33] },    // amber
  { t: 0.9,  c: [255, 220, 160] },   // warm cream
  { t: 1.0,  c: [255, 245, 230] },   // ivory
];

for (let i = 0; i < 256; i++) {
  const t = i / 255;
  let si = 0;
  while (si < STOPS.length - 2 && STOPS[si + 1].t < t) si++;
  const s0 = STOPS[si];
  const s1 = STOPS[si + 1];
  const local = (t - s0.t) / (s1.t - s0.t);
  PALETTE.push(lerp3(s0.c, s1.c, Math.max(0, Math.min(1, local))));
}

function intensityToColor(v: number): string {
  const idx = Math.max(0, Math.min(255, Math.round(v * 255)));
  const [r, g, b] = PALETTE[idx];
  return `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
}

// ── Spectrum data generation (matches SpectrumView patterns) ───────
function generateSpectrumRow(
  frequency: number,
  amplitude: number,
  jitter: number,
  noiseType: NoiseType | null,
): number[] {
  const bins: number[] = [];
  const maxFreq = 2200;

  if (noiseType) {
    for (let i = 0; i < FREQ_BINS; i++) {
      const frac = i / FREQ_BINS;
      let base: number;
      switch (noiseType) {
        case 'white':
          base = 0.45;
          break;
        case 'pink':
          base = 0.65 * Math.pow(1 - frac * 0.8, 0.6);
          break;
        case 'brown':
          base = 0.75 * Math.pow(1 - frac * 0.9, 1.5);
          break;
      }
      const noise =
        0.1 *
        (0.5 + 0.5 * Math.sin(jitter * 4.1 + i * 2.3)) *
        (0.6 + 0.4 * Math.sin(jitter * 6.7 + i * 1.7));
      bins.push(Math.min(1, (base + noise) * amplitude));
    }
  } else {
    const peakBin = Math.round((frequency / maxFreq) * FREQ_BINS);
    for (let i = 0; i < FREQ_BINS; i++) {
      const dist = Math.abs(i - peakBin);
      const peak = Math.exp(-(dist * dist) / 4) * amplitude;

      // Harmonics
      const h2Bin = Math.min(FREQ_BINS - 1, peakBin * 2);
      const h3Bin = Math.min(FREQ_BINS - 1, peakBin * 3);
      const h4Bin = Math.min(FREQ_BINS - 1, peakBin * 4);
      const h2 = Math.exp(-Math.pow(i - h2Bin, 2) / 3) * amplitude * 0.35;
      const h3 = Math.exp(-Math.pow(i - h3Bin, 2) / 3) * amplitude * 0.2;
      const h4 = Math.exp(-Math.pow(i - h4Bin, 2) / 3) * amplitude * 0.1;

      // Subtle noise floor
      const noise =
        0.02 *
        (0.5 + 0.5 * Math.sin(jitter * 3.7 + i * 2.1)) *
        (0.6 + 0.4 * Math.sin(jitter * 5.3 + i * 1.3));

      bins.push(Math.min(1, peak + h2 + h3 + h4 + noise));
    }
  }
  return bins;
}

/** Generate a spectrogram row from real analyser frequency data */
function generateAnalyserRow(analyser: AnalyserNode): number[] {
  const freqData = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(freqData);
  const bins: number[] = [];
  const binCount = freqData.length;
  const binsPerSlot = Math.floor(binCount / FREQ_BINS);
  for (let i = 0; i < FREQ_BINS; i++) {
    let sum = 0;
    const start = i * binsPerSlot;
    for (let j = start; j < start + binsPerSlot && j < binCount; j++) {
      sum += freqData[j];
    }
    bins.push((sum / binsPerSlot) / 255);
  }
  return bins;
}

export default function SpectrogramView({
  frequency,
  amplitude,
  width,
  height,
  isPlaying = false,
  noiseType = null,
  analyserNode = null,
  style,
}: SpectrogramViewProps) {
  // Grid of rect refs: [row][col]
  const cellRefs = useRef<(Rect | null)[][]>([]);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const seedRef = useRef(0);
  const accumRef = useRef(0);
  // Circular buffer: each row is FREQ_BINS intensities
  const bufferRef = useRef<number[][]>([]);
  const headRef = useRef(0); // points to the oldest row (next to overwrite)

  const propsRef = useRef({ frequency, amplitude, width, height, noiseType, analyserNode });
  propsRef.current = { frequency, amplitude, width, height, noiseType, analyserNode };

  // Initialize buffer
  if (bufferRef.current.length === 0) {
    for (let r = 0; r < TIME_ROWS; r++) {
      bufferRef.current.push(new Array(FREQ_BINS).fill(0));
    }
  }

  // Initialize cell refs
  if (cellRefs.current.length === 0) {
    for (let r = 0; r < TIME_ROWS; r++) {
      cellRefs.current.push(new Array(FREQ_BINS).fill(null));
    }
  }

  const scrollRate = 16; // new rows per second

  const pushRow = useCallback((row: number[]) => {
    const head = headRef.current;
    bufferRef.current[head] = row;
    headRef.current = (head + 1) % TIME_ROWS;
  }, []);

  const renderBuffer = useCallback(() => {
    const head = headRef.current;
    for (let displayRow = 0; displayRow < TIME_ROWS; displayRow++) {
      // Display row 0 = top = oldest, display row TIME_ROWS-1 = bottom = newest
      const bufIdx = (head + displayRow) % TIME_ROWS;
      const row = bufferRef.current[bufIdx];
      const refs = cellRefs.current[displayRow];
      if (!refs) continue;
      for (let col = 0; col < FREQ_BINS; col++) {
        const ref = refs[col];
        if (!ref) continue;
        ref.setNativeProps({ fill: intensityToColor(row[col]) });
      }
    }
  }, []);

  // Animation loop
  useEffect(() => {
    if (!isPlaying) {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      lastTimeRef.current = null;
      accumRef.current = 0;
      return;
    }

    const tick = (time: number) => {
      if (lastTimeRef.current != null) {
        const dt = (time - lastTimeRef.current) / 1000;
        seedRef.current += dt * 8;
        if (seedRef.current > 1000) seedRef.current -= 1000;

        accumRef.current += dt * scrollRate;
        const { frequency: f, amplitude: a, noiseType: nt, analyserNode: an } = propsRef.current;

        while (accumRef.current >= 1) {
          accumRef.current -= 1;
          const row = an
            ? generateAnalyserRow(an)
            : generateSpectrumRow(f, a, seedRef.current + accumRef.current * 0.5, nt);
          pushRow(row);
        }
        renderBuffer();
      }
      lastTimeRef.current = time;
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      lastTimeRef.current = null;
    };
  }, [isPlaying, pushRow, renderBuffer]);

  if (width <= 0 || height <= 0) return null;

  const cellW = width / FREQ_BINS;
  const cellH = height / TIME_ROWS;

  return (
    <View style={[styles.container, style]}>
      <Svg width={width} height={height}>
        {Array.from({ length: TIME_ROWS }, (_, r) =>
          Array.from({ length: FREQ_BINS }, (_, c) => (
            <Rect
              key={`${r}-${c}`}
              ref={(el) => {
                if (cellRefs.current[r]) cellRefs.current[r][c] = el;
              }}
              x={c * cellW}
              y={r * cellH}
              width={cellW + 0.5} // slight overlap to prevent gaps
              height={cellH + 0.5}
              fill={intensityToColor(0)}
            />
          )),
        )}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
});
