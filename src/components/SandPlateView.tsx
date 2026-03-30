import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Svg, { Path, Circle as SvgCircle, ClipPath, Defs, RadialGradient, Stop } from 'react-native-svg';
import { colors } from '@/src/theme';
import type { WaveformType } from '@/src/audio';

type PlateShape = 'circle' | 'square' | 'hexagon';
type ParticleStyle = 'sand' | 'salt' | 'metal';

interface SandPlateViewProps {
  width: number;
  height: number;
  frequency: number;
  amplitude: number;
  plateShape: PlateShape;
  particleStyle: ParticleStyle;
  waveform?: WaveformType;
  isPlaying?: boolean;
  isFrozen?: boolean;
  style?: ViewStyle;
}

const PARTICLE_COUNT = 600;

const PARTICLE_COLORS: Record<ParticleStyle, { main: string; dim: string }> = {
  sand: { main: '#d4a574', dim: '#a07850' },
  salt: { main: '#e8e8f0', dim: '#b0b0c0' },
  metal: { main: '#8899aa', dim: '#556677' },
};

const PARTICLE_RADIUS: Record<ParticleStyle, number> = {
  sand: 1.8,
  salt: 1.4,
  metal: 2.0,
};

/** Per-material physics tuning */
const PARTICLE_PHYSICS: Record<ParticleStyle, {
  damping: number;
  attractMultiplier: number;
  vibeMultiplier: number;
}> = {
  sand: { damping: 0.88, attractMultiplier: 1.0, vibeMultiplier: 1.0 },
  salt: { damping: 0.82, attractMultiplier: 1.3, vibeMultiplier: 1.4 },
  metal: { damping: 0.93, attractMultiplier: 0.6, vibeMultiplier: 0.5 },
};

/** Chladni plate vibration pattern.
 *  Returns a value where nodal lines (zero crossings) are where particles collect. */
function chladni(x: number, y: number, n: number, m: number): number {
  return (
    Math.cos(n * Math.PI * x) * Math.cos(m * Math.PI * y) -
    Math.cos(m * Math.PI * x) * Math.cos(n * Math.PI * y)
  );
}

/** Map frequency to Chladni mode pair (n, m) with smooth blending */
function getModesForFrequency(freq: number): { n: number; m: number; n2: number; m2: number; blend: number } {
  // Mode pairs ordered by increasing complexity
  const modes: [number, number][] = [
    [1, 2], [2, 3], [1, 4], [3, 4], [2, 5],
    [3, 5], [4, 5], [1, 6], [3, 7], [5, 6],
    [4, 7], [5, 8], [6, 7], [3, 9], [7, 8],
  ];

  // Map 20-2000 Hz to index into modes array
  const t = Math.max(0, Math.min(1, (freq - 20) / 1980));
  const idx = t * (modes.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.min(modes.length - 1, lo + 1);
  const blend = idx - lo;

  return {
    n: modes[lo][0],
    m: modes[lo][1],
    n2: modes[hi][0],
    m2: modes[hi][1],
    blend,
  };
}

/**
 * Harmonic weights by waveform type.
 * Square wave has odd harmonics (3rd, 5th, 7th…), saw has all, triangle has odd with fast decay.
 * Weights are relative amplitudes of the 2nd–5th harmonics used to enrich the Chladni pattern.
 */
const WAVEFORM_HARMONICS: Record<string, number[]> = {
  sine:     [],
  square:   [0, 0.33, 0, 0.2],       // odd harmonics: 3rd (1/3), 5th (1/5)
  saw:      [0.5, 0.33, 0.25, 0.2],  // all harmonics: 1/2, 1/3, 1/4, 1/5
  triangle: [0, 0.11, 0, 0.04],      // odd harmonics with 1/n² decay
};

/** Compute blended Chladni field value at (x,y) in normalized [-1,1] space */
function fieldAt(x: number, y: number, freq: number, waveform: WaveformType = 'sine'): number {
  const { n, m, n2, m2, blend } = getModesForFrequency(freq);
  const v1 = chladni(x, y, n, m);
  const v2 = chladni(x, y, n2, m2);
  let value = v1 * (1 - blend) + v2 * blend;

  // Blend in harmonic mode pairs for non-sine waveforms
  const harmonics = WAVEFORM_HARMONICS[waveform];
  if (harmonics && harmonics.length > 0) {
    for (let h = 0; h < harmonics.length; h++) {
      const weight = harmonics[h];
      if (weight === 0) continue;
      const hFreq = freq * (h + 2); // 2nd, 3rd, 4th, 5th harmonic
      const hModes = getModesForFrequency(Math.min(hFreq, 2000));
      const hv1 = chladni(x, y, hModes.n, hModes.m);
      const hv2 = chladni(x, y, hModes.n2, hModes.m2);
      value += (hv1 * (1 - hModes.blend) + hv2 * hModes.blend) * weight;
    }
  }

  return value;
}

/** Numerical gradient of |field| at position — points toward lower |field| (nodal lines) */
function fieldGradient(
  x: number,
  y: number,
  freq: number,
  waveform: WaveformType = 'sine',
): { gx: number; gy: number } {
  const eps = 0.005;
  const fCenter = Math.abs(fieldAt(x, y, freq, waveform));
  const fRight = Math.abs(fieldAt(x + eps, y, freq, waveform));
  const fUp = Math.abs(fieldAt(x, y + eps, freq, waveform));
  return {
    gx: (fRight - fCenter) / eps,
    gy: (fUp - fCenter) / eps,
  };
}

/** Check if a point is inside the given plate shape (coords in [-1,1]) */
function isInsidePlate(x: number, y: number, shape: PlateShape): boolean {
  switch (shape) {
    case 'circle':
      return x * x + y * y <= 0.95;
    case 'square':
      return Math.abs(x) <= 0.95 && Math.abs(y) <= 0.95;
    case 'hexagon': {
      // Hexagon test using 3-axis check
      const ax = Math.abs(x);
      const ay = Math.abs(y);
      return ay <= 0.88 && ax * 0.5 + ay * 0.866 <= 0.88;
    }
  }
}

/** Generate clip path d attribute for a plate shape */
function plateClipPath(size: number, shape: PlateShape): string {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 2;

  switch (shape) {
    case 'circle': {
      // SVG circle as path (two arcs)
      return `M${cx - r},${cy}a${r},${r},0,1,0,${r * 2},0a${r},${r},0,1,0,${-r * 2},0Z`;
    }
    case 'square': {
      const inset = 2;
      const rr = 8; // corner radius
      return `M${inset + rr},${inset}h${size - 2 * inset - 2 * rr}q${rr},0,${rr},${rr}v${size - 2 * inset - 2 * rr}q0,${rr},-${rr},${rr}h-${size - 2 * inset - 2 * rr}q-${rr},0,-${rr},-${rr}v-${size - 2 * inset - 2 * rr}q0,-${rr},${rr},-${rr}Z`;
    }
    case 'hexagon': {
      const pts: string[] = [];
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 6;
        const px = cx + r * Math.cos(angle);
        const py = cy + r * Math.sin(angle);
        pts.push(`${i === 0 ? 'M' : 'L'}${px.toFixed(1)},${py.toFixed(1)}`);
      }
      return pts.join('') + 'Z';
    }
  }
}

