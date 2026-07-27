import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';

/**
 * Bottom sheet shown when tapping a task that has a checklist: lists
 * each sub-item with its own checkbox. Unlike a habit's checklist
 * (which resets per day), a task's checklist is a single persistent
 * list — checking every item automatically marks the whole task done
 * (handled in TaskContext.toggleChecklistItem).
 */
export default function TaskChecklistQuickView({ visible, onClose, task, category, onToggleItem }) {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const insets = useSafeAreaInsets();

  if (!visible || !task) return null;

  const locale = language === 'ar' ? 'ar-EG' : 'en-US';
  const dateLabel = task.dueDate
    ? new Date(task.dueDate + 'T00:00:00').toLocaleDateString(locale, { month: 'numeric', day: 'numeric', year: '2-digit' })
    : null;
  const accentColor = category?.color || colors.primary;

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
                <Text style={[styles.taskName, { color: colors.text }]} numberOfLines={1}>{task.title}</Text>
                {dateLabel ? (
                  <View style={[styles.datePill, { backgroundColor: `${accentColor}33` }]}>
                    <Text style={{ color: accentColor, fontSize: 13, fontWeight: '600' }}>{dateLabel}</Text>
                  </View>
                ) : null}
              </View>
              <View style={[styles.iconSquare, { backgroundColor: accentColor }]}>
                <Text style={{ fontSize: 20 }}>{category?.icon}</Text>
              </View>
            </View>

            {(task.checklist || []).map((item, idx) => (
              <TouchableOpacity
                key={item.id}
                onPress={() => onToggleItem(item.id)}
                style={[
                  styles.row,
                  idx < task.checklist.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
                ]}
              >
                <Text style={{ color: colors.text, fontSize: 16, flex: 1 }}>{item.name}</Text>
                <View
                  style={[
                    styles.checkCircle,
                    { borderColor: item.done ? accentColor : colors.border, backgroundColor: item.done ? accentColor : 'transparent' },
                  ]}
                >
                  {item.done && <Ionicons name="checkmark" size={18} color={colors.onPrimary} />}
                </View>
              </TouchableOpacity>
            ))}
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
  taskName: { fontSize: 20, fontWeight: '800' },
  datePill: { alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, marginTop: 8 },
  iconSquare: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 16 },
  checkCircle: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
});
