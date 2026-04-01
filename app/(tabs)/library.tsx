import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import Screen from '@/src/components/Screen';
import Card from '@/src/components/Card';
import { usePresetStore } from '@/src/state/usePresetStore';
import { useExportStore } from '@/src/state/useExportStore';
import { useSnapshotStore } from '@/src/state/useSnapshotStore';
import { useDiscoveryStore } from '@/src/state/useDiscoveryStore';
import { useResponsive } from '@/src/hooks/useResponsive';
import type { Preset, ExportRecord } from '@/src/types/preset';
import type { ExploreSettings, ComposerSettings } from '@/src/types/preset';
import type { Snapshot } from '@/src/types/snapshot';
import { colors, useColors, spacing, typography, radius } from '@/src/theme';
import {
  FREQUENCY_CATALOG,
  CATALOG_BY_SLUG,
  CATALOG_SIZE,
  CATEGORY_LABELS,
  CATEGORY_ICONS,
  type FrequencyCategory,
  type CatalogEntry,
} from '@/src/data/frequencyCatalog';

function formatDate(ts: number): string {
  const d = new Date(ts);
  const month = d.toLocaleString('default', { month: 'short' });
  const day = d.getDate();
  const time = d.toLocaleTimeString('default', { hour: '2-digit', minute: '2-digit' });
  return `${month} ${day}, ${time}`;
}

function presetSummary(preset: Preset): string {
  if (preset.type === 'explore') {
    const s = preset.settings as ExploreSettings;
    if (s.sourceMode === 'noise') {
      return `${s.noiseType} noise · ${Math.round(s.amplitude * 100)}%`;
    }
    return `${s.waveform} · ${Math.round(s.frequency)} Hz · ${Math.round(s.amplitude * 100)}%`;
  }
  const s = preset.settings as ComposerSettings;
  const layerCount = s.layers.length;
  return `${s.beatDifference.toFixed(1)} Hz beat · ${s.baseFrequency} Hz base · ${layerCount} layer${layerCount !== 1 ? 's' : ''}`;
}

