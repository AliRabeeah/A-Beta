import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../i18n/LanguageContext';
import { getTagById, resolveNoteColor, DEFAULT_NOTE_EMOJI, resolveFontScale, DEFAULT_NOTE_FONT_SIZE } from '../../constants/noteOptions';
import AnimatedPressable from '../AnimatedPressable';

/**
 * Faint horizontal ruled lines behind the card content — a subtle "paper"
 * texture rather than a flat color fill. Purely decorative (pointerEvents
 * disabled) and drawn with a handful of SVG lines, so it stays cheap even
 * across a whole masonry grid.
 */
function PaperTexture({ color }) {
  const lines = [40, 62, 84, 106, 128, 150, 172, 194];
  return (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
      {lines.map((y) => (
        <Line key={y} x1="0" y1={y} x2="100%" y2={y} stroke={color} strokeWidth={1} strokeOpacity={0.08} />
      ))}
    </Svg>
  );
}

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

// Pulls preview text from the first block that actually has some, across
// every text-bearing block type (not just plain paragraphs), so a note
// that opens with a heading, quote, or list still shows a useful preview.
function getSnippet(note) {
  for (const block of note.blocks || []) {
    if ((block.type === 'paragraph' || block.type === 'heading' || block.type === 'quote') && (block.text || '').trim()) {
      return block.text.replace(/\s+/g, ' ').trim();
    }
    if ((block.type === 'bulletList' || block.type === 'numberedList') && (block.items || []).length) {
      const firstItem = block.items.find((it) => (it.text || '').trim());
      if (firstItem) return firstItem.text.replace(/\s+/g, ' ').trim();
    }
  }
  return (note.content || '').replace(/\s+/g, ' ').trim();
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
  const isLocked = !!note.isLocked;
  const hasReminder = !isLocked && !!note.reminderAt;
  const fontScale = resolveFontScale(note.fontSize || DEFAULT_NOTE_FONT_SIZE);

  return (
    <AnimatedPressable
      index={index}
      onPress={onPress}
      onLongPress={onLongPress}
      style={[styles.card, { backgroundColor: tone.bg }]}
    >
      <PaperTexture color={tone.text} />

      {note.isFavorite && (
        <View style={[styles.tape, { backgroundColor: tone.tape }]} />
      )}

      <View style={styles.topRow}>
        <View style={styles.badgeGroup}>
          <Text style={styles.emoji}>{isLocked ? '\ud83d\udd12' : note.emoji || DEFAULT_NOTE_EMOJI}</Text>
          {hasReminder && (
            <View style={[styles.reminderBadge, { backgroundColor: tone.tape }]}>
              <Ionicons name="alarm" size={10} color="#fff" />
            </View>
          )}
        </View>
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

      <Text style={[styles.title, { color: tone.text, fontSize: 15 * fontScale }]} numberOfLines={1}>
        {isLocked ? t('noteLockedTitle') : note.title || t('untitledNote')}
      </Text>

      {isLocked ? (
        <Text style={[styles.snippet, { color: tone.text, fontSize: 13 * fontScale }]} numberOfLines={2}>
          {t('noteLockedSubtitle')}
        </Text>
      ) : (
        <>
          {!!snippet && (
            <Text style={[styles.snippet, { color: tone.text, fontSize: 13 * fontScale }]} numberOfLines={2}>
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
        </>
      )}

      <View style={styles.footerRow}>
        {isLocked ? (
          <Ionicons name="lock-closed" size={13} color={tone.text} style={{ opacity: 0.75 }} />
        ) : tag ? (
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
  badgeGroup: { position: 'relative' },
  reminderBadge: {
    position: 'absolute',
    bottom: -2,
    right: -4,
    width: 15,
    height: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
