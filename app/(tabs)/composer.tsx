import { useState, useCallback, useEffect, useRef } from 'react';
import { Alert, Modal, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BinauralGenerator, AmbientGenerator, renderSession } from '@/src/audio';
import type { AmbientLayerConfig, ExportProgress, CarrierWaveform } from '@/src/audio';
import { usePresetStore } from '@/src/state/usePresetStore';
import { useExportStore } from '@/src/state/useExportStore';
import { useResponsive } from '@/src/hooks/useResponsive';
import type { ComposerSettings, ExportRecord } from '@/src/types/preset';
import {
  Screen,
  Card,
  SectionHeader,
  PrimaryButton,
  IconButton,
  PrimarySlider,
  SegmentedControl,
  SavePresetModal,
  PresetBar,
} from '@/src/components';
import type { QuickPreset } from '@/src/components';
import { colors, spacing, typography, radius } from '@/src/theme';

// ── Carrier waveform options ──────────────────────────────────────
const CARRIER_WAVEFORMS: CarrierWaveform[] = ['sine', 'triangle', 'square'];
const CARRIER_LABELS: Record<CarrierWaveform, string> = {
  sine: 'Sine',
  triangle: 'Triangle',
  square: 'Square',
};

// ── Binaural brainwave presets ──────────────────────────────────────

const BRAINWAVE_PRESETS = ['delta', 'theta', 'alpha', 'beta'] as const;
type BrainwavePreset = (typeof BRAINWAVE_PRESETS)[number];

const BRAINWAVE_LABELS: Record<BrainwavePreset, string> = {
  delta: 'Delta',
  theta: 'Theta',
  alpha: 'Alpha',
  beta: 'Beta',
};

const BRAINWAVE_RANGES: Record<BrainwavePreset, { diff: number; desc: string }> = {
  delta: { diff: 2, desc: 'Deep sleep · 0.5–4 Hz' },
  theta: { diff: 6, desc: 'Meditation · 4–8 Hz' },
  alpha: { diff: 10, desc: 'Relaxation · 8–13 Hz' },
  beta: { diff: 20, desc: 'Focus · 13–30 Hz' },
};

// ── Ambient layer types ─────────────────────────────────────────────

const AMBIENT_TYPES = ['rain', 'ocean', 'wind', 'forest', 'fire'] as const;
type AmbientType = (typeof AMBIENT_TYPES)[number];

const AMBIENT_LABELS: Record<AmbientType, string> = {
  rain: '🌧 Rain',
  ocean: '🌊 Ocean',
  wind: '💨 Wind',
  forest: '🌿 Forest',
  fire: '🔥 Fire',
};

// ── Fade preset options ─────────────────────────────────────────────

const FADE_OPTIONS = [0, 5, 10, 30] as const;
const DURATION_PRESETS = [5, 10, 15, 30, 60] as const;

// ── Layer interface ─────────────────────────────────────────────────

interface AmbientLayer {
  id: number;
  type: AmbientType;
  volume: number;
  enabled: boolean;
}

// ── Quick presets (mood-based) ─────────────────────────────────────────
interface ComposerQuickPreset {
  baseFrequency: number;
  beatDifference: number;
  binauralVolume: number;
  carrierWaveform?: CarrierWaveform;
  stereoWidth?: number;
  layers: { type: AmbientType; volume: number; enabled: boolean }[];
  duration: number;
  fadeIn: number;
  fadeOut: number;
}