function PresetCard({ preset }: { preset: Preset }) {
  const c = useColors();
  const router = useRouter();
  const { deletePreset, duplicatePreset, renamePreset, setPendingLoad } = usePresetStore();
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(preset.name);

  const handleLoad = useCallback(() => {
    setPendingLoad(preset);
    if (preset.type === 'explore') {
      router.navigate('/explore');
    } else {
      router.navigate('/composer');
    }
  }, [preset, setPendingLoad, router]);

  const handleDuplicate = useCallback(() => {
    duplicatePreset(preset.id);
  }, [preset.id, duplicatePreset]);

  const handleDelete = useCallback(() => {
    Alert.alert('Delete Preset', `Delete "${preset.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deletePreset(preset.id),
      },
    ]);
  }, [preset.id, preset.name, deletePreset]);

  const handleRename = useCallback(() => {
    setEditName(preset.name);
    setEditing(true);
  }, [preset.name]);

  const handleRenameSubmit = useCallback(() => {
    const trimmed = editName.trim();
    if (trimmed && trimmed !== preset.name) {
      renamePreset(preset.id, trimmed);
    }
    setEditing(false);
  }, [editName, preset.id, preset.name, renamePreset]);

  return (
    <Card style={styles.presetCard}>
      <View style={styles.presetHeader}>
        <View style={styles.presetInfo}>
          {editing ? (
            <TextInput
              style={styles.renameInput}
              value={editName}
              onChangeText={setEditName}
              onBlur={handleRenameSubmit}
              onSubmitEditing={handleRenameSubmit}
              autoFocus
              selectTextOnFocus
            />
          ) : (
            <Text style={styles.presetName} numberOfLines={1}>{preset.name}</Text>
          )}
          <View style={styles.metaRow}>
            <View style={[styles.typeBadge, preset.type === 'composer' && styles.composerBadge]}>
              <Text style={[styles.typeBadgeText, preset.type === 'composer' && styles.composerBadgeText]}>
                {preset.type === 'explore' ? 'Explore' : 'Composer'}
              </Text>
            </View>
            <Text style={styles.dateText}>{formatDate(preset.createdAt)}</Text>
          </View>
          <Text style={styles.summary} numberOfLines={1}>{presetSummary(preset)}</Text>
        </View>
      </View>

      <View style={[styles.actionRow, { borderTopColor: c.border }]}>
        <Pressable style={[styles.actionButton, { backgroundColor: c.surfaceElevated }, styles.loadButton]} onPress={handleLoad}>
          <Text style={[styles.loadText, { color: c.background }]}>Load</Text>
        </Pressable>
        <Pressable style={[styles.actionButton, { backgroundColor: c.surfaceElevated }]} onPress={handleRename}>
          <Text style={styles.actionText}>Rename</Text>
        </Pressable>
        <Pressable style={[styles.actionButton, { backgroundColor: c.surfaceElevated }]} onPress={handleDuplicate}>
          <Text style={styles.actionText}>Duplicate</Text>
        </Pressable>
        <Pressable style={[styles.actionButton, { backgroundColor: c.surfaceElevated }]} onPress={handleDelete}>
          <Text style={[styles.actionText, styles.dangerText]}>Delete</Text>
        </Pressable>
      </View>
    </Card>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function ExportCard({ record }: { record: ExportRecord }) {
  const c = useColors();
  const { deleteExport } = useExportStore();

  const handleDownload = useCallback(() => {
    if (Platform.OS === 'web') {
      const a = document.createElement('a');
      a.href = record.uri;
      a.download = record.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      Alert.alert('File Location', `Saved to: ${record.fileName}`);
    }
  }, [record]);

  const handleDelete = useCallback(() => {
    Alert.alert('Delete Export', `Delete "${record.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          if (Platform.OS === 'web') {
            try { URL.revokeObjectURL(record.uri); } catch { /* ignore */ }
          }
          deleteExport(record.id);
        },
      },
    ]);
  }, [record, deleteExport]);

  return (
    <Card style={styles.presetCard}>
      <View style={styles.presetHeader}>
        <View style={styles.presetInfo}>
          <Text style={styles.presetName} numberOfLines={1}>{record.name}</Text>
          <View style={styles.metaRow}>
            <View style={styles.exportBadge}>
              <Text style={styles.exportBadgeText}>WAV</Text>
            </View>
            <Text style={styles.dateText}>{formatDate(record.createdAt)}</Text>
          </View>
          <Text style={styles.summary} numberOfLines={1}>
            {formatDuration(record.durationSeconds)} · {formatFileSize(record.sizeBytes)}
          </Text>
        </View>
      </View>
      <View style={[styles.actionRow, { borderTopColor: c.border }]}>
        <Pressable style={[styles.actionButton, { backgroundColor: c.surfaceElevated }, styles.loadButton]} onPress={handleDownload}>
          <Text style={[styles.loadText, { color: c.background }]}>{Platform.OS === 'web' ? 'Download' : 'View'}</Text>
        </Pressable>
        <Pressable style={[styles.actionButton, { backgroundColor: c.surfaceElevated }]} onPress={handleDelete}>
          <Text style={[styles.actionText, styles.dangerText]}>Delete</Text>
        </Pressable>
      </View>
    </Card>
  );
}

function snapshotSummary(snapshot: Snapshot): string {
  if (snapshot.source === 'composer') {
    const s = snapshot.settings as ComposerSettings;
    return `${s.beatDifference.toFixed(1)} Hz beat · ${s.baseFrequency} Hz`;
  }
  const s = snapshot.settings as ExploreSettings;
  if (s.sourceMode === 'noise') {
    return `${s.noiseType} noise · ${Math.round(s.amplitude * 100)}%`;
  }
  return `${s.waveform} · ${Math.round(s.frequency)} Hz · ${Math.round(s.amplitude * 100)}%`;
}

