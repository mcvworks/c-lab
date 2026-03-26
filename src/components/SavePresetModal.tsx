import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { colors, radius, spacing, typography } from '@/src/theme';

interface SavePresetModalProps {
  visible: boolean;
  defaultName?: string;
  onSave: (name: string) => void;
  onCancel: () => void;
}

export default function SavePresetModal({
  visible,
  defaultName = '',
  onSave,
  onCancel,
}: SavePresetModalProps) {
  const [name, setName] = useState(defaultName);

  const handleSave = () => {
    onSave(name);
    setName('');
  };

  const handleCancel = () => {
    setName('');
    onCancel();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <Pressable style={styles.overlay} onPress={handleCancel}>
        <Pressable style={styles.dialog} onPress={() => {}}>
          <Text style={styles.title}>Save Preset</Text>
          <Text style={styles.subtitle}>Give your preset a name</Text>

          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="My preset"
            placeholderTextColor={colors.textMuted}
            autoFocus
            selectTextOnFocus
            maxLength={50}
          />

          <View style={styles.buttonRow}>
            <Pressable
              style={[styles.button, styles.cancelButton]}
              onPress={handleCancel}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.button, styles.saveButton]}
              onPress={handleSave}
            >
              <Text style={styles.saveText}>Save</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialog: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    width: '85%',
    maxWidth: 360,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    fontSize: typography.lg,
    fontWeight: typography.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    fontSize: typography.md,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  button: {
    flex: 1,
    paddingVertical: spacing.sm + 4,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: colors.surfaceElevated,
  },
  saveButton: {
    backgroundColor: colors.accent,
  },
  cancelText: {
    fontSize: typography.md,
    fontWeight: typography.semibold,
    color: colors.textSecondary,
  },
  saveText: {
    fontSize: typography.md,
    fontWeight: typography.semibold,
    color: colors.background,
  },
});
