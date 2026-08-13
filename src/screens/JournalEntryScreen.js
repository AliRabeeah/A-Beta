import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePreventScreenCapture } from 'expo-screen-capture';
import { useTheme } from '../theme/ThemeContext';
import { withAlpha } from '../theme/tokens';
import { useLanguage } from '../i18n/LanguageContext';
import { useJournal } from '../context/JournalContext';
import { toKey } from '../utils/dateUtils';
import { wordCount } from '../utils/journalUtils';
import { autoTextAlign } from '../utils/textDirection';
import { getRandomPromptKey } from '../constants/journalPrompts';

const AUTOSAVE_DELAY_MS = 600;

export default function JournalEntryScreen({ route, navigation }) {
  const { colors } = useTheme();
  const { t, language, isRTL } = useLanguage();
  const { entries, setEntryForDate, deleteEntryForDate } = useJournal();
  const insets = useSafeAreaInsets();
  const locale = language === 'ar' ? 'ar-EG' : 'en-US';

  const dateKey = route.params?.dateKey || toKey(new Date());
  const date = useMemo(() => new Date(dateKey + 'T00:00:00'), [dateKey]);
  const existing = entries[dateKey];
  const isToday = dateKey === toKey(new Date());

  const [content, setContent] = useState(existing?.content || '');
  const [promptKey, setPromptKey] = useState(existing?.promptUsed || null);
  const [promptDismissed, setPromptDismissed] = useState(!!existing?.content);

  const saveTimer = useRef(null);
  const skipNextAutosave = useRef(true);

  // Sensitive content -- same protection locked notes get.
  usePreventScreenCapture('journal-entry-screen');

  useEffect(() => {
    // Offer a prompt only for a brand-new, empty entry.
    if (!existing && !promptKey) setPromptKey(getRandomPromptKey());
  }, []);

  useEffect(() => {
    if (skipNextAutosave.current) {
      skipNextAutosave.current = false;
      return;
    }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      if (content.trim()) setEntryForDate(content, promptDismissed ? null : promptKey, date);
    }, AUTOSAVE_DELAY_MS);
    return () => clearTimeout(saveTimer.current);
  }, [content]);

  const shufflePrompt = () => {
    Haptics.selectionAsync();
    setPromptKey((prev) => getRandomPromptKey(prev));
  };

  const dismissPrompt = () => {
    setPromptDismissed(true);
  };

  const handleManualSave = () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (content.trim()) setEntryForDate(content, promptDismissed ? null : promptKey, date);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    navigation.goBack();
  };

  const handleDelete = () => {
    Alert.alert(t('deleteJournalEntryTitle'), t('deleteJournalEntryBody'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('delete'), style: 'destructive', onPress: async () => { await deleteEntryForDate(date); navigation.goBack(); } },
    ]);
  };

  const dateLabel = date.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const showPrompt = !!promptKey && !promptDismissed && !content.trim();

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, { paddingTop: insets.top + 4 }, isRTL && { flexDirection: 'row-reverse' }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name={isRTL ? 'chevron-forward' : 'chevron-back'} size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerLabel, { color: colors.textSecondary }]}>{isToday ? t('journalTitle') : dateLabel}</Text>
        {!!existing && (
          <TouchableOpacity onPress={handleDelete} hitSlop={8}>
            <Ionicons name="trash-outline" size={20} color={colors.danger} />
          </TouchableOpacity>
        )}
        {!existing && <View style={{ width: 20 }} />}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Text style={[styles.dateTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>{dateLabel}</Text>

        {showPrompt && (
          <View style={[styles.promptCard, { backgroundColor: withAlpha(colors.primary, 0.1), borderColor: withAlpha(colors.primary, 0.25) }, isRTL && { flexDirection: 'row-reverse' }]}>
            <Ionicons name="bulb-outline" size={16} color={colors.primary} style={{ marginTop: 1 }} />
            <Text style={[styles.promptText, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>{t(promptKey)}</Text>
            <View style={{ gap: 10, alignItems: 'center' }}>
              <TouchableOpacity onPress={shufflePrompt} hitSlop={8}>
                <Ionicons name="shuffle" size={16} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={dismissPrompt} hitSlop={8}>
                <Ionicons name="close" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        <TextInput
          value={content}
          onChangeText={setContent}
          placeholder={t('journalEntryPlaceholder')}
          placeholderTextColor={colors.textSecondary}
          multiline
          autoFocus={!existing}
          style={[styles.bodyInput, { color: colors.text, textAlign: autoTextAlign(content, isRTL) }]}
        />

        <Text style={[styles.wordCount, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
          {t('journalWordCount', wordCount(content))}
        </Text>
      </ScrollView>

      <View style={[styles.footer, { borderColor: colors.border, paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity onPress={handleManualSave} style={[styles.saveBtn, { backgroundColor: colors.primary }]}>
          <Text style={{ color: colors.onPrimary, fontWeight: '700', fontSize: 15 }}>{t('save')}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 10 },
  headerLabel: { fontSize: 13, fontWeight: '700' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 20 },
  dateTitle: { fontSize: 20, fontWeight: '800', marginBottom: 16 },
  promptCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 16 },
  promptText: { flex: 1, fontSize: 13, fontWeight: '600', lineHeight: 19 },
  bodyInput: { fontSize: 16, lineHeight: 24, minHeight: 300, textAlignVertical: 'top', padding: 0 },
  wordCount: { fontSize: 11, opacity: 0.55, marginTop: 12 },
  footer: { borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 20, paddingTop: 12 },
  saveBtn: { borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
});
