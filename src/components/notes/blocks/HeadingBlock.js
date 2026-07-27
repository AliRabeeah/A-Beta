import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { useTheme } from '../../../theme/ThemeContext';

export default function HeadingBlock({ block }) {
  const { colors } = useTheme();
  return (
    <Text style={[styles.heading, { color: colors.text }]}>{block.text}</Text>
  );
}

const styles = StyleSheet.create({
  heading: {
    fontSize: 17,
    fontWeight: '700',
    marginTop: 4,
    marginBottom: 10,
  },
});
