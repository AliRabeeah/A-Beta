import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../i18n/LanguageContext';
import { getTagById, resolveNoteColor, DEFAULT_NOTE_EMOJI } from '../../constants/noteOptions';
import AnimatedPressable from '../AnimatedPressable';

function formatCardDate(isoString, locale) {
  if (!isoString) return '';
  const date = new Date(isoString);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) return date.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' });
  const isThisYear = date.getFullYear() === now.getFullYear();
  return date.toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
    year: isThisYear ? undefined : 'numeric',
  });
}

function getSnippet(note) {
  const firstTextBlock = (note.blocks || []).find((b) => b.type === 'paragraph' && (b.text || '').trim());
  const text = firstTextBlock ? firstTextBlock.text : note.content || '';
  return (text || '').replace(/\s+/g, ' ').trim();
}

function getFlatChecklist(note) {
  return note.checklistItems || [];
}

/**
 * A single card in the notes masonry grid — matches the approved design:
 *  - the note's chosen pastel color as a full card tint (light/dark aware)
 *  - emoji, title, up to 2 lines of snippet text
 *  - a checklist preview (checkbox rows, struck-through when done)
 *  - one tag badge, a "washi tape" strip when pinned
 *  - a tappable pin corner that toggles pinned state WITHOUT opening the note
 */
export default function NoteMasonryCard({ note, onPress, onLongPress, onTogglePin, onToggleChecklistItem, index = 0 }) {
  const { mode } = useTheme();
  const { t, language } = useLanguage();
  const locale = language === 'ar' ? 'ar-EG' : 'en-US';
  const isDark = mode === 'dark';

  const tone = resolveNoteColor(note.color, isDark);
  const snippet = getSnippet(note);
  const tag = getTagById(note.tag);
  const checklist = getFlatChecklist(note);
  const visibleChecklist = checklist.slice(0, 3);
  const extraChecklistCount = Math.max(0, checklist.length - visibleChecklist.length);
  const timestamp = formatCardDate(note.lastEdited || note.createdAt, locale);

  return (
    <AnimatedPressable
      index={index}
      onPress={onPress}
      onLongPress={onLongPress}
      style={[styles.card, { backgroundColor: tone.bg }]}
    >
      {note.isFavorite && (
        <View style={[styles.tape, { backgroundColor: tone.tape }]} />
      )}

      <View style={styles.topRow}>
        <Text style={styles.emoji}>{note.emoji || DEFAULT_NOTE_EMOJI}</Text>
        <TouchableOpacity
          onPress={() => {
            Haptics.selectionAsync();
            onTogglePin();
          }}
          hitSlop={10}
          style={[styles.pinBtn, { backgroundColor: note.isFavorite ? tone.tape : 'rgba(255,255,255,0.25)' }]}
        >
          <Ionicons
            name={note.isFavorite ? 'pin' : 'pin-outline'}
            size={14}
            color={note.isFavorite ? '#fff' : tone.text}
          />
        </TouchableOpacity>
      </View>

      <Text style={[styles.title, { color: tone.text }]} numberOfLines={1}>
        {note.title || t('untitledNote')}
      </Text>

      {!!snippet && (
        <Text style={[styles.snippet, { color: tone.text }]} numberOfLines={2}>
          {snippet}
        </Text>
      )}

      {visibleChecklist.length > 0 && (
        <View style={styles.checklistWrap}>
          {visibleChecklist.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.checklistRow}
              hitSlop={4}
              disabled={!onToggleChecklistItem}
              onPress={() => {
                Haptics.selectionAsync();
                onToggleChecklistItem && onToggleChecklistItem(item.id);
              }}
            >
              <View
                style={[
                  styles.checkbox,
                  {
                    borderColor: tone.text,
                    backgroundColor: item.isChecked ? tone.text : 'transparent',
                  },
                ]}
              >
                {item.isChecked && <Ionicons name="checkmark" size={9} color={tone.bg} />}
              </View>
              <Text
                numberOfLines={1}
                style={[
                  styles.checklistText,
                  { color: tone.text, opacity: item.isChecked ? 0.55 : 0.92, textDecorationLine: item.isChecked ? 'line-through' : 'none' },
                ]}
              >
                {item.text}
              </Text>
            </TouchableOpacity>
          ))}
          {extraChecklistCount > 0 && (
            <Text style={[styles.moreItems, { color: tone.text, opacity: 0.7 }]}>
              {t('noteMoreItemsCount', extraChecklistCount)}
            </Text>
          )}
        </View>
      )}

      <View style={styles.footerRow}>
        {tag ? (
          <View style={[styles.tagBadge, { backgroundColor: 'rgba(255,255,255,0.3)' }]}>
            <Text style={styles.tagEmoji}>{tag.emoji}</Text>
          </View>
        ) : (
          <View />
        )}
        <Text style={[styles.timestamp, { color: tone.text, opacity: 0.6 }]}>{timestamp}</Text>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  tape: {
    position: 'absolute',
    top: -6,
    right: 22,
    width: 32,
    height: 14,
    borderRadius: 2,
    opacity: 0.9,
    transform: [{ rotate: '-4deg' }],
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  emoji: { fontSize: 22 },
  pinBtn: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  title: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  snippet: {
    fontSize: 13,
    lineHeight: 18,
    opacity: 0.82,
  },
  checklistWrap: {
    marginTop: 8,
  },
  checklistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  checkbox: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.3,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  checklistText: {
    fontSize: 12.5,
    flexShrink: 1,
  },
  moreItems: {
    fontSize: 11,
    marginLeft: 20,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  tagBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagEmoji: { fontSize: 12 },
  timestamp: {
    fontSize: 11,
  },
});
