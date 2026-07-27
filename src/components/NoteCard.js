import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../theme/ThemeContext';
import { useTokens } from '../theme/tokens';
import { useLanguage } from '../i18n/LanguageContext';
import AnimatedPressable from './AnimatedPressable';
import ActionSheet from './ActionSheet';

export default function NoteCard({
  note,
  onPress,
  onToggleLock,
  onToggleFavorite,
  onDelete,
  onSetReminder,
  index = 0,
}) {
  const { colors } = useTheme();
  const tokens = useTokens();
  const { t } = useLanguage();
  const [menuVisible, setMenuVisible] = useState(false);

  // Truncate content preview to 50 characters
  const contentPreview = note.isLocked
    ? 'Locked Note'
    : (note.content || '').substring(0, 50) + (note.content?.length > 50 ? '...' : '');

  // Format last edited time
  const lastEditedDate = new Date(note.lastEdited);
  const timeAgo = getTimeAgo(lastEditedDate);

  const menuActions = [
    {
      icon: note.isFavorite ? 'star' : 'star-outline',
      label: note.isFavorite ? 'Unstar' : 'Favorite',
      onPress: onToggleFavorite,
    },
    {
      icon: note.isLocked ? 'lock-open' : 'lock-closed',
      label: note.isLocked ? 'Unlock' : 'Lock',
      onPress: onToggleLock,
    },
    {
      icon: 'notifications-outline',
      label: 'Set Reminder',
      onPress: onSetReminder,
    },
    {
      icon: 'trash-outline',
      label: t('delete'),
      onPress: onDelete,
      destructive: true,
    },
  ];

  return (
    <>
      <AnimatedPressable
        index={index}
        onPress={onPress}
        onLongPress={() => {
          Haptics.selectionAsync();
          setMenuVisible(true);
        }}
        style={[styles.card, tokens.glass.card, tokens.shadow.soft]}
      >
        {/* Header: Icon, Title, Lock Indicator */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text
              style={[styles.title, { color: colors.text }]}
              numberOfLines={1}
            >
              {note.title || 'Untitled Note'}
            </Text>
            <Text
              style={[styles.preview, { color: colors.textSecondary }]}
              numberOfLines={1}
            >
              {contentPreview}
            </Text>
          </View>

          {/* Lock Icon */}
          <View style={styles.lockContainer}>
            {note.isLocked && (
              <Ionicons name="lock-closed" size={16} color={colors.danger} />
            )}
          </View>
        </View>

        {/* Footer: Metadata and Actions */}
        <View style={styles.footer}>
          <View style={styles.metadata}>
            <Text style={[styles.timestamp, { color: colors.textSecondary }]}>
              {timeAgo}
            </Text>
            {note.isFavorite && (
              <Ionicons
                name="star"
                size={14}
                color={colors.primary}
                style={{ marginLeft: 8 }}
              />
            )}
          </View>

          <TouchableOpacity
            onPress={() => setMenuVisible(true)}
            style={styles.moreBtn}
          >
            <Ionicons name="ellipsis-horizontal" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </AnimatedPressable>

      <ActionSheet
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        title={note.title || 'Note'}
        actions={menuActions}
      />
    </>
  );
}

function getTimeAgo(date) {
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

  return date.toLocaleDateString();
}

const styles = StyleSheet.create({
  card: {
    padding: 14,
    marginBottom: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  preview: {
    fontSize: 12,
  },
  lockContainer: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metadata: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timestamp: {
    fontSize: 11,
    fontWeight: '500',
  },
  moreBtn: {
    padding: 4,
  },
});
