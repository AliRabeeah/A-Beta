import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../i18n/LanguageContext';

// iOS Notes-style short date: relative label for the row's second line
function formatRowDate(isoString, t, locale) {
  const date = new Date(isoString);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) {
    return date.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' });
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return t('yesterdayLabel') || 'Yesterday';

  const isThisYear = date.getFullYear() === now.getFullYear();
  return date.toLocaleDateString(locale, {
    month: 'numeric',
    day: 'numeric',
    year: isThisYear ? undefined : '2-digit',
  });
}

// Pulls a plain-text preview from a note's rich `blocks`, falling back to
// the legacy `content` string for notes that haven't been migrated.
function getPreviewText(note, t) {
  if (note.isLocked) return t('noteLockedTitle');
  const firstTextBlock = (note.blocks || []).find(
    (b) => (b.type === 'paragraph' || b.type === 'heading' || b.type === 'quote') && (b.text || '').trim()
  );
  if (firstTextBlock) return firstTextBlock.text.replace(/\s+/g, ' ').trim();
  return (note.content || '').replace(/\s+/g, ' ').trim();
}

// First image (or document thumbnail) in the note's blocks, shown as a
// small square preview on the right of the row.
function getThumbnailUri(note) {
  const block = (note.blocks || []).find(
    (b) => (b.type === 'image' && b.uri) || (b.type === 'document' && b.thumbnailUri)
  );
  if (!block) return null;
  return block.uri || block.thumbnailUri;
}

export default function NoteRow({ note, onPress, showDivider = true }) {
  const { colors } = useTheme();
  const { t, language, isRTL } = useLanguage();
  const locale = language === 'ar' ? 'ar-EG' : 'en-US';

  const hasChecklist = (note.checklistItems || []).length > 0;
  const isShared = (note.collaborators || []).length > 0;
  const isLinked = !isShared && (note.blocks || []).some((b) => b.type === 'document');
  const thumbnailUri = getThumbnailUri(note);
  const timestamp = formatRowDate(note.lastEdited || note.createdAt, t, locale);
  const snippet = note.isLocked ? t('noteLockedSubtitle') : getPreviewText(note, t);

  return (
    <TouchableOpacity
      activeOpacity={0.6}
      onPress={onPress}
      style={[styles.row, { backgroundColor: colors.surface }, isRTL && { flexDirection: 'row-reverse' }]}
    >
      <View style={styles.textCol}>
        <View style={[styles.titleLine, isRTL && { flexDirection: 'row-reverse' }]}>
          {note.isLocked && (
            <Ionicons
              name="lock-closed"
              size={13}
              color={colors.textSecondary}
              style={isRTL ? { marginLeft: 4 } : { marginRight: 4 }}
            />
          )}
          <Text style={[styles.title, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={1}>
            {note.title || t('untitledNote')}
          </Text>
        </View>

        <View style={[styles.subtitleLine, isRTL && { flexDirection: 'row-reverse' }]}>
          <Text style={[styles.metaText, { color: colors.textSecondary }]}>{timestamp}</Text>

          {isShared && (
            <Ionicons name="people" size={12} color={colors.textSecondary} style={styles.inlineIcon} />
          )}
          {isLinked && (
            <Ionicons name="document-text-outline" size={12} color={colors.textSecondary} style={styles.inlineIcon} />
          )}
          {hasChecklist && !isShared && !isLinked && (
            <Ionicons name="checkbox-outline" size={12} color={colors.textSecondary} style={styles.inlineIcon} />
          )}

          <Text style={[styles.snippet, { color: colors.textSecondary }]} numberOfLines={1}>
            {'  ' + (snippet || t('noAdditionalText'))}
          </Text>
        </View>
      </View>

      {thumbnailUri && (
        <Image source={{ uri: thumbnailUri }} style={styles.thumbnail} resizeMode="cover" />
      )}

      {showDivider && (
        <View style={[styles.divider, { backgroundColor: colors.border }, isRTL ? { left: 0, right: 16 } : { left: 16, right: 0 }]} />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 64,
  },
  textCol: {
    flex: 1,
    flexShrink: 1,
    marginRight: 10,
  },
  titleLine: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    flexShrink: 1,
  },
  subtitleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  metaText: {
    fontSize: 13,
  },
  inlineIcon: {
    marginLeft: 5,
  },
  snippet: {
    fontSize: 13,
    flexShrink: 1,
  },
  thumbnail: {
    width: 44,
    height: 44,
    borderRadius: 8,
  },
  divider: {
    position: 'absolute',
    bottom: 0,
    height: StyleSheet.hairlineWidth,
  },
});
