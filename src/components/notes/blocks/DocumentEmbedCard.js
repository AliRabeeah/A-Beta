import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../theme/ThemeContext';

/**
 * Collapsible embedded document reference (e.g. a linked textbook
 * chapter or PDF). Tapping the header expands/collapses the preview —
 * this is presentational only; wire `onOpen` if you want it to push a
 * full document viewer.
 */
export default function DocumentEmbedCard({ block, onOpen }) {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(true);

  return (
    <View style={styles.wrap}>
      <TouchableOpacity
        style={styles.header}
        activeOpacity={0.7}
        onPress={() => setExpanded((v) => !v)}
      >
        <Ionicons name="document-text-outline" size={16} color={colors.textSecondary} style={{ marginRight: 6 }} />
        <Text style={[styles.headerText, { color: colors.text }]} numberOfLines={1}>
          {block.title}
        </Text>
        <Ionicons
          name={expanded ? 'chevron-down' : 'chevron-forward'}
          size={16}
          color={colors.textSecondary}
        />
      </TouchableOpacity>

      {expanded && (
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onOpen}
          style={[styles.previewCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          {block.thumbnailUri ? (
            <Image source={{ uri: block.thumbnailUri }} style={styles.thumb} resizeMode="cover" />
          ) : null}
          <View style={styles.previewTextCol}>
            {!!block.snippetTitle && (
              <Text style={[styles.snippetTitle, { color: colors.primary }]} numberOfLines={1}>
                {block.snippetTitle}
              </Text>
            )}
            {!!block.snippetBody && (
              <Text style={[styles.snippetBody, { color: colors.textSecondary }]} numberOfLines={4}>
                {block.snippetBody}
              </Text>
            )}
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    marginRight: 6,
  },
  previewCard: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    padding: 12,
    gap: 10,
  },
  thumb: {
    width: 56,
    height: 72,
    borderRadius: 6,
  },
  previewTextCol: {
    flex: 1,
  },
  snippetTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  snippetBody: {
    fontSize: 12,
    lineHeight: 16,
  },
});