/** Generate plate outline path */
function plateOutlinePath(size: number, shape: PlateShape): string {
  return plateClipPath(size, shape);
}

/** Pseudo-random using sin */
function pseudoRandom(seed: number): number {
  return (Math.sin(seed * 12.9898 + 78.233) * 43758.5453) % 1;
}

interface Particle {
  x: number; // normalized [-1, 1]
  y: number;
  vx: number;
  vy: number;
}

function initParticles(count: number, shape: PlateShape): Particle[] {
  const particles: Particle[] = [];
  let attempts = 0;
  while (particles.length < count && attempts < count * 10) {
    const x = (pseudoRandom(attempts * 1.1 + 0.3) * 2 - 1) * 0.9;
    const y = (pseudoRandom(attempts * 2.7 + 1.1) * 2 - 1) * 0.9;
    attempts++;
    if (isInsidePlate(x, y, shape)) {
      particles.push({ x, y, vx: 0, vy: 0 });
    }
  }
  return particles;
}

/** Build SVG path data for all particles as filled dots */
function particlesPath(
  particles: Particle[],
  size: number,
  r: number,
): string {
  const half = size / 2;
  const parts: string[] = [];
  for (const p of particles) {
    const cx = half + p.x * (half - 4);
    const cy = half + p.y * (half - 4);
    // Small circle as two arcs
    parts.push(
      `M${(cx - r).toFixed(1)},${cy.toFixed(1)}a${r},${r},0,1,0,${(r * 2).toFixed(1)},0a${r},${r},0,1,0,${(-r * 2).toFixed(1)},0`,
    );
  }
  return parts.join('');
}

