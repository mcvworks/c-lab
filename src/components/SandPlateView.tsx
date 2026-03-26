import React, { useCallback, useEffect, useRef, useMemo } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Svg, { Path, Circle as SvgCircle, ClipPath, Defs, Rect, RadialGradient, Stop } from 'react-native-svg';
import { colors } from '@/src/theme';

type PlateShape = 'circle' | 'square' | 'hexagon';
type ParticleStyle = 'sand' | 'salt' | 'metal';

interface SandPlateViewProps {
  width: number;
  height: number;
  frequency: number;
  amplitude: number;
  plateShape: PlateShape;
  particleStyle: ParticleStyle;
  isPlaying?: boolean;
  isFrozen?: boolean;
  style?: ViewStyle;
}

const PARTICLE_COUNT = 280;

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

/** Compute blended Chladni field value at (x,y) in normalized [-1,1] space */
function fieldAt(x: number, y: number, freq: number): number {
  const { n, m, n2, m2, blend } = getModesForFrequency(freq);
  const v1 = chladni(x, y, n, m);
  const v2 = chladni(x, y, n2, m2);
  return v1 * (1 - blend) + v2 * blend;
}

/** Numerical gradient of |field| at position — points toward lower |field| (nodal lines) */
function fieldGradient(
  x: number,
  y: number,
  freq: number,
): { gx: number; gy: number } {
  const eps = 0.005;
  const fCenter = Math.abs(fieldAt(x, y, freq));
  const fRight = Math.abs(fieldAt(x + eps, y, freq));
  const fUp = Math.abs(fieldAt(x, y + eps, freq));
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
  isPlaying = false,
  isFrozen = false,
  style,
}: SandPlateViewProps) {
  const size = Math.min(width, height);
  const particlePathRef = useRef<Path | null>(null);
  const outlinePathRef = useRef<Path | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const particlesRef = useRef<Particle[]>(initParticles(PARTICLE_COUNT, plateShape));

  const propsRef = useRef({ frequency, amplitude, plateShape, particleStyle, isPlaying, isFrozen });
  propsRef.current = { frequency, amplitude, plateShape, particleStyle, isPlaying, isFrozen };

  // Reinitialize particles when plate shape changes
  const prevShapeRef = useRef(plateShape);
  useEffect(() => {
    if (plateShape !== prevShapeRef.current) {
      prevShapeRef.current = plateShape;
      particlesRef.current = initParticles(PARTICLE_COUNT, plateShape);
      // Update outline
      outlinePathRef.current?.setNativeProps({ d: plateOutlinePath(size, plateShape) });
      // Render new positions immediately
      const r = PARTICLE_RADIUS[propsRef.current.particleStyle];
      const path = particlesPath(particlesRef.current, size, r);
      particlePathRef.current?.setNativeProps({ d: path });
    }
  }, [plateShape, size]);

  const simulateStep = useCallback((dt: number) => {
    const { frequency: freq, amplitude: amp, plateShape: shape, isFrozen: frozen } = propsRef.current;
    if (frozen) return;

    const particles = particlesRef.current;
    const attractStrength = 2.0 * amp;
    const damping = 0.85;
    const jitter = 0.15 * amp;

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];

      // Compute gradient — particles move toward nodal lines (lower |field|)
      const grad = fieldGradient(p.x, p.y, freq);
      const ax = -grad.gx * attractStrength;
      const ay = -grad.gy * attractStrength;

      // Add subtle jitter for organic feel
      const jx = (Math.sin(i * 3.7 + dt * 50) * 0.5 + Math.sin(i * 7.1 + dt * 30) * 0.3) * jitter;
      const jy = (Math.sin(i * 5.3 + dt * 40) * 0.5 + Math.sin(i * 11.3 + dt * 20) * 0.3) * jitter;

      p.vx = (p.vx + (ax + jx) * dt) * damping;
      p.vy = (p.vy + (ay + jy) * dt) * damping;

      p.x += p.vx * dt;
      p.y += p.vy * dt;

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
    const path = particlesPath(particlesRef.current, size, r);
    particlePathRef.current?.setNativeProps({ d: path });
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
  }, [frequency, amplitude, particleStyle, isPlaying, render]);

  // Scatter particles when frequency changes significantly while playing
  const prevFreqRef = useRef(frequency);
  useEffect(() => {
    if (isPlaying && Math.abs(frequency - prevFreqRef.current) > 30) {
      // Give particles a velocity kick to re-settle on new nodal lines
      for (const p of particlesRef.current) {
        p.vx += (Math.random() - 0.5) * 0.8;
        p.vy += (Math.random() - 0.5) * 0.8;
      }
    }
    prevFreqRef.current = frequency;
  }, [frequency, isPlaying]);

  const pColor = PARTICLE_COLORS[particleStyle];

  if (size <= 0) return null;

  const initialParticlePath = particlesPath(particlesRef.current, size, PARTICLE_RADIUS[particleStyle]);
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
          ref={outlinePathRef}
          d={outlineD}
          fill="none"
          stroke={isPlaying ? colors.accent : colors.border}
          strokeWidth={1.5}
          opacity={isPlaying ? 0.8 : 0.5}
        />

        {/* Particles — clipped to plate shape */}
        <Path
          ref={particlePathRef}
          d={initialParticlePath}
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
