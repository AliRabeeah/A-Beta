import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { NOTE_COLOR_IDS, NOTE_COLOR_PALETTE } from '../../constants/noteOptions';

/**
 * Row of small color circles for picking a note's pastel card color.
 * `value` / `onChange` deal in color ids ('mint', 'peach', ...), not hex
 * values, so the same id resolves to the right tone in both light and
 * dark mode automatically.
 */
export default function NoteColorPickerRow({ value, onChange }) {
  const { mode } = useTheme();
  const isDark = mode === 'dark';

  return (
    <View style={styles.row}>
      {NOTE_COLOR_IDS.map((id) => {
        const tone = NOTE_COLOR_PALETTE[id][isDark ? 'dark' : 'light'];
        const active = value === id;
        return (
          <TouchableOpacity
            key={id}
            onPress={() => onChange(id)}
            style={[
              styles.swatch,
              {
                backgroundColor: tone.bg,
                borderColor: active ? tone.text : 'transparent',
                borderWidth: active ? 2 : 0,
              },
            ]}
          >
            {active && <Ionicons name="checkmark" size={14} color={tone.text} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  swatch: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
