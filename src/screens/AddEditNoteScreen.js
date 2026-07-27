import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { useNotes } from '../context/NoteContext';
import { ensurePermission } from '../utils/notifications';
import { DEFAULT_NOTE_EMOJI, resolveNoteColor } from '../constants/noteOptions';

import EmojiPickerSheet from '../components/notes/EmojiPickerSheet';
import NoteColorPickerRow from '../components/notes/NoteColorPickerRow';
import NoteTagPickerRow from '../components/notes/NoteTagPickerRow';
import NoteReminderModal from '../components/notes/NoteReminderModal';

const AUTOSAVE_DELAY_MS = 500;
let blockIdSeed = 0;
const makeBlockId = () => `blk_${Date.now()}_${blockIdSeed++}`;

function normalizeBlocks(rawBlocks) {
  const source = rawBlocks && rawBlocks.length ? rawBlocks : [{ type: 'paragraph', text: '' }];
  return source.map((b) => ({
    ...b,
    id: b.id || makeBlockId(),
    ...(b.type === 'checklist' ? { groupId: b.groupId || 'main' } : {}),
  }));
}

export default function AddEditNoteScreen({ route, navigation }) {
  const { colors, mode } = useTheme();
  const { t } = useLanguage();
  const isDark = mode === 'dark';
  const {
    notes,
    addNote,
    updateNote,
    deleteNote,
    toggleNoteFavorite,
    addChecklistItem,
    removeChecklistItem,
    toggleChecklistItem,
  } = useNotes();
  const insets = useSafeAreaInsets();

  const routeNoteId = route.params?.noteId;
  const existing = useMemo(() => notes.find((n) => n.id === routeNoteId), [notes, routeNoteId]);

  // A brand-new note is created as a draft immediately and autosaves as you
  // type. If it's abandoned completely empty, it's cleaned up on the way out.
  const [draftId, setDraftId] = useState(routeNoteId || null);
  const note = useMemo(() => notes.find((n) => n.id === draftId), [notes, draftId]);

  const [title, setTitle] = useState(existing?.title || '');
  const [blocks, setBlocks] = useState(() => normalizeBlocks(existing?.blocks));
  const [openGroups, setOpenGroups] = useState({});
  const [drafts, setDrafts] = useState({});
  const [showOptions, setShowOptions] = useState(false);
  const [emojiPickerVisible, setEmojiPickerVisible] = useState(false);
  const [reminderModalVisible, setReminderModalVisible] = useState(false);

  const saveTimer = useRef(null);
  const hasCreatedDraft = useRef(!!routeNoteId);
  const skipNextAutosave = useRef(!!existing);

  const tone = resolveNoteColor(note?.color, isDark);
  const overlaySoft = 'rgba(255,255,255,0.16)';
  const overlayPanel = 'rgba(255,255,255,0.10)';

  // Create the draft note on first mount if this is a brand-new note.
  useEffect(() => {
    if (!hasCreatedDraft.current) {
      hasCreatedDraft.current = true;
      (async () => {
        const created = await addNote({ title: '', content: '', blocks: [{ type: 'paragraph', text: '' }] });
        setDraftId(created.id);
      })();
    }
  }, []);

  // Debounced autosave whenever title or blocks change.
  useEffect(() => {
    if (!draftId) return;
    if (skipNextAutosave.current) {
      skipNextAutosave.current = false;
      return;
    }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const plainText = blocks.filter((b) => b.type === 'paragraph').map((b) => b.text).join('\n');
      updateNote(draftId, { title, blocks, content: plainText });
    }, AUTOSAVE_DELAY_MS);
    return () => clearTimeout(saveTimer.current);
  }, [title, blocks, draftId]);

  // Clean up an abandoned, still-empty draft note when leaving the screen.
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', () => {
      if (!draftId) return;
      const isEmpty =
        !title.trim() &&
        blocks.every((b) => b.type !== 'paragraph' || !(b.text || '').trim()) &&
        !(note?.checklistItems || []).length &&
        !note?.emoji &&
        !note?.color &&
        !note?.tag &&
        !note?.reminderAt;
      if (isEmpty && !existing) deleteNote(draftId);
    });
    return unsubscribe;
  }, [navigation, draftId, title, blocks, note, existing]);

  // Typing "#" at the end of a paragraph splits it into: the text typed so
  // far, a new isolated checklist block right there, then a fresh empty
  // paragraph so writing can continue normally below the list.
  const updateParagraphText = useCallback((blockId, value) => {
    if (value.endsWith('#')) {
      const stripped = value.slice(0, -1);
      const groupId = `group-${Date.now()}`;
      setBlocks((prev) => {
        const idx = prev.findIndex((b) => b.id === blockId);
        const next = prev.map((b) => (b.id === blockId ? { ...b, text: stripped } : b));
        next.splice(idx + 1, 0, { id: makeBlockId(), type: 'checklist', groupId }, { id: makeBlockId(), type: 'paragraph', text: '' });
        return next;
      });
      setOpenGroups((prev) => ({ ...prev, [groupId]: true }));
    } else {
      setBlocks((prev) => prev.map((b) => (b.id === blockId ? { ...b, text: value } : b)));
    }
  }, []);

  const commitChecklistDraft = useCallback(
    (groupId) => {
      const text = (drafts[groupId] || '').trim();
      if (!text || !draftId) return;
      addChecklistItem(draftId, text, groupId);
      setDrafts((prev) => ({ ...prev, [groupId]: '' }));
    },
    [drafts, draftId, addChecklistItem]
  );

  const closeChecklistInput = useCallback(
    (groupId) => {
      const hasItems = (note?.checklistItems || []).some((it) => (it.groupId || 'main') === groupId);
      if (!hasItems) {
        setBlocks((prev) => prev.filter((b) => !(b.type === 'checklist' && b.groupId === groupId)));
      }
      setOpenGroups((prev) => ({ ...prev, [groupId]: false }));
    },
    [note]
  );

  const reopenChecklistInput = (groupId) => setOpenGroups((prev) => ({ ...prev, [groupId]: true }));

  const handleSelectEmoji = (emoji) => { if (draftId) { Haptics.selectionAsync(); updateNote(draftId, { emoji }); } };
  const handleSelectColor = (color) => { if (draftId) updateNote(draftId, { color }); };
  const handleSelectTag = (tag) => { if (draftId) { Haptics.selectionAsync(); updateNote(draftId, { tag }); } };

  const handleSaveReminder = async (date) => {
    if (date.getTime() <= Date.now()) { Alert.alert(t('reminderButtonLabel'), t('reminderPast')); return; }
    const granted = await ensurePermission();
    if (!granted) { Alert.alert(t('reminderButtonLabel'), t('reminderPermissionDenied')); return; }
    if (draftId) await updateNote(draftId, { reminderAt: date.toISOString() });
    setReminderModalVisible(false);
  };
  const handleRemoveReminder = () => { if (draftId) updateNote(draftId, { reminderAt: null }); setReminderModalVisible(false); };

  const handleDelete = () => {
    if (!draftId) return;
    Alert.alert(t('deleteNoteTitle'), t('deleteNoteMessage', title || t('untitledNote')), [
      { text: t('cancel') || 'Cancel', style: 'cancel' },
      { text: t('delete') || 'Delete', style: 'destructive', onPress: () => { deleteNote(draftId); navigation.goBack(); } },
    ]);
  };

  const handleManualSave = () => {
    if (!draftId) return;
    const plainText = blocks.filter((b) => b.type === 'paragraph').map((b) => b.text).join('\n');
    if (saveTimer.current) clearTimeout(saveTimer.current);
    updateNote(draftId, { title, blocks, content: plainText });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    navigation.goBack();
  };

  const iconBtnStyle = [styles.iconBtn, { backgroundColor: overlaySoft }];

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: tone.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={iconBtnStyle} hitSlop={8}>
          <Ionicons name="chevron-back" size={20} color={tone.text} />
        </TouchableOpacity>
        <Text style={[styles.headerLabel, { color: tone.text }]}>{existing ? t('untitledNote') : t('newNote')}</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={() => draftId && toggleNoteFavorite(draftId)}
            style={[styles.iconBtn, { backgroundColor: note?.isFavorite ? tone.tape : overlaySoft }]}
            hitSlop={8}
          >
            <Ionicons name={note?.isFavorite ? 'pin' : 'pin-outline'} size={17} color={note?.isFavorite ? '#fff' : tone.text} />
          </TouchableOpacity>
          {!!existing && (
            <TouchableOpacity onPress={handleDelete} style={iconBtnStyle} hitSlop={8}>
              <Ionicons name="trash-outline" size={17} color={colors.danger} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Color + tag options — collapsed behind a button, editable anytime — and a compact save action on the opposite side */}
        <View style={styles.topActionsRow}>
          <TouchableOpacity onPress={() => setShowOptions((s) => !s)} style={[styles.optionsToggle, { backgroundColor: overlaySoft }]}>
            <Ionicons name="color-palette-outline" size={14} color={tone.text} />
            <Text style={[styles.optionsToggleText, { color: tone.text }]}>{t('noteCustomizeLabel')}</Text>
            <Ionicons name={showOptions ? 'chevron-up' : 'chevron-down'} size={14} color={tone.text} />
          </TouchableOpacity>

          <TouchableOpacity onPress={handleManualSave} style={[styles.saveBtn, { backgroundColor: colors.primary }]} activeOpacity={0.85}>
            <Ionicons name="checkmark" size={14} color={colors.onPrimary} />
            <Text style={[styles.saveBtnText, { color: colors.onPrimary }]}>{t('save')}</Text>
          </TouchableOpacity>
        </View>

        {showOptions && (
          <View style={[styles.optionsPanel, { backgroundColor: overlayPanel }]}>
            <Text style={[styles.optionsLabel, { color: tone.text }]}>{t('cardColorLabel')}</Text>
            <NoteColorPickerRow value={note?.color || null} onChange={handleSelectColor} />

            <Text style={[styles.optionsLabel, { color: tone.text }]}>{t('tagLabel')}</Text>
            <NoteTagPickerRow value={note?.tag || null} onChange={handleSelectTag} />

            <TouchableOpacity onPress={() => setReminderModalVisible(true)} style={styles.reminderBtn}>
              <Ionicons name="notifications-outline" size={14} color={tone.text} />
              <Text style={[styles.reminderBtnText, { color: tone.text }]}>
                {note?.reminderAt ? `${t('reminderSetLabel')}: ${new Date(note.reminderAt).toLocaleString()}` : t('reminderButtonLabel')}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Emoji + title */}
        <View style={styles.titleRow}>
          <TouchableOpacity onPress={() => setEmojiPickerVisible(true)} style={[styles.emojiBtn, { backgroundColor: overlaySoft }]}>
            <Text style={styles.emojiBtnText}>{note?.emoji || DEFAULT_NOTE_EMOJI}</Text>
          </TouchableOpacity>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder={t('titlePlaceholder')}
            placeholderTextColor={tone.text + '99'}
            style={[styles.titleInput, { color: tone.text }]}
            multiline
          />
        </View>

        {/* Full-screen writing canvas: paragraphs + isolated checklist blocks */}
        <View style={styles.body}>
          {blocks.map((block, idx) =>
            block.type === 'paragraph' ? (
              <TextInput
                key={block.id}
                value={block.text}
                onChangeText={(v) => updateParagraphText(block.id, v)}
                placeholder={idx === 0 ? t('noteBodyPlaceholder') : ''}
                placeholderTextColor={tone.text + '99'}
                style={[styles.bodyInput, { color: tone.text }]}
                multiline
              />
            ) : (
              <View key={block.id} style={[styles.checklistBlock, { backgroundColor: overlayPanel }]}>
                {(note?.checklistItems || [])
                  .filter((it) => (it.groupId || 'main') === block.groupId)
                  .map((item) => (
                    <View key={item.id} style={styles.checklistRow}>
                      <TouchableOpacity onPress={() => draftId && toggleChecklistItem(draftId, item.id)} hitSlop={6}>
                        <Ionicons
                          name={item.isChecked ? 'checkbox' : 'square-outline'}
                          size={18}
                          color={tone.text}
                        />
                      </TouchableOpacity>
                      <Text
                        style={[
                          styles.checklistItemText,
                          { color: tone.text, opacity: item.isChecked ? 0.55 : 0.92, textDecorationLine: item.isChecked ? 'line-through' : 'none' },
                        ]}
                      >
                        {item.text}
                      </Text>
                      <TouchableOpacity onPress={() => draftId && removeChecklistItem(draftId, item.id)} hitSlop={6}>
                        <Ionicons name="close" size={15} color={tone.text} style={{ opacity: 0.7 }} />
                      </TouchableOpacity>
                    </View>
                  ))}

                {openGroups[block.groupId] ? (
                  <View style={styles.checklistInputRow}>
                    <Ionicons name="square-outline" size={18} color={tone.text} style={{ opacity: 0.5 }} />
                    <TextInput
                      autoFocus
                      value={drafts[block.groupId] || ''}
                      onChangeText={(v) => setDrafts((prev) => ({ ...prev, [block.groupId]: v }))}
                      onSubmitEditing={() => commitChecklistDraft(block.groupId)}
                      onKeyPress={({ nativeEvent }) => {
                        if (nativeEvent.key === 'Backspace' && !(drafts[block.groupId] || '')) closeChecklistInput(block.groupId);
                      }}
                      blurOnSubmit={false}
                      returnKeyType="next"
                      placeholder={t('noteChecklistInputPlaceholder')}
                      placeholderTextColor={tone.text + '99'}
                      style={[styles.checklistInput, { color: tone.text, borderColor: tone.tape }]}
                    />
                    <TouchableOpacity onPress={() => commitChecklistDraft(block.groupId)} style={[styles.smallAddBtn, { backgroundColor: overlaySoft }]}>
                      <Ionicons name="add" size={14} color={tone.text} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => closeChecklistInput(block.groupId)} hitSlop={6}>
                      <Ionicons name="close" size={16} color={tone.text} style={{ opacity: 0.6 }} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity onPress={() => reopenChecklistInput(block.groupId)} style={styles.reopenBtn}>
                    <Ionicons name="add" size={13} color={tone.text} />
                    <Text style={[styles.reopenBtnText, { color: tone.text }]}>{t('addChecklistItemPlaceholder')}</Text>
                  </TouchableOpacity>
                )}
              </View>
            )
          )}
        </View>
      </ScrollView>

      <EmojiPickerSheet
        visible={emojiPickerVisible}
        selected={note?.emoji}
        onClose={() => setEmojiPickerVisible(false)}
        onSelect={handleSelectEmoji}
      />

      <NoteReminderModal
        visible={reminderModalVisible}
        initialDate={note?.reminderAt ? new Date(note.reminderAt) : null}
        hasReminder={!!note?.reminderAt}
        onClose={() => setReminderModalVisible(false)}
        onSave={handleSaveReminder}
        onRemove={handleRemoveReminder}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  headerLabel: { fontSize: 13, fontWeight: '700', opacity: 0.7 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 40 },
  topActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  optionsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 14,
  },
  optionsToggleText: { fontSize: 12, fontWeight: '700' },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 14,
  },
  saveBtnText: { fontSize: 12, fontWeight: '700' },
  optionsPanel: { borderRadius: 16, padding: 12, gap: 10, marginBottom: 14 },
  optionsLabel: { fontSize: 11, fontWeight: '700', opacity: 0.8 },
  reminderBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
  reminderBtnText: { fontSize: 12, fontWeight: '700' },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 6 },
  emojiBtn: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  emojiBtnText: { fontSize: 22 },
  titleInput: { fontSize: 22, fontWeight: '800', flex: 1, paddingTop: 8, padding: 0 },
  body: { marginTop: 4 },
  bodyInput: { fontSize: 15, lineHeight: 22, padding: 0, minHeight: 40, textAlignVertical: 'top' },
  checklistBlock: { borderRadius: 14, padding: 10, marginVertical: 10 },
  checklistRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  checklistItemText: { fontSize: 14, flex: 1 },
  checklistInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checklistInput: { flex: 1, fontSize: 14, borderBottomWidth: 1, paddingBottom: 4 },
  smallAddBtn: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  reopenBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  reopenBtnText: { fontSize: 12, fontWeight: '700', opacity: 0.85 },
});
