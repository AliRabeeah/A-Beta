import React from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../../i18n/LanguageContext';
import { autoTextAlign } from '../../../utils/textDirection';

/**
 * Editable bullet ("•") or numbered ("1.", "2.", ...) list block. Mirrors
 * the checklist block's line-by-line editing feel: Enter adds the next
 * line, Backspace on an empty line removes it (and drops back to a plain
 * paragraph once the last line is cleared).
 */
export default function EditableListBlock({
  block,
  tint,
  fontScale = 1,
  onChangeItemText,
  onSubmitItem,
  onBackspaceEmptyItem,
  registerInputRef,
}) {
  const { isRTL } = useLanguage();
  const isNumbered = block.type === 'numberedList';

  return (
    <View style={styles.wrap}>
      {(block.items || []).map((item, index) => (
        <View key={item.id} style={[styles.row, isRTL && { flexDirection: 'row-reverse' }]}>
          <Text style={[styles.marker, { color: tint, fontSize: 15 * fontScale }]}>
            {isNumbered ? `${index + 1}.` : '\u2022'}
          </Text>
          <TextInput
            ref={(ref) => registerInputRef && registerInputRef(item.id, ref)}
            value={item.text}
            onChangeText={(v) => onChangeItemText(item.id, v)}
            onSubmitEditing={() => onSubmitItem(item.id)}
            onKeyPress={({ nativeEvent }) => {
              if (nativeEvent.key === 'Backspace' && !item.text) onBackspaceEmptyItem(item.id);
            }}
            blurOnSubmit={false}
            returnKeyType="next"
            style={[
              styles.input,
              { color: tint, fontSize: 15 * fontScale, textAlign: autoTextAlign(item.text, isRTL) },
            ]}
            multiline
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginVertical: 4 },
  row: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4, gap: 8 },
  marker: { fontWeight: '700', minWidth: 16, paddingTop: 1 },
  input: { flex: 1, lineHeight: 21, padding: 0 },
});
