import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { toKey } from '../utils/dateUtils';

/**
 * Bottom sheet shown when tapping a checklist-type habit: lists each
 * sub-item with its own checkbox so you can tick them off individually,
 * instead of the tap instantly marking the whole habit done. Fully
 * theme-aware (dark/light), like every other overlay in the app.
 */
export default function ChecklistQuickView({ visible, onClose, habit, date = new Date(), onToggleItem }) {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const insets = useSafeAreaInsets();

  if (!visible || !habit) return null;

  const locale = language === 'ar' ? 'ar-EG' : 'en-US';
  const dateLabel = date.toLocaleDateString(locale, { month: 'numeric', day: 'numeric', year: '2-digit' });
  const dayState = habit.checklist?.[toKey(date)] || {};

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
        <View style={[styles.sheetWrap, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity
            activeOpacity={1}
            style={[styles.sheet, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
          >
            <View style={styles.headerRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.habitName, { color: colors.text }]} numberOfLines={1}>{habit.name}</Text>
                <View style={[styles.datePill, { backgroundColor: `${habit.color}33` }]}>
                  <Text style={{ color: habit.color, fontSize: 13, fontWeight: '600' }}>{dateLabel}</Text>
                </View>
              </View>
              <View style={[styles.iconSquare, { backgroundColor: habit.color }]}>
                <Text style={{ fontSize: 20 }}>{habit.icon}</Text>
              </View>
            </View>

            {(habit.checklistItems || []).map((item, idx) => {
              const checked = !!dayState[item.id];
              return (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => onToggleItem(item.id, !checked)}
                  style={[
                    styles.row,
                    idx < habit.checklistItems.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
                  ]}
                >
                  <Text style={{ color: colors.text, fontSize: 16, flex: 1 }}>{item.name}</Text>
                  <View
                    style={[
                      styles.checkCircle,
                      { borderColor: checked ? habit.color : colors.border, backgroundColor: checked ? habit.color : 'transparent' },
                    ]}
                  >
                    {checked && <Ionicons name="checkmark" size={18} color={colors.onPrimary} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheetWrap: { paddingHorizontal: 16 },
  sheet: { borderRadius: 18, borderWidth: 1, overflow: 'hidden', paddingTop: 18 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 18, paddingBottom: 16 },
  habitName: { fontSize: 20, fontWeight: '800' },
  datePill: { alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, marginTop: 8 },
  iconSquare: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 16 },
  checkCircle: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
});