const COMPOSER_PRESETS: QuickPreset<ComposerQuickPreset>[] = [
  {
    label: 'Deep Sleep',
    settings: {
      baseFrequency: 100, beatDifference: 2, binauralVolume: 0.45,
      layers: [{ type: 'rain', volume: 0.4, enabled: true }],
      duration: 30, fadeIn: 10, fadeOut: 10,
    },
  },
  {
    label: 'Meditation',
    settings: {
      baseFrequency: 150, beatDifference: 6, binauralVolume: 0.5,
      layers: [
        { type: 'ocean', volume: 0.35, enabled: true },
        { type: 'forest', volume: 0.25, enabled: true },
      ],
      duration: 15, fadeIn: 5, fadeOut: 5,
    },
  },
  {
    label: 'Focus',
    settings: {
      baseFrequency: 200, beatDifference: 20, binauralVolume: 0.4,
      layers: [{ type: 'rain', volume: 0.2, enabled: true }],
      duration: 30, fadeIn: 5, fadeOut: 5,
    },
  },
  {
    label: 'Calm',
    settings: {
      baseFrequency: 180, beatDifference: 10, binauralVolume: 0.5,
      layers: [{ type: 'wind', volume: 0.3, enabled: true }],
      duration: 15, fadeIn: 5, fadeOut: 5,
    },
  },
  {
    label: 'Fireside',
    settings: {
      baseFrequency: 120, beatDifference: 6, binauralVolume: 0.45,
      layers: [
        { type: 'fire', volume: 0.4, enabled: true },
        { type: 'rain', volume: 0.2, enabled: true },
      ],
      duration: 30, fadeIn: 10, fadeOut: 10,
    },
  },
  {
    label: 'Ocean Drift',
    settings: {
      baseFrequency: 140, beatDifference: 4, binauralVolume: 0.5,
      layers: [{ type: 'ocean', volume: 0.5, enabled: true }],
      duration: 60, fadeIn: 10, fadeOut: 30,
    },
  },
];

let nextLayerId = 1;

