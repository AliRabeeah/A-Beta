import React from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';

export default function NotesSearchBar({ value, onChangeText, onCancel, autoFocus = true, placeholder = 'Search' }) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <View style={[styles.inputWrap, { backgroundColor: colors.surface }]}>
        <Ionicons name="search" size={17} color={colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textSecondary}
          style={[styles.input, { color: colors.text }]}
          autoFocus={autoFocus}
          returnKeyType="search"
          clearButtonMode="never"
        />
        {value?.length > 0 && (
          <TouchableOpacity onPress={() => onChangeText('')} hitSlop={8} style={styles.clearBtn}>
            <Ionicons name="close-circle" size={17} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {onCancel && (
        <TouchableOpacity onPress={onCancel} style={styles.cancelBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 6,
  },
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 8,
    height: 36,
  },
  searchIcon: {
    marginRight: 4,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
    height: '100%',
  },
  clearBtn: {
    padding: 2,
  },
  cancelBtn: {
    paddingLeft: 8,
    paddingVertical: 4,
  },
});