export default function SandPlateView({
  width,
  height,
  frequency,
  amplitude,
  plateShape,
  particleStyle,
  waveform = 'sine',
  isPlaying = false,
  isFrozen = false,
  style,
}: SandPlateViewProps) {
  const size = Math.min(width, height);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const particlesRef = useRef<Particle[]>(initParticles(PARTICLE_COUNT, plateShape));

  const propsRef = useRef({ frequency, amplitude, plateShape, particleStyle, waveform, isPlaying, isFrozen });
  propsRef.current = { frequency, amplitude, plateShape, particleStyle, waveform, isPlaying, isFrozen };

  /** Accumulated simulation time for time-varying jitter */
  const simTimeRef = useRef(0);

  // State-driven path strings — setNativeProps doesn't work on web
  const [particleD, setParticleD] = useState(() =>
    particlesPath(particlesRef.current, size, PARTICLE_RADIUS[particleStyle]),
  );

  // Reinitialize particles when plate shape changes
  const prevShapeRef = useRef(plateShape);
  useEffect(() => {
    if (plateShape !== prevShapeRef.current) {
      prevShapeRef.current = plateShape;
      particlesRef.current = initParticles(PARTICLE_COUNT, plateShape);
      const r = PARTICLE_RADIUS[propsRef.current.particleStyle];
      setParticleD(particlesPath(particlesRef.current, size, r));
    }
  }, [plateShape, size]);

  const simulateStep = useCallback((dt: number) => {
    const { frequency: freq, amplitude: amp, plateShape: shape, particleStyle: ps, waveform: wf, isFrozen: frozen } = propsRef.current;
    if (frozen) return;

    simTimeRef.current += dt;
    const t = simTimeRef.current;

    const particles = particlesRef.current;
    const phys = PARTICLE_PHYSICS[ps];
    const attractStrength = 5.0 * amp * phys.attractMultiplier;
    const damping = phys.damping;
    // Direct position vibration — bypasses velocity/damping so it stays visible
    const vibeRadius = 0.008 * amp * phys.vibeMultiplier;

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];

      // Compute gradient — particles move toward nodal lines (lower |field|)
      const grad = fieldGradient(p.x, p.y, freq, wf);
      const ax = -grad.gx * attractStrength;
      const ay = -grad.gy * attractStrength;

      p.vx = (p.vx + ax * dt) * damping;
      p.vy = (p.vy + ay * dt) * damping;

      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // Continuous plate vibration applied directly to position
      // Each particle gets a unique phase so they don't move in unison
      p.x += Math.sin(i * 1.3 + t * 14) * vibeRadius;
      p.y += Math.cos(i * 2.1 + t * 12) * vibeRadius;

      // Clamp to plate bounds
      if (!isInsidePlate(p.x, p.y, shape)) {
        // Reflect back inward
        p.x -= p.vx * dt * 2;
        p.y -= p.vy * dt * 2;
        p.vx *= -0.3;
        p.vy *= -0.3;

        // Hard clamp
        const dist = Math.sqrt(p.x * p.x + p.y * p.y);
        if (dist > 0.92) {
          p.x *= 0.9 / dist;
          p.y *= 0.9 / dist;
        }
      }
    }
  }, []);

  const render = useCallback(() => {
    const { particleStyle: ps } = propsRef.current;
    const r = PARTICLE_RADIUS[ps];
    setParticleD(particlesPath(particlesRef.current, size, r));
  }, [size]);

  // Animation loop
  useEffect(() => {
    if (!isPlaying) {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      lastTimeRef.current = null;
      render();
      return;
    }

    const tick = (time: number) => {
      if (lastTimeRef.current != null) {
        const dt = Math.min(0.05, (time - lastTimeRef.current) / 1000);
        simulateStep(dt);
      }
      lastTimeRef.current = time;
      render();
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
  }, [isPlaying, simulateStep, render]);

  // Re-render when props change while stopped
  useEffect(() => {
    if (!isPlaying) {
      render();
    }
  }, [frequency, amplitude, particleStyle, waveform, isPlaying, render]);

  // Scatter particles when frequency changes significantly or waveform changes while playing
  const prevFreqRef = useRef(frequency);
  const prevWaveformRef = useRef(waveform);
  useEffect(() => {
    const freqChanged = Math.abs(frequency - prevFreqRef.current) > 30;
    const waveformChanged = waveform !== prevWaveformRef.current;
    if (isPlaying && (freqChanged || waveformChanged)) {
      for (const p of particlesRef.current) {
        p.vx += (Math.random() - 0.5) * 0.8;
        p.vy += (Math.random() - 0.5) * 0.8;
      }
    }
    prevFreqRef.current = frequency;
    prevWaveformRef.current = waveform;
  }, [frequency, waveform, isPlaying]);

  const pColor = PARTICLE_COLORS[particleStyle];

  if (size <= 0) return null;

  const outlineD = plateOutlinePath(size, plateShape);
  const clipD = plateClipPath(size, plateShape);

  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          <ClipPath id="plateClip">
            <Path d={clipD} />
          </ClipPath>
          <RadialGradient id="plateGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={colors.accent} stopOpacity={isPlaying ? 0.08 : 0.02} />
            <Stop offset="0.7" stopColor={colors.accent} stopOpacity={isPlaying ? 0.03 : 0} />
            <Stop offset="1" stopColor={colors.accent} stopOpacity={0} />
          </RadialGradient>
        </Defs>

        {/* Background glow */}
        <SvgCircle
          cx={size / 2}
          cy={size / 2}
          r={size / 2 - 2}
          fill="url(#plateGlow)"
          clipPath="url(#plateClip)"
        />

        {/* Plate outline */}
        <Path
          d={outlineD}
          fill="none"
          stroke={isPlaying ? colors.accent : colors.border}
          strokeWidth={1.5}
          opacity={isPlaying ? 0.8 : 0.5}
        />

        {/* Particles — clipped to plate shape */}
        <Path
          d={particleD}
          fill={pColor.main}
          opacity={0.85}
          clipPath="url(#plateClip)"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
