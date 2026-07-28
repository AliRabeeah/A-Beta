import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../theme/ThemeContext';
import { useTokens } from '../theme/tokens';
import { useLanguage } from '../i18n/LanguageContext';
import { useMood } from '../context/MoodContext';

const MOODS = [
  { level: 1, emoji: '😞' },
  { level: 2, emoji: '🙁' },
  { level: 3, emoji: '😐' },
  { level: 4, emoji: '🙂' },
  { level: 5, emoji: '😄' },
];

export default function MoodCard() {
  const { colors } = useTheme();
  const tokens = useTokens();
  const { t, language } = useLanguage();
  const { getMoodForDate, setMoodForDate } = useMood();
  const today = getMoodForDate(new Date());

  const [selected, setSelected] = useState(today?.mood || null);
  const [note, setNote] = useState(today?.note || '');
  const [showNoteInput, setShowNoteInput] = useState(false);

  useEffect(() => {
    setSelected(today?.mood || null);
    setNote(today?.note || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [today?.mood, today?.note]);

  const handleSelect = async (level) => {
    Haptics.selectionAsync();
    setSelected(level);
    await setMoodForDate(level, note);
    setShowNoteInput(true);
  };

  const handleNoteBlur = async () => {
    if (selected) await setMoodForDate(selected, note);
  };

  return (
    <View style={[styles.card, tokens.glass.card, { marginBottom: 12 }]}>
      <Text style={[styles.title, { color: colors.textSecondary }]}>{t('moodCardTitle')}</Text>
      <View style={styles.row}>
        {MOODS.map((m) => (
          <TouchableOpacity
            key={m.level}
            onPress={() => handleSelect(m.level)}
            style={[
              styles.emojiBtn,
              selected === m.level && { backgroundColor: colors.primary + '22', borderColor: colors.primary },
            ]}
          >
            <Text style={{ fontSize: 26 }}>{m.emoji}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {(showNoteInput || !!note) && selected && (
        <TextInput
          value={note}
          onChangeText={setNote}
          onBlur={handleNoteBlur}
          placeholder={t('moodNotePlaceholder')}
          placeholderTextColor={colors.textSecondary}
          style={[
            styles.noteInput,
            { color: colors.text, borderColor: colors.border, textAlign: language === 'ar' ? 'right' : 'left' },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, padding: 14, marginTop: 4 },
  title: { fontSize: 12, fontWeight: '700', marginBottom: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  emojiBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'transparent' },
  noteInput: { borderWidth: 1, borderRadius: 10, padding: 10, fontSize: 13, marginTop: 10 },
});