export default function ComposerScreen() {
  // Binaural generator (singleton per component mount)
  const generatorRef = useRef<BinauralGenerator | null>(null);
  const getGenerator = useCallback(() => {
    if (!generatorRef.current) {
      generatorRef.current = new BinauralGenerator();
    }
    return generatorRef.current;
  }, []);

  // Ambient generator (singleton per component mount)
  const ambientRef = useRef<AmbientGenerator | null>(null);
  const getAmbient = useCallback(() => {
    if (!ambientRef.current) {
      ambientRef.current = new AmbientGenerator();
    }
    return ambientRef.current;
  }, []);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);

  // Binaural state
  const [baseFrequency, setBaseFrequency] = useState(200);
  const [beatDifference, setBeatDifference] = useState(10);
  const [binauralVolume, setBinauralVolume] = useState(0.5);
  const [carrierWaveform, setCarrierWaveform] = useState<CarrierWaveform>('sine');
  const [stereoWidth, setStereoWidth] = useState(1);

  // Ambient layers
  const [layers, setLayers] = useState<AmbientLayer[]>([
    { id: nextLayerId++, type: 'rain', volume: 0.4, enabled: true },
  ]);

  // Session settings
  const [duration, setDuration] = useState(15);
  const [fadeIn, setFadeIn] = useState(5);
  const [fadeOut, setFadeOut] = useState(5);

  // Save modal
  const savePreset = usePresetStore((s) => s.savePreset);
  const [showSaveModal, setShowSaveModal] = useState(false);

  // Export state
  const addExport = useExportStore((s) => s.addExport);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  const handleExport = useCallback(async () => {
    const settings: ComposerSettings = {
      baseFrequency,
      beatDifference,
      binauralVolume,
      carrierWaveform,
      stereoWidth,
      layers: layers.map(({ type, volume, enabled }) => ({ type, volume, enabled })),
      duration,
      fadeIn,
      fadeOut,
    };

    setExporting(true);
    setExportProgress(0);

    try {
      const exportName = `${beatDifference.toFixed(0)}Hz binaural ${duration}m`;
      const result = await renderSession(settings, exportName, (p: ExportProgress) => {
        setExportProgress(p.progress);
      });

      const record: ExportRecord = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
        name: exportName,
        fileName: result.fileName,
        uri: result.uri,
        durationSeconds: duration * 60,
        format: 'wav',
        sizeBytes: result.sizeBytes,
        settings,
        createdAt: Date.now(),
      };

      await addExport(record);
      setExporting(false);

      if (Platform.OS === 'web') {
        // Trigger download on web
        const a = document.createElement('a');
        a.href = result.uri;
        a.download = result.fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }

      Alert.alert('Export Complete', `"${result.fileName}" saved successfully.`);
    } catch (error) {
      setExporting(false);
      Alert.alert('Export Failed', error instanceof Error ? error.message : 'Unknown error');
    }
  }, [baseFrequency, beatDifference, binauralVolume, carrierWaveform, stereoWidth, layers, duration, fadeIn, fadeOut, addExport]);

  const handleSavePreset = useCallback(async (name: string) => {
    const settings: ComposerSettings = {
      baseFrequency,
      beatDifference,
      binauralVolume,
      carrierWaveform,
      stereoWidth,
      layers: layers.map(({ type, volume, enabled }) => ({ type, volume, enabled })),
      duration,
      fadeIn,
      fadeOut,
    };
    await savePreset(name, 'composer', settings);
    setShowSaveModal(false);
    Alert.alert('Saved', `Preset "${name || 'Composer Preset'}" saved to Library.`);
  }, [baseFrequency, beatDifference, binauralVolume, carrierWaveform, stereoWidth, layers, duration, fadeIn, fadeOut, savePreset]);

  // Load preset from Library
  const pendingLoad = usePresetStore((s) => s.pendingLoad);
  const setPendingLoad = usePresetStore((s) => s.setPendingLoad);
  useEffect(() => {
    if (pendingLoad && pendingLoad.type === 'composer') {
      const s = pendingLoad.settings as ComposerSettings;
      setBaseFrequency(s.baseFrequency);
      setBeatDifference(s.beatDifference);
      setBinauralVolume(s.binauralVolume);
      setCarrierWaveform(s.carrierWaveform ?? 'sine');
      setStereoWidth(s.stereoWidth ?? 1);
      setLayers(s.layers.map((l, i) => ({ ...l, id: nextLayerId++ })));
      setDuration(s.duration);
      setFadeIn(s.fadeIn);
      setFadeOut(s.fadeOut);
      setPendingLoad(null);
    }
  }, [pendingLoad, setPendingLoad]);

  const leftFreq = baseFrequency;
  const rightFreq = baseFrequency + beatDifference;

  // Determine which preset is active (if any)
  const activeBrainwave = BRAINWAVE_PRESETS.find(
    (p) => Math.abs(beatDifference - BRAINWAVE_RANGES[p].diff) < 0.5,
  ) ?? null;

  // Layer management
  const addLayer = useCallback(() => {
    if (layers.length >= 5) {
      Alert.alert('Limit Reached', 'Maximum 5 ambient layers.');
      return;
    }
    const usedTypes = new Set(layers.map((l) => l.type));
    const available = AMBIENT_TYPES.find((t) => !usedTypes.has(t)) ?? 'rain';
    setLayers((prev) => {
      const updated = [...prev, { id: nextLayerId++, type: available, volume: 0.4, enabled: true }];
      if (ambientRef.current?.isPlaying()) {
        ambientRef.current.syncLayers(updated as AmbientLayerConfig[]);
      }
      return updated;
    });
  }, [layers]);

  const removeLayer = useCallback((id: number) => {
    setLayers((prev) => {
      const updated = prev.filter((l) => l.id !== id);
      if (ambientRef.current?.isPlaying()) {
        ambientRef.current.syncLayers(updated as AmbientLayerConfig[]);
      }
      return updated;
    });
  }, []);

  const updateLayerVolume = useCallback((id: number, volume: number) => {
    setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, volume } : l)));
    if (ambientRef.current?.isPlaying()) {
      ambientRef.current.setLayerVolume(id, volume);
    }
  }, []);

  const updateLayerType = useCallback((id: number, type: AmbientType) => {
    setLayers((prev) => {
      const updated = prev.map((l) => (l.id === id ? { ...l, type } : l));
      // Type change requires full layer re-sync (different filter chain)
      if (ambientRef.current?.isPlaying()) {
        ambientRef.current.syncLayers(updated as AmbientLayerConfig[]);
      }
      return updated;
    });
  }, []);

  const toggleLayer = useCallback((id: number) => {
    setLayers((prev) => {
      const updated = prev.map((l) => (l.id === id ? { ...l, enabled: !l.enabled } : l));
      if (ambientRef.current?.isPlaying()) {
        ambientRef.current.syncLayers(updated as AmbientLayerConfig[]);
      }
      return updated;
    });
  }, []);

  const { isTablet } = useResponsive();

  // Beat difference badge
  const beatBadge = activeBrainwave
    ? `${BRAINWAVE_LABELS[activeBrainwave]} · ${beatDifference.toFixed(1)} Hz`
    : `${beatDifference.toFixed(1)} Hz beat`;

  // Live-update binaural params while playing
  const updateBinauralIfPlaying = useCallback(
    (base: number, diff: number, vol: number, waveform?: CarrierWaveform, width?: number) => {
      if (!generatorRef.current?.isPlaying()) return;
      generatorRef.current.updateParams({
        leftFreq: base,
        rightFreq: base + diff,
        amplitude: vol,
        carrierWaveform: waveform ?? carrierWaveform,
        stereoWidth: width ?? stereoWidth,
      });
    },
    [carrierWaveform, stereoWidth],
  );

  const handleQuickPreset = useCallback((p: ComposerQuickPreset) => {
    setBaseFrequency(p.baseFrequency);
    setBeatDifference(p.beatDifference);
    setBinauralVolume(p.binauralVolume);
    setCarrierWaveform(p.carrierWaveform ?? 'sine');
    setStereoWidth(p.stereoWidth ?? 1);
    setLayers(p.layers.map((l) => ({ ...l, id: nextLayerId++ })));
    setDuration(p.duration);
    setFadeIn(p.fadeIn);
    setFadeOut(p.fadeOut);
    updateBinauralIfPlaying(p.baseFrequency, p.beatDifference, p.binauralVolume, p.carrierWaveform ?? 'sine', p.stereoWidth ?? 1);
    if (ambientRef.current?.isPlaying()) {
      ambientRef.current.syncLayers(
        p.layers.map((l, i) => ({ ...l, id: i })) as AmbientLayerConfig[],
      );
    }
  }, [updateBinauralIfPlaying]);

  const handleBaseFrequency = useCallback(
    (v: number) => {
      setBaseFrequency(v);
      updateBinauralIfPlaying(v, beatDifference, binauralVolume);
    },
    [beatDifference, binauralVolume, updateBinauralIfPlaying],
  );

  const handleBeatDifference = useCallback(
    (v: number) => {
      setBeatDifference(v);
      updateBinauralIfPlaying(baseFrequency, v, binauralVolume);
    },
    [baseFrequency, binauralVolume, updateBinauralIfPlaying],
  );

  const handleBinauralVolume = useCallback(
    (v: number) => {
      setBinauralVolume(v);
      updateBinauralIfPlaying(baseFrequency, beatDifference, v);
    },
    [baseFrequency, beatDifference, updateBinauralIfPlaying],
  );

  const handleCarrierWaveform = useCallback(
    (wf: CarrierWaveform) => {
      setCarrierWaveform(wf);
      updateBinauralIfPlaying(baseFrequency, beatDifference, binauralVolume, wf);
    },
    [baseFrequency, beatDifference, binauralVolume, updateBinauralIfPlaying],
  );

  const handleStereoWidth = useCallback(
    (v: number) => {
      setStereoWidth(v);
      updateBinauralIfPlaying(baseFrequency, beatDifference, binauralVolume, undefined, v);
    },
    [baseFrequency, beatDifference, binauralVolume, updateBinauralIfPlaying],
  );

  const handleBrainwavePreset = useCallback(
    (preset: BrainwavePreset) => {
      const diff = BRAINWAVE_RANGES[preset].diff;
      setBeatDifference(diff);
      updateBinauralIfPlaying(baseFrequency, diff, binauralVolume);
    },
    [baseFrequency, binauralVolume, updateBinauralIfPlaying],
  );

  // Start / stop session
  const toggleSession = useCallback(async () => {
    const gen = getGenerator();
    const ambient = getAmbient();
    if (isPlaying) {
      await Promise.all([gen.stop(), ambient.stop()]);
      setIsPlaying(false);
    } else {
      await Promise.all([
        gen.play({
          leftFreq: baseFrequency,
          rightFreq: baseFrequency + beatDifference,
          amplitude: binauralVolume,
          carrierWaveform,
          stereoWidth,
        }),
        ambient.start(layers as AmbientLayerConfig[]),
      ]);
      setIsPlaying(true);
    }
  }, [isPlaying, baseFrequency, beatDifference, binauralVolume, carrierWaveform, stereoWidth, layers, getGenerator, getAmbient]);

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false}>
        <SectionHeader title="Composer" subtitle="Binaural beats & ambient layers" />

        <PresetBar
          presets={COMPOSER_PRESETS}
          onSelect={handleQuickPreset}
        />

        {/* ── Binaural Beat Section ──────────────────────────────── */}
        <Card style={styles.card}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionLabel}>Binaural Beat</Text>
            <Text style={styles.badge}>{beatBadge}</Text>
          </View>

          {/* Ear frequency readout */}
          <View style={styles.earReadout}>
            <View style={styles.earBox}>
              <Text style={styles.earLabel}>LEFT EAR</Text>
              <Text style={styles.earFreq}>{Math.round(leftFreq)} Hz</Text>
            </View>
            <View style={styles.earDivider} />
            <View style={styles.earBox}>
              <Text style={styles.earLabel}>RIGHT EAR</Text>
              <Text style={styles.earFreq}>{Math.round(rightFreq)} Hz</Text>
            </View>
          </View>

          <PrimarySlider
            label="Base Frequency"
            value={baseFrequency}
            onValueChange={handleBaseFrequency}
            min={80}
            max={500}
            step={1}
            formatValue={(v) => `${Math.round(v)} Hz`}
            style={styles.slider}
          />

          <PrimarySlider
            label="Beat Difference"
            value={beatDifference}
            onValueChange={handleBeatDifference}
            min={0.5}
            max={40}
            step={0.5}
            formatValue={(v) => `${v.toFixed(1)} Hz`}
            style={styles.slider}
          />

          {/* Brainwave presets */}
          <Text style={styles.controlLabel}>Brainwave Preset</Text>
          <View style={styles.presetRow}>
            {BRAINWAVE_PRESETS.map((preset) => (
              <PrimaryButton
                key={preset}
                title={BRAINWAVE_LABELS[preset]}
                variant={activeBrainwave === preset ? 'filled' : 'ghost'}
                onPress={() => handleBrainwavePreset(preset)}
                style={styles.presetButton}
              />
            ))}
          </View>
          {activeBrainwave && (
            <Text style={styles.hint}>{BRAINWAVE_RANGES[activeBrainwave].desc}</Text>
          )}

          <PrimarySlider
            label="Binaural Volume"
            value={binauralVolume}
            onValueChange={handleBinauralVolume}
            min={0}
            max={1}
            step={0.01}
            formatValue={(v) => `${Math.round(v * 100)}%`}
            style={styles.slider}
          />

          <Text style={[styles.controlLabel, styles.labelSpacing]}>Carrier Waveform</Text>
          <SegmentedControl
            options={CARRIER_WAVEFORMS}
            selected={carrierWaveform}
            onSelect={handleCarrierWaveform}
            labels={CARRIER_LABELS}
          />

          <PrimarySlider
            label="Stereo Width"
            value={stereoWidth}
            onValueChange={handleStereoWidth}
            min={0}
            max={1}
            step={0.01}
            formatValue={(v) => `${Math.round(v * 100)}%`}
            style={styles.slider}
          />
          <Text style={styles.hint}>
            {stereoWidth < 0.1 ? 'Mono — no binaural separation' : stereoWidth > 0.9 ? 'Full stereo — maximum binaural effect' : 'Partial stereo separation'}
          </Text>
        </Card>

        {/* ── Ambient Layers Section ─────────────────────────────── */}
        <SectionHeader title="AMBIENT LAYERS" label />

        {layers.map((layer) => (
          <Card key={layer.id} style={styles.card}>
            <View style={styles.layerHeader}>
              <PrimaryButton
                title={layer.enabled ? 'ON' : 'OFF'}
                variant={layer.enabled ? 'filled' : 'ghost'}
                onPress={() => toggleLayer(layer.id)}
                style={styles.toggleButton}
              />
              <View style={styles.layerTypeRow}>
                {AMBIENT_TYPES.map((type) => (
                  <PrimaryButton
                    key={type}
                    title={AMBIENT_LABELS[type]}
                    variant={layer.type === type ? 'filled' : 'ghost'}
                    onPress={() => updateLayerType(layer.id, type)}
                    style={styles.layerTypeButton}
                  />
                ))}
              </View>
              <IconButton variant="ghost" onPress={() => removeLayer(layer.id)}>
                <Text style={styles.removeText}>✕</Text>
              </IconButton>
            </View>
            <PrimarySlider
              label="Volume"
              value={layer.volume}
              onValueChange={(v) => updateLayerVolume(layer.id, v)}
              min={0}
              max={1}
              step={0.01}
              formatValue={(v) => `${Math.round(v * 100)}%`}
              style={styles.layerSlider}
            />
          </Card>
        ))}

        <PrimaryButton
          title={`+ Add Layer${layers.length >= 5 ? ' (max)' : ''}`}
          variant="outline"
          onPress={addLayer}
          style={styles.addLayerButton}
        />

        {/* ── Session & Playback — side by side on tablet ───────── */}
        <View style={isTablet ? styles.tabletRow : undefined}>
          <View style={isTablet ? styles.tabletHalf : undefined}>
            <SectionHeader title="SESSION" label />
            <Card style={styles.card}>
              <Text style={styles.controlLabel}>Duration</Text>
              <View style={styles.presetRow}>
                {DURATION_PRESETS.map((d) => (
                  <PrimaryButton
                    key={d}
                    title={`${d}m`}
                    variant={duration === d ? 'filled' : 'ghost'}
                    onPress={() => setDuration(d)}
                    style={styles.presetButton}
                  />
                ))}
              </View>

              <PrimarySlider
                label="Duration"
                value={duration}
                onValueChange={(v) => setDuration(Math.round(v))}
                min={1}
                max={120}
                step={1}
                formatValue={(v) => `${Math.round(v)} min`}
                style={styles.slider}
              />

              <Text style={[styles.controlLabel, styles.labelSpacing]}>Fade In</Text>
              <View style={styles.presetRow}>
                {FADE_OPTIONS.map((f) => (
                  <PrimaryButton
                    key={`in-${f}`}
                    title={f === 0 ? 'None' : `${f}s`}
                    variant={fadeIn === f ? 'filled' : 'ghost'}
                    onPress={() => setFadeIn(f)}
                    style={styles.presetButton}
                  />
                ))}
              </View>

              <Text style={[styles.controlLabel, styles.labelSpacing]}>Fade Out</Text>
              <View style={styles.presetRow}>
                {FADE_OPTIONS.map((f) => (
                  <PrimaryButton
                    key={`out-${f}`}
                    title={f === 0 ? 'None' : `${f}s`}
                    variant={fadeOut === f ? 'filled' : 'ghost'}
                    onPress={() => setFadeOut(f)}
                    style={styles.presetButton}
                  />
                ))}
              </View>
            </Card>
          </View>

          {/* ── Playback Controls ──────────────────────────────────── */}
          <View style={isTablet ? styles.tabletHalf : undefined}>
            {isTablet && <SectionHeader title="PLAYBACK" label />}
            <View style={styles.buttonRow}>
              <PrimaryButton
                title={isPlaying ? 'Stop Session' : 'Start Session'}
                variant={isPlaying ? 'outline' : 'filled'}
                onPress={toggleSession}
                style={styles.buttonFlex}
              />
            </View>

            <View style={styles.buttonRow}>
              <PrimaryButton
                title={exporting ? 'Exporting…' : 'Export WAV'}
                variant="outline"
                onPress={handleExport}
                style={styles.buttonFlex}
                disabled={exporting}
              />
            </View>

            <View style={styles.iconRow}>
              <IconButton
                variant="filled"
                onPress={() => setShowSaveModal(true)}
              >
                <Text style={styles.iconFilledText}>♡</Text>
              </IconButton>
              <IconButton
                variant="ghost"
                onPress={() =>
                  Alert.alert(
                    'Composer',
                    'Build binaural beat sessions with ambient layers.\n\nBinaural beats work by playing slightly different frequencies in each ear — the perceived beat frequency is the difference between them.\n\nUse headphones for the full effect.',
                  )
                }
              >
                <Text style={styles.iconText}>ⓘ</Text>
              </IconButton>
            </View>
          </View>
        </View>

        {/* Safety notice */}
        <View style={styles.safetyNotice}>
          <Text style={styles.safetyText}>
            🎧 Binaural beats require stereo headphones for the intended effect.
          </Text>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Export progress overlay */}
      <Modal visible={exporting} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.progressCard}>
            <Text style={styles.progressTitle}>Exporting Audio…</Text>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${Math.round(exportProgress * 100)}%` }]} />
            </View>
            <Text style={styles.progressText}>{Math.round(exportProgress * 100)}%</Text>
          </View>
        </View>
      </Modal>

      <SavePresetModal
        visible={showSaveModal}
        defaultName={`${beatDifference.toFixed(0)} Hz binaural`}
        onSave={handleSavePreset}
        onCancel={() => setShowSaveModal(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionLabel: {
    fontSize: typography.sm,
    fontWeight: typography.semibold,
    color: colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  badge: {
    fontSize: typography.xs,
    fontWeight: typography.medium,
    color: colors.accent,
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  earReadout: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  earBox: {
    flex: 1,
    alignItems: 'center',
  },
  earDivider: {
    width: 1,
    backgroundColor: colors.surfaceElevated,
    marginHorizontal: spacing.sm,
  },
  earLabel: {
    fontSize: typography.xs,
    fontWeight: typography.semibold,
    color: colors.textMuted,
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  earFreq: {
    fontSize: typography.xl,
    fontWeight: typography.bold,
    color: colors.textPrimary,
  },
  controlLabel: {
    fontSize: typography.sm,
    fontWeight: typography.medium,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  labelSpacing: {
    marginTop: spacing.lg,
  },
  slider: {
    marginTop: spacing.lg,
  },
  presetRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  presetButton: {
    flex: 1,
    minWidth: 56,
    paddingVertical: spacing.xs,
  },
  hint: {
    fontSize: typography.xs,
    color: colors.textMuted,
    marginTop: spacing.sm,
    lineHeight: 18,
  },
  // Ambient layer styles
  layerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  toggleButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    minWidth: 44,
  },
  layerTypeRow: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  layerTypeButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  layerSlider: {
    marginTop: spacing.sm,
  },
  removeText: {
    fontSize: 14,
    color: colors.danger,
  },
  addLayerButton: {
    marginBottom: spacing.md,
  },
  // Playback & utility
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  buttonFlex: {
    flex: 1,
  },
  iconRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  iconText: {
    fontSize: 18,
    color: colors.accent,
  },
  iconFilledText: {
    fontSize: 18,
    color: colors.background,
  },
  safetyNotice: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.highlight + '33',
  },
  safetyText: {
    fontSize: typography.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  tabletRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  tabletHalf: {
    flex: 1,
  },
  bottomSpacer: {
    height: spacing.xxl,
  },
  // Export progress modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  progressCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  progressTitle: {
    fontSize: typography.lg,
    fontWeight: typography.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  progressBarBg: {
    width: '100%',
    height: 6,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.full,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: radius.full,
  },
  progressText: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    fontWeight: typography.medium,
  },
});
