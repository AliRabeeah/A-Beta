import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal, ScrollView, Switch, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../i18n/LanguageContext';

const COLOR_PALETTE = [
  '#1C1C1E', '#FFFFFF', '#6C8EF5', '#8CE0A0', '#F5A26C',
  '#F58CC7', '#6CC7F5', '#C9A6F5', '#F5D76C', '#E5484D',
];
const HEX_RE = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

/**
 * Table-wide settings: show/hide the totals row, lock editing, and
 * customize text/background colors (preset swatches or a raw hex code).
 * All changes are applied immediately via onUpdate(patch) — there's no
 * separate "save" step, matching the rest of the app's inline-edit feel.
 */
export default function TableSettingsSheet({ visible, table, onClose, onUpdate }) {
  const { colors } = useTheme();
  const { t, isRTL } = useLanguage();
  const insets = useSafeAreaInsets();

  const [textHex, setTextHex] = useState('');
  const [bgHex, setBgHex] = useState('');

  useEffect(() => {
    if (visible) {
      setTextHex(table?.appearance?.textColor || '');
      setBgHex(table?.appearance?.backgroundColor || '');
    }
  }, [visible, table]);

  if (!visible || !table) return null;

  const showTotal = table.showTotalRow !== false;
  const isLocked = !!table.locked;

  const applyColor = (field, hex, setter) => {
    const v = (hex || '').trim();
    if (!v) {
      onUpdate({ appearance: { ...(table.appearance || {}), [field]: null } });
      setter('');
      return;
    }
    if (!HEX_RE.test(v)) {
      Alert.alert(t('tableInvalidColor'));
      return;
    }
    onUpdate({ appearance: { ...(table.appearance || {}), [field]: v } });
    setter(v);
  };

  const renderColorSection = (label, field, hexValue, setHexValue) => (
    <View style={{ marginTop: 18 }}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
        <View style={[styles.swatchRow, isRTL && { flexDirection: 'row-reverse' }]}>
          {COLOR_PALETTE.map((hex) => {
            const active = (table.appearance?.[field] || '').toLowerCase() === hex.toLowerCase();
            return (
              <TouchableOpacity
                key={hex}
                onPress={() => applyColor(field, hex, setHexValue)}
                style={[
                  styles.swatch,
                  { backgroundColor: hex, borderColor: active ? colors.primary : colors.border, borderWidth: active ? 3 : 1 },
                ]}
              />
            );
          })}
        </View>
      </ScrollView>
      <View style={[styles.hexRow, isRTL && { flexDirection: 'row-reverse' }]}>
        <TextInput
          value={hexValue}
          onChangeText={setHexValue}
          placeholder="#RRGGBB"
          placeholderTextColor={colors.textSecondary}
          autoCapitalize="none"
          maxLength={7}
          style={[styles.hexInput, { color: colors.text, borderColor: colors.border, textAlign: isRTL ? 'right' : 'left' }]}
        />
        <TouchableOpacity onPress={() => applyColor(field, hexValue, setHexValue)} style={[styles.hexBtn, { backgroundColor: colors.primary }]}>
          <Text style={{ color: colors.onPrimary, fontWeight: '700', fontSize: 13 }}>{t('tableApplyColor')}</Text>
        </TouchableOpacity>
      </View>
      {!!table.appearance?.[field] && (
        <TouchableOpacity onPress={() => applyColor(field, '', setHexValue)} style={{ marginTop: 8 }}>
          <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '600' }}>{t('tableResetColor')}</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.content, { backgroundColor: colors.surface, paddingBottom: insets.bottom + 20 }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={8}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>

          <Text style={[styles.title, { color: colors.text }]}>{t('tableSettings')}</Text>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={[styles.switchRow, isRTL && { flexDirection: 'row-reverse' }]}>
              <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600', flex: 1 }}>{t('tableShowTotalRow')}</Text>
              <Switch
                value={showTotal}
                onValueChange={(v) => onUpdate({ showTotalRow: v })}
                trackColor={{ true: colors.primary }}
              />
            </View>

            <View style={[styles.switchRow, isRTL && { flexDirection: 'row-reverse' }]}>
              <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600', flex: 1 }}>{t('tableLockEditing')}</Text>
              <Switch
                value={isLocked}
                onValueChange={(v) => onUpdate({ locked: v })}
                trackColor={{ true: colors.primary }}
              />
            </View>
            {isLocked && (
              <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: -4, marginBottom: 4, textAlign: isRTL ? 'right' : 'left' }}>
                {t('tableLockedHint')}
              </Text>
            )}

            {renderColorSection(t('tableTextColor'), 'textColor', textHex, setTextHex)}
            {renderColorSection(t('tableBackgroundColor'), 'backgroundColor', bgHex, setBgHex)}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.7)' },
  content: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '82%' },
  closeBtn: { alignSelf: 'flex-end', padding: 4, marginBottom: 4 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 16, textAlign: 'center' },
  switchRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  label: { fontSize: 12, fontWeight: '700', marginBottom: 8, letterSpacing: 0.5 },
  swatchRow: { flexDirection: 'row', gap: 10, paddingVertical: 2 },
  swatch: { width: 30, height: 30, borderRadius: 15 },
  hexRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  hexInput: { flex: 1, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14 },
  hexBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
});
