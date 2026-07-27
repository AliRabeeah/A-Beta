import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../theme/ThemeContext';

export default function LinkReferenceChip({ block, onPress }) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity onPress={onPress} style={styles.row} activeOpacity={0.6}>
      <Text style={[styles.text, { color: colors.text }]}>{block.prefix || ''}</Text>
      <Ionicons name={block.icon || 'link'} size={15} color={colors.primary} style={{ marginHorizontal: 4 }} />
      <Text style={[styles.link, { color: colors.primary }]}>{block.label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  text: {
    fontSize: 16,
  },
  link: {
    fontSize: 16,
    fontWeight: '600',
  },
});
