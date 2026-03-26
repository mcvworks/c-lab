import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import Screen from '@/src/components/Screen';
import Card from '@/src/components/Card';
import { usePresetStore } from '@/src/state/usePresetStore';
import { useExportStore } from '@/src/state/useExportStore';
import { useResponsive } from '@/src/hooks/useResponsive';
import type { Preset, ExportRecord } from '@/src/types/preset';
import type { ExploreSettings, ComposerSettings } from '@/src/types/preset';
import { colors, spacing, typography, radius } from '@/src/theme';

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

      <View style={styles.actionRow}>
        <Pressable style={[styles.actionButton, styles.loadButton]} onPress={handleLoad}>
          <Text style={styles.loadText}>Load</Text>
        </Pressable>
        <Pressable style={styles.actionButton} onPress={handleRename}>
          <Text style={styles.actionText}>Rename</Text>
        </Pressable>
        <Pressable style={styles.actionButton} onPress={handleDuplicate}>
          <Text style={styles.actionText}>Duplicate</Text>
        </Pressable>
        <Pressable style={styles.actionButton} onPress={handleDelete}>
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
      <View style={styles.actionRow}>
        <Pressable style={[styles.actionButton, styles.loadButton]} onPress={handleDownload}>
          <Text style={styles.loadText}>{Platform.OS === 'web' ? 'Download' : 'View'}</Text>
        </Pressable>
        <Pressable style={styles.actionButton} onPress={handleDelete}>
          <Text style={[styles.actionText, styles.dangerText]}>Delete</Text>
        </Pressable>
      </View>
    </Card>
  );
}

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
        <Text style={styles.subtitle}>Saved presets & exports</Text>
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
          ListFooterComponent={<ExportsSection />}
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
