import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../theme/ThemeContext';

/**
 * Visual shell for an embedded audio attachment (e.g. a FaceTime Audio
 * recap or voice memo), matching the rounded card + Play pill seen in
 * iOS Notes.
 *
 * NOTE: This renders play/pause state locally but does not actually
 * play audio — this project doesn't have `expo-av` installed. To wire
 * real playback: `expo install expo-av`, load block.audioUri with
 * `Audio.Sound.createAsync`, and drive `isPlaying` from playback status
 * instead of local state.
 */
export default function AudioAttachmentCard({ block }) {
  const { colors } = useTheme();
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.textCol}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {block.title}
        </Text>
        {!!block.dateLabel && (
          <Text style={[styles.meta, { color: colors.textSecondary }]}>{block.dateLabel}</Text>
        )}
        {!!block.subtitle && (
          <Text style={[styles.meta, { color: colors.textSecondary }]}>{block.subtitle}</Text>
        )}
      </View>

      <TouchableOpacity
        onPress={() => setIsPlaying((p) => !p)}
        style={[styles.playBtn, { backgroundColor: colors.primary }]}
        activeOpacity={0.8}
      >
        <Ionicons name={isPlaying ? 'pause' : 'play'} size={13} color={colors.onPrimary} />
        <Text style={[styles.playLabel, { color: colors.onPrimary }]}>
          {isPlaying ? 'Pause' : 'Play'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    marginBottom: 14,
  },
  textCol: {
    flexShrink: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  meta: {
    fontSize: 12,
    lineHeight: 16,
  },
  playBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    gap: 5,
  },
  playLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
});
