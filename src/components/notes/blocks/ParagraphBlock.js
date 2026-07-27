import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { useTheme } from '../../../theme/ThemeContext';

const MENTION_REGEX = /(@[A-Za-z0-9_]+)/g;

/**
 * Renders a block of body text, splitting out @mentions and rendering
 * them in the app's accent color/weight — matching how Notes highlights
 * collaborators mentioned inline (e.g. "@Yumi and I are...").
 */
export default function ParagraphBlock({ block, editable = false, onChangeText }) {
  const { colors } = useTheme();
  const text = block.text || '';

  if (editable) {
    // Plain editable text area — mention highlighting only applies to
    // committed/read content, matching how most note editors work (the
    // raw text is edited, then re-rendered with formatting on blur).
    return null; // handled by the editor's own TextInput; see AddEditNoteScreen
  }

  const parts = text.split(MENTION_REGEX);

  return (
    <Text style={[styles.text, { color: colors.text }]}>
      {parts.map((part, i) =>
        MENTION_REGEX.test(part) ? (
          <Text key={i} style={{ color: colors.primary, fontWeight: '700' }}>
            {part}
          </Text>
        ) : (
          <Text key={i}>{part}</Text>
        )
      )}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 12,
  },
});