function SnapshotCard({ snapshot }: { snapshot: Snapshot }) {
  const c = useColors();
  const router = useRouter();
  const { deleteSnapshot, renameSnapshot, setPendingRestore } = useSnapshotStore();
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(snapshot.name);

  const handleRestore = useCallback(() => {
    setPendingRestore(snapshot);
    if (snapshot.source === 'composer') {
      router.navigate('/composer');
    } else {
      router.navigate('/explore');
    }
  }, [snapshot, setPendingRestore, router]);

  const handleRename = useCallback(() => {
    setEditName(snapshot.name);
    setEditing(true);
  }, [snapshot.name]);

  const handleRenameSubmit = useCallback(() => {
    const trimmed = editName.trim();
    if (trimmed && trimmed !== snapshot.name) {
      renameSnapshot(snapshot.id, trimmed);
    }
    setEditing(false);
  }, [editName, snapshot.id, snapshot.name, renameSnapshot]);

  const handleDelete = useCallback(() => {
    Alert.alert('Delete Snapshot', `Delete "${snapshot.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteSnapshot(snapshot.id),
      },
    ]);
  }, [snapshot.id, snapshot.name, deleteSnapshot]);

  const sourceLabel = snapshot.source.charAt(0).toUpperCase() + snapshot.source.slice(1);

  return (
    <Card style={styles.presetCard}>
      <View style={styles.presetHeader}>
        <View style={styles.presetInfo}>
          {editing ? (
            <TextInput
              style={styles.renameInput}
              value={editName}
              onChangeText={setEditName}
              onBlur={handleRenameSubmit}
              onSubmitEditing={handleRenameSubmit}
              autoFocus
              selectTextOnFocus
            />
          ) : (
            <Text style={styles.presetName} numberOfLines={1}>{snapshot.name}</Text>
          )}
          <View style={styles.metaRow}>
            <View style={styles.snapshotBadge}>
              <Text style={styles.snapshotBadgeText}>{sourceLabel}</Text>
            </View>
            <Text style={styles.dateText}>{formatDate(snapshot.createdAt)}</Text>
          </View>
          <Text style={styles.summary} numberOfLines={1}>{snapshotSummary(snapshot)}</Text>
        </View>
      </View>

      <View style={[styles.actionRow, { borderTopColor: c.border }]}>
        <Pressable style={[styles.actionButton, { backgroundColor: c.surfaceElevated }, styles.loadButton]} onPress={handleRestore}>
          <Text style={[styles.loadText, { color: c.background }]}>Restore</Text>
        </Pressable>
        <Pressable style={[styles.actionButton, { backgroundColor: c.surfaceElevated }]} onPress={handleRename}>
          <Text style={styles.actionText}>Rename</Text>
        </Pressable>
        <Pressable style={[styles.actionButton, { backgroundColor: c.surfaceElevated }]} onPress={handleDelete}>
          <Text style={[styles.actionText, styles.dangerText]}>Delete</Text>
        </Pressable>
      </View>
    </Card>
  );
}

function SnapshotsSection() {
  const { snapshots, loaded, loadSnapshots } = useSnapshotStore();

  useEffect(() => {
    if (!loaded) loadSnapshots();
  }, [loaded, loadSnapshots]);

  if (snapshots.length === 0) return null;

  return (
    <View style={styles.exportsSection}>
      <Text style={styles.sectionTitle}>Snapshots</Text>
      {snapshots.map((snapshot) => (
        <SnapshotCard key={snapshot.id} snapshot={snapshot} />
      ))}
    </View>
  );
}

// ── Discoveries Section ──────────────────────────────────────

type CategoryFilter = 'all' | FrequencyCategory;

const FILTER_OPTIONS: CategoryFilter[] = [
  'all', 'solfeggio', 'musical', 'scientific', 'brainwave', 'harmonic', 'cultural',
];

const FILTER_LABELS: Record<CategoryFilter, string> = {
  all: 'All',
  ...CATEGORY_LABELS,
};

function DiscoveryCard({ entry, discovered }: { entry: CatalogEntry; discovered: boolean }) {
  const c = useColors();
  const [expanded, setExpanded] = useState(false);
  const icon = CATEGORY_ICONS[entry.category];

  if (!discovered) {
    return (
      <Card style={dStyles.card}>
        <View style={dStyles.undiscoveredContent}>
          <Text style={[dStyles.undiscoveredIcon, { color: c.border }]}>?</Text>
          <Text style={[dStyles.undiscoveredFreq, { color: c.textMuted }]}>
            {entry.frequency >= 1 ? `${Math.round(entry.frequency)} Hz` : `${entry.frequency} Hz`}
          </Text>
          <View style={[dStyles.categoryPill, { backgroundColor: c.surfaceElevated }]}>
            <Text style={[dStyles.categoryPillText, { color: c.textMuted }]}>
              {icon} {CATEGORY_LABELS[entry.category]}
            </Text>
          </View>
        </View>
      </Card>
    );
  }

  return (
    <Pressable onPress={() => setExpanded((p) => !p)}>
      <Card style={dStyles.card} glowing={expanded}>
        <View style={dStyles.cardHeader}>
          <Text style={dStyles.cardIcon}>{icon}</Text>
          <View style={dStyles.cardInfo}>
            <Text style={dStyles.cardName} numberOfLines={1}>{entry.name}</Text>
            <Text style={dStyles.cardFreq}>
              {entry.frequency >= 1 ? `${entry.frequency} Hz` : `${entry.frequency} Hz`}
            </Text>
          </View>
          <View style={[dStyles.categoryPill, { backgroundColor: c.surfaceElevated }]}>
            <Text style={[dStyles.categoryPillText, { color: c.textSecondary }]}>
              {CATEGORY_LABELS[entry.category]}
            </Text>
          </View>
        </View>
        {expanded && (
          <View style={[dStyles.descriptionBox, { borderTopColor: c.border }]}>
            <Text style={dStyles.descriptionText}>{entry.description}</Text>
          </View>
        )}
      </Card>
    </Pressable>
  );
}

function DiscoveriesSection() {
  const { discoveries, loaded, load } = useDiscoveryStore();
  const c = useColors();
  const [filter, setFilter] = useState<CategoryFilter>('all');

  useEffect(() => {
    if (!loaded) load();
  }, [loaded, load]);

  const discoveredSlugs = useMemo(
    () => new Set(discoveries.map((d) => d.slug)),
    [discoveries],
  );

  const filteredEntries = useMemo(
    () => filter === 'all'
      ? FREQUENCY_CATALOG
      : FREQUENCY_CATALOG.filter((e) => e.category === filter),
    [filter],
  );

  const discoveredCount = discoveredSlugs.size;
  const progressRatio = CATALOG_SIZE > 0 ? discoveredCount / CATALOG_SIZE : 0;

  return (
    <View style={dStyles.section}>
      <Text style={styles.sectionTitle}>Discoveries</Text>

      {/* Progress bar */}
      <View style={[dStyles.progressContainer, { backgroundColor: c.surfaceElevated }]}>
        <View style={dStyles.progressRow}>
          <Text style={dStyles.progressLabel}>
            {discoveredCount} / {CATALOG_SIZE} frequencies discovered
          </Text>
          <Text style={dStyles.progressPercent}>
            {Math.round(progressRatio * 100)}%
          </Text>
        </View>
        <View style={[dStyles.progressTrack, { backgroundColor: c.background }]}>
          <View style={[dStyles.progressFill, { width: `${Math.round(progressRatio * 100)}%` }]} />
        </View>
      </View>

      {/* Category filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={dStyles.filterScroll}
        contentContainerStyle={dStyles.filterRow}
      >
        {FILTER_OPTIONS.map((opt) => {
          const active = opt === filter;
          return (
            <Pressable
              key={opt}
              onPress={() => setFilter(opt)}
              style={[
                dStyles.filterChip,
                { backgroundColor: active ? c.accent : c.surfaceElevated },
              ]}
            >
              <Text style={[
                dStyles.filterChipText,
                { color: active ? '#fff' : c.textSecondary },
                active && { fontWeight: typography.semibold },
              ]}>
                {FILTER_LABELS[opt]}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Frequency cards grid */}
      <View style={dStyles.grid}>
        {filteredEntries.map((entry) => (
          <View key={entry.slug} style={dStyles.gridCell}>
            <DiscoveryCard
              entry={entry}
              discovered={discoveredSlugs.has(entry.slug)}
            />
          </View>
        ))}
      </View>

      {filteredEntries.length === 0 && (
        <Card style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No frequencies in this category</Text>
        </Card>
      )}
    </View>
  );
}

const dStyles = StyleSheet.create({
  section: {
    marginTop: spacing.lg,
  },
  progressContainer: {
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  progressLabel: {
    fontSize: typography.sm,
    fontWeight: typography.medium,
    color: colors.textSecondary,
  },
  progressPercent: {
    fontSize: typography.sm,
    fontWeight: typography.semibold,
    color: colors.accent,
  },
  progressTrack: {
    height: 6,
    borderRadius: radius.full,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.full,
    backgroundColor: colors.accent,
  },
  filterScroll: {
    marginBottom: spacing.md,
  },
  filterRow: {
    gap: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
  },
  filterChipText: {
    fontSize: typography.sm,
    fontWeight: typography.medium,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.xs,
  },
  gridCell: {
    width: '50%',
    paddingHorizontal: spacing.xs,
    marginBottom: spacing.sm,
  },
  card: {
    marginBottom: 0,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cardIcon: {
    fontSize: typography.lg,
    color: colors.accent,
  },
  cardInfo: {
    flex: 1,
  },
  cardName: {
    fontSize: typography.sm,
    fontWeight: typography.semibold,
    color: colors.textPrimary,
  },
  cardFreq: {
    fontSize: typography.xs,
    color: colors.textSecondary,
    marginTop: 1,
  },
  categoryPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  categoryPillText: {
    fontSize: 10,
    fontWeight: typography.medium,
  },
  undiscoveredContent: {
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  undiscoveredIcon: {
    fontSize: typography.xxl,
    fontWeight: typography.bold,
    marginBottom: spacing.xs,
  },
  undiscoveredFreq: {
    fontSize: typography.xs,
    marginBottom: spacing.xs,
  },
  descriptionBox: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    marginTop: spacing.sm,
  },
  descriptionText: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});

function ExportsSection() {
  const { exports: exportRecords, loaded, loadExports } = useExportStore();

  useEffect(() => {
    if (!loaded) loadExports();
  }, [loaded, loadExports]);

  return (
    <View style={styles.exportsSection}>
      <Text style={styles.sectionTitle}>Recent Exports</Text>
      {exportRecords.length === 0 ? (
        <Card style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No exports yet</Text>
          <Text style={styles.emptyBody}>
            Export audio from the Composer to find your files here.
          </Text>
        </Card>
      ) : (
        exportRecords.map((record) => (
          <ExportCard key={record.id} record={record} />
        ))
      )}
    </View>
  );
}

export default function LibraryScreen() {
  const { presets, loaded, loadPresets } = usePresetStore();
  const { gridColumns, isTablet } = useResponsive();

  useEffect(() => {
    if (!loaded) loadPresets();
  }, [loaded, loadPresets]);

  const renderItem = useCallback(({ item, index }: { item: Preset; index: number }) => (
    <View style={[
      styles.gridItem,
      isTablet && { width: '50%' as const, paddingLeft: index % 2 === 0 ? 0 : spacing.sm, paddingRight: index % 2 === 0 ? spacing.sm : 0 },
    ]}>
      <PresetCard preset={item} />
    </View>
  ), [isTablet]);

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Library</Text>
        <Text style={styles.subtitle}>Presets, snapshots, discoveries & exports</Text>
      </View>

      {presets.length === 0 ? (
        <ScrollView showsVerticalScrollIndicator={false}>
          <Card style={styles.emptyState}>
            <Text style={styles.emptyIcon}>&#9834;</Text>
            <Text style={styles.emptyTitle}>No presets yet</Text>
            <Text style={styles.emptyBody}>
              Save a session from Explore or Composer to see it here.
            </Text>
          </Card>
          <SnapshotsSection />
          <DiscoveriesSection />
          <ExportsSection />
        </ScrollView>
      ) : (
        <FlatList
          key={`cols-${gridColumns}`}
          data={presets}
          numColumns={gridColumns}
          keyExtractor={(p) => p.id}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
          ListFooterComponent={<><SnapshotsSection /><DiscoveriesSection /><ExportsSection /></>}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: {
    fontSize: typography.xxl,
    fontWeight: typography.bold,
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  list: {
    paddingBottom: spacing.xxl,
  },
  emptyState: {
    marginTop: spacing.xl,
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: spacing.md,
    color: colors.textMuted,
  },
  emptyTitle: {
    fontSize: typography.lg,
    fontWeight: typography.semibold,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  emptyBody: {
    fontSize: typography.sm,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: spacing.lg,
  },
  gridItem: {
    flex: 1,
  },
  presetCard: {
    marginBottom: spacing.md,
  },
  presetHeader: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  presetInfo: {
    flex: 1,
  },
  presetName: {
    fontSize: typography.lg,
    fontWeight: typography.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  typeBadge: {
    backgroundColor: colors.accentGlow,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  composerBadge: {
    backgroundColor: 'rgba(167, 139, 250, 0.15)',
  },
  snapshotBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  snapshotBadgeText: {
    fontSize: typography.xs,
    fontWeight: typography.semibold,
    color: '#38bdf8',
  },
  exportBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  exportBadgeText: {
    fontSize: typography.xs,
    fontWeight: typography.semibold,
    color: colors.warning,
  },
  typeBadgeText: {
    fontSize: typography.xs,
    fontWeight: typography.semibold,
    color: colors.accent,
  },
  composerBadgeText: {
    color: colors.highlight,
  },
  dateText: {
    fontSize: typography.xs,
    color: colors.textMuted,
  },
  summary: {
    fontSize: typography.sm,
    color: colors.textSecondary,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    marginTop: spacing.xs,
  },
  actionButton: {
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceElevated,
  },
  loadButton: {
    backgroundColor: colors.accent,
  },
  loadText: {
    fontSize: typography.sm,
    fontWeight: typography.semibold,
    color: colors.background,
  },
  actionText: {
    fontSize: typography.sm,
    fontWeight: typography.medium,
    color: colors.textSecondary,
  },
  dangerText: {
    color: colors.danger,
  },
  renameInput: {
    fontSize: typography.lg,
    fontWeight: typography.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.accent,
    paddingVertical: 2,
    paddingHorizontal: 0,
  },
  exportsSection: {
    marginTop: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.lg,
    fontWeight: typography.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
});
