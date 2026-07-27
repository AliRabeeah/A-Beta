import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../../theme/ThemeContext';
import { useLanguage } from '../../../i18n/LanguageContext';

/**
 * Renders one checklist "group" — a set of checklist items sharing the
 * same block.groupId. A note can contain several of these interleaved
 * with paragraphs/headings (e.g. a "To Do:" list, then more text, then
 * a "Places to see" list).
 */
export default function ChecklistGroupBlock({
  items,
  editable = false,
  onToggle,
  onChangeText,
  onRemove,
  onAddItem,
}) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const [draft, setDraft] = useState('');

  const commitDraft = () => {
    const value = draft.trim();
    if (value) onAddItem && onAddItem(value);
    setDraft('');
  };

  return (
    <View style={styles.group}>
      {items.map((item) => (
        <View key={item.id} style={styles.row}>
          <TouchableOpacity
            onPress={() => {
              Haptics.selectionAsync();
              onToggle && onToggle(item.id);
            }}
            hitSlop={8}
            style={styles.checkboxWrap}
          >
            <View
              style={[
                styles.checkbox,
                {
                  borderColor: item.isChecked ? colors.primary : colors.textSecondary,
                  backgroundColor: item.isChecked ? colors.primary : 'transparent',
                },
              ]}
            >
              {item.isChecked && <Ionicons name="checkmark" size={13} color={colors.onPrimary} />}
            </View>
          </TouchableOpacity>

          {editable ? (
            <TextInput
              value={item.text}
              onChangeText={(text) => onChangeText && onChangeText(item.id, text)}
              style={[
                styles.itemText,
                {
                  color: item.isChecked ? colors.textSecondary : colors.text,
                  textDecorationLine: item.isChecked ? 'line-through' : 'none',
                },
              ]}
              multiline
            />
          ) : (
            <Text
              style={[
                styles.itemText,
                {
                  color: item.isChecked ? colors.textSecondary : colors.text,
                  textDecorationLine: item.isChecked ? 'line-through' : 'none',
                },
              ]}
            >
              {item.text}
            </Text>
          )}

          {editable && (
            <TouchableOpacity onPress={() => onRemove && onRemove(item.id)} hitSlop={8} style={styles.removeBtn}>
              <Ionicons name="close" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      ))}

      {editable && (
        <View style={styles.row}>
          <View style={[styles.checkbox, { borderColor: colors.textSecondary }]} />
          <TextInput
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={commitDraft}
            onBlur={commitDraft}
            placeholder={t('addChecklistItemPlaceholder')}
            placeholderTextColor={colors.textSecondary}
            style={[styles.itemText, { color: colors.text }]}
            returnKeyType="done"
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  checkboxWrap: {
    paddingTop: 2,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  itemText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 20,
    paddingTop: 0,
  },
  removeBtn: {
    paddingLeft: 8,
    paddingTop: 2,
  },
});
