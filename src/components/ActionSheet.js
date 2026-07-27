import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';

// Original A flat, bordered bottom-sheet styling. The action API is
// unchanged so newer screens retain their functionality.
export default function ActionSheet({ visible, onClose, title, actions = [] }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
        <View style={[styles.sheetWrap, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity
            activeOpacity={1}
            style={[styles.sheet, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
          >
            {title ? (
              <Text style={[styles.title, { color: colors.textSecondary, borderBottomColor: colors.border }]} numberOfLines={1}>
                {title}
              </Text>
            ) : null}
            {actions.map((action, idx) => (
              <TouchableOpacity
                key={idx}
                onPress={() => {
                  Haptics.selectionAsync();
                  onClose();
                  action.onPress && action.onPress();
                }}
                style={[
                  styles.row,
                  idx < actions.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
                ]}
              >
                {action.icon ? <Ionicons name={action.icon} size={20} color={action.destructive ? colors.danger : colors.text} style={{ marginRight: 14 }} /> : null}
                <Text style={{ color: action.destructive ? colors.danger : colors.text, fontSize: 16, fontWeight: '600' }}>
                  {action.label}
                </Text>
              </TouchableOpacity>
            ))}
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={[styles.cancelBtn, { backgroundColor: colors.surfaceElevated }]}>
            <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>{'\u2715'}</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheetWrap: { paddingHorizontal: 16 },
  sheet: { borderRadius: 18, borderWidth: 1, overflow: 'hidden', marginBottom: 12 },
  title: { fontSize: 13, fontWeight: '700', paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 16 },
  cancelBtn: { borderRadius: 18, alignItems: 'center', justifyContent: 'center', paddingVertical: 14 },
});
