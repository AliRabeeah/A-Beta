import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Linking,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { preventScreenCaptureAsync, allowScreenCaptureAsync } from 'expo-screen-capture';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { useNotes } from '../context/NoteContext';
import { ensurePermission } from '../utils/notifications';
import {
  DEFAULT_NOTE_EMOJI,
  resolveNoteColor,
  FONT_SIZE_OPTIONS,
  DEFAULT_NOTE_FONT_SIZE,
  resolveFontScale,
  TITLE_FONT_OPTIONS,
  DEFAULT_TITLE_FONT,
  resolveTitleFontFamily,
} from '../constants/noteOptions';
import { extractLinks, normalizeUrlForOpen, countNoteText } from '../utils/noteTextUtils';
import { autoTextAlign } from '../utils/textDirection';

import EmojiPickerSheet from '../components/notes/EmojiPickerSheet';
import NoteColorPickerRow from '../components/notes/NoteColorPickerRow';
import NoteTagPickerRow from '../components/notes/NoteTagPickerRow';
import NoteReminderModal from '../components/notes/NoteReminderModal';
import NoteUnlockGate from '../components/notes/NoteUnlockGate';
import BlockFormatToolbar from '../components/notes/BlockFormatToolbar';
import EditableListBlock from '../components/notes/blocks/EditableListBlock';

const AUTOSAVE_DELAY_MS = 500;
const ALIGN_CYCLE = ['left', 'center', 'right'];
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
  const { t, isRTL } = useLanguage();
  const isDark = mode === 'dark';
  const {
    notes,
    addNote,
    updateNote,
    deleteNote,
    toggleNoteFavorite,
    toggleNoteLock,
    addChecklistItem,
    removeChecklistItem,
    toggleChecklistItem,
  } = useNotes();
  const insets = useSafeAreaInsets();

  const routeNoteId = route.params?.noteId;
  const existing = useMemo(() => notes.find((n) => n.id === routeNoteId), [notes, routeNoteId]);

  // If we're opening an existing note that's marked locked, nothing about
  // its content renders until authentication succeeds — see NoteUnlockGate
  // below. New notes and already-unlocked notes need no gate.
  const [unlocked, setUnlocked] = useState(!existing?.isLocked);

  // While viewing a locked note's content (even after unlocking it here),
  // block screenshots/recording and blank this screen out of Android's
  // "Recent Apps" thumbnail — the same protection the app-lock screen gets.
  // Only active for locked notes; every other screen behaves as before.
  useEffect(() => {
    if (existing?.isLocked) {
      preventScreenCaptureAsync('locked-note-editor');
      return () => { allowScreenCaptureAsync('locked-note-editor'); };
    }
    return undefined;
  }, [existing?.isLocked]);


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
  const [focusedBlockId, setFocusedBlockId] = useState(null);

  const saveTimer = useRef(null);
  const hasCreatedDraft = useRef(!!routeNoteId);
  const skipNextAutosave = useRef(!!existing);
  const listInputRefs = useRef({});

  const tone = resolveNoteColor(note?.color, isDark);
  const overlaySoft = 'rgba(255,255,255,0.16)';
  const overlayPanel = 'rgba(255,255,255,0.10)';

  const fontScale = resolveFontScale(note?.fontSize || DEFAULT_NOTE_FONT_SIZE);
  const titleFontFamily = resolveTitleFontFamily(note?.titleFont || DEFAULT_TITLE_FONT);
  const textAlign = isRTL ? 'right' : 'left';

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

  // Word/character count across every text-bearing block, for the small
  // footer counter under the writing canvas.
  const { words, characters } = useMemo(
    () => countNoteText(blocks, note?.checklistItems || []),
    [blocks, note?.checklistItems]
  );

  // Typing "#" at the end of a paragraph splits it into: the text typed so
  // far, a new isolated checklist block right there, then a fresh empty
  // paragraph so writing can continue normally below the list.
  //
  // A handful of other markdown-style shortcuts convert the CURRENT block
  // in place, but only fire when the block's entire text exactly matches
  // the trigger (e.g. "# ", "- ", "1. ", "> ", "---") — i.e. the very first
  // thing typed on an empty line — so they never misfire mid-sentence.
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
      return;
    }

    if (value === '---') {
      setBlocks((prev) => {
        const idx = prev.findIndex((b) => b.id === blockId);
        if (idx === -1) return prev;
        const next = [...prev];
        next[idx] = { id: blockId, type: 'divider' };
        next.splice(idx + 1, 0, { id: makeBlockId(), type: 'paragraph', text: '' });
        return next;
      });
      return;
    }

    if (/^# $/.test(value) || /^## $/.test(value)) {
      const level = /^## $/.test(value) ? 2 : 1;
      setBlocks((prev) => prev.map((b) => (b.id === blockId ? { id: b.id, type: 'heading', level, text: '' } : b)));
      return;
    }

    if (/^> $/.test(value)) {
      setBlocks((prev) => prev.map((b) => (b.id === blockId ? { id: b.id, type: 'quote', text: '' } : b)));
      return;
    }

    if (/^[-*] $/.test(value) || /^1\. $/.test(value)) {
      const listType = /^1\. $/.test(value) ? 'numberedList' : 'bulletList';
      setBlocks((prev) => prev.map((b) => (b.id === blockId ? { id: b.id, type: listType, items: [{ id: makeBlockId(), text: '' }] } : b)));
      return;
    }

    setBlocks((prev) => prev.map((b) => (b.id === blockId ? { ...b, text: value } : b)));
  }, []);

  // Toggles a formatting flag (bold/italic/underline/highlight) on a text
  // block. RN's TextInput can't mix styles within one run of text, so this
  // applies to the whole block — still enough to make a line stand out.
  const toggleBlockFormat = useCallback((blockId, key) => {
    setBlocks((prev) => prev.map((b) => (b.id === blockId ? { ...b, [key]: !b[key] } : b)));
  }, []);

  const cycleBlockAlign = useCallback(
    (blockId) => {
      setBlocks((prev) =>
        prev.map((b) => {
          if (b.id !== blockId) return b;
          const current = b.align || textAlign;
          const idx = ALIGN_CYCLE.indexOf(current);
          return { ...b, align: ALIGN_CYCLE[(idx + 1) % ALIGN_CYCLE.length] };
        })
      );
    },
    [textAlign]
  );

  // Removes a block outright (heading/quote/list/divider/paragraph). Always
  // leaves at least one empty paragraph behind so the canvas is never blank.
  const deleteBlock = useCallback((blockId) => {
    setBlocks((prev) => {
      const next = prev.filter((b) => b.id !== blockId);
      return next.length ? next : [{ id: makeBlockId(), type: 'paragraph', text: '' }];
    });
    setFocusedBlockId(null);
  }, []);

  const registerListInputRef = useCallback((itemId, ref) => {
    listInputRefs.current[itemId] = ref;
  }, []);

  const updateListItemText = useCallback((blockId, itemId, value) => {
    setBlocks((prev) =>
      prev.map((b) =>
        b.id === blockId
          ? { ...b, items: (b.items || []).map((it) => (it.id === itemId ? { ...it, text: value } : it)) }
          : b
      )
    );
  }, []);

  const addListItemAfter = useCallback((blockId, itemId) => {
    const newId = makeBlockId();
    setBlocks((prev) =>
      prev.map((b) => {
        if (b.id !== blockId) return b;
        const items = b.items || [];
        const idx = items.findIndex((it) => it.id === itemId);
        const next = [...items];
        next.splice(idx + 1, 0, { id: newId, text: '' });
        return { ...b, items: next };
      })
    );
    requestAnimationFrame(() => {
      const ref = listInputRefs.current[newId];
      if (ref && ref.focus) ref.focus();
    });
  }, []);

  // Backspace on an empty list line removes that line; backspace on the
  // last remaining (empty) line drops the block back to a plain paragraph,
  // matching how the checklist's own empty-input close behaves.
  const removeListItemOrExit = useCallback((blockId, itemId) => {
    setBlocks((prev) => {
      const blockIdx = prev.findIndex((b) => b.id === blockId);
      if (blockIdx === -1) return prev;
      const block = prev[blockIdx];
      const items = block.items || [];
      const itemIdx = items.findIndex((it) => it.id === itemId);
      if (items.length <= 1) {
        const next = [...prev];
        next[blockIdx] = { id: block.id, type: 'paragraph', text: '' };
        return next;
      }
      const nextItems = items.filter((it) => it.id !== itemId);
      const next = [...prev];
      next[blockIdx] = { ...block, items: nextItems };
      const focusId = items[Math.max(0, itemIdx - 1)]?.id;
      requestAnimationFrame(() => {
        const ref = focusId && listInputRefs.current[focusId];
        if (ref && ref.focus) ref.focus();
      });
      return next;
    });
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
  const handleSelectFontSize = (fontSize) => { if (draftId) updateNote(draftId, { fontSize }); };
  const handleSelectTitleFont = (titleFont) => { if (draftId) updateNote(draftId, { titleFont }); };

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

  const handleOpenLink = (link) => {
    Linking.openURL(normalizeUrlForOpen(link)).catch(() => {});
  };

  const iconBtnStyle = [styles.iconBtn, { backgroundColor: overlaySoft }];

  const renderLinkChips = (text) => {
    const links = extractLinks(text);
    if (!links.length) return null;
    return (
      <View style={[styles.linkChipsRow, isRTL && { flexDirection: 'row-reverse' }]}>
        {links.map((link) => (
          <TouchableOpacity
            key={link}
            onPress={() => handleOpenLink(link)}
            style={[styles.linkChip, { backgroundColor: overlaySoft }, isRTL && { flexDirection: 'row-reverse' }]}
          >
            <Ionicons name="link" size={11} color={tone.text} />
            <Text numberOfLines={1} style={[styles.linkChipText, { color: tone.text }]}>{link}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderToolbar = (block) => {
    if (focusedBlockId !== block.id) return null;
    return (
      <BlockFormatToolbar
        block={block}
        tint={tone.text}
        panelBg={overlayPanel}
        onToggleBold={() => toggleBlockFormat(block.id, 'bold')}
        onToggleItalic={() => toggleBlockFormat(block.id, 'italic')}
        onToggleUnderline={() => toggleBlockFormat(block.id, 'underline')}
        onToggleHighlight={() => toggleBlockFormat(block.id, 'highlight')}
        onCycleAlign={() => cycleBlockAlign(block.id)}
        onDelete={() => deleteBlock(block.id)}
      />
    );
  };

  // Enforcement point: an existing locked note renders NOTHING but the
  // gate until the person authenticates. Cancelling just navigates back —
  // it never reveals title/content, which only ever reach the JSX below.
  if (existing?.isLocked && !unlocked) {
    return (
      <NoteUnlockGate
        onUnlock={() => setUnlocked(true)}
        onCancel={() => navigation.goBack()}
      />
    );
  }

  // Content was restored from a backup made on a different device install
  // (see noteEncryption.js) — the on-device key needed to decrypt it isn't
  // here, so there's genuinely nothing to show instead of a blank editor.
  if (existing?.isLocked && existing?.decryptFailed) {
    return (
      <View style={[{ flex: 1 }, { backgroundColor: tone.bg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[iconBtnStyle, { position: 'absolute', left: 16, top: insets.top + 10 }]} hitSlop={8}>
          <Ionicons name="chevron-back" size={20} color={tone.text} />
        </TouchableOpacity>
        <Ionicons name="lock-closed" size={32} color={tone.text} style={{ opacity: 0.6, marginBottom: 12 }} />
        <Text style={{ color: tone.text, fontWeight: '800', fontSize: 17, marginBottom: 8, textAlign: 'center' }}>
          {t('noteDecryptFailedTitle')}
        </Text>
        <Text style={{ color: tone.text, opacity: 0.75, fontSize: 14, textAlign: 'center', lineHeight: 20 }}>
          {t('noteDecryptFailedBody')}
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: tone.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, { paddingTop: insets.top + 4 }, isRTL && { flexDirection: 'row-reverse' }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={iconBtnStyle} hitSlop={8}>
          <Ionicons name={isRTL ? 'chevron-forward' : 'chevron-back'} size={20} color={tone.text} />
        </TouchableOpacity>
        <Text style={[styles.headerLabel, { color: tone.text }]}>{existing ? t('untitledNote') : t('newNote')}</Text>
        <View style={[styles.headerRight, isRTL && { flexDirection: 'row-reverse' }]}>
          <TouchableOpacity
            onPress={() => draftId && toggleNoteLock(draftId)}
            style={[styles.iconBtn, { backgroundColor: note?.isLocked ? tone.tape : overlaySoft }]}
            hitSlop={8}
          >
            <Ionicons name={note?.isLocked ? 'lock-closed' : 'lock-open-outline'} size={17} color={note?.isLocked ? '#fff' : tone.text} />
          </TouchableOpacity>
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
        <View style={[styles.topActionsRow, isRTL && { flexDirection: 'row-reverse' }]}>
          <TouchableOpacity onPress={() => setShowOptions((s) => !s)} style={[styles.optionsToggle, { backgroundColor: overlaySoft }, isRTL && { flexDirection: 'row-reverse' }]}>
            <Ionicons name="color-palette-outline" size={14} color={tone.text} />
            <Text style={[styles.optionsToggleText, { color: tone.text }]}>{t('noteCustomizeLabel')}</Text>
            <Ionicons name={showOptions ? 'chevron-up' : 'chevron-down'} size={14} color={tone.text} />
          </TouchableOpacity>

          <TouchableOpacity onPress={handleManualSave} style={[styles.saveBtn, { backgroundColor: colors.primary }, isRTL && { flexDirection: 'row-reverse' }]} activeOpacity={0.85}>
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

            <Text style={[styles.optionsLabel, { color: tone.text }]}>{t('fontSizeLabel')}</Text>
            <View style={[styles.segmentRow, isRTL && { flexDirection: 'row-reverse' }]}>
              {FONT_SIZE_OPTIONS.map((opt) => {
                const active = (note?.fontSize || DEFAULT_NOTE_FONT_SIZE) === opt.id;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    onPress={() => handleSelectFontSize(opt.id)}
                    style={[styles.segmentBtn, { backgroundColor: active ? tone.tape : overlaySoft }]}
                  >
                    <Text style={[styles.segmentBtnText, { color: active ? '#fff' : tone.text }]}>{t(opt.labelKey)}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.optionsLabel, { color: tone.text }]}>{t('titleFontLabel')}</Text>
            <View style={[styles.segmentRow, isRTL && { flexDirection: 'row-reverse' }]}>
              {TITLE_FONT_OPTIONS.map((opt) => {
                const active = (note?.titleFont || DEFAULT_TITLE_FONT) === opt.id;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    onPress={() => handleSelectTitleFont(opt.id)}
                    style={[styles.segmentBtn, { backgroundColor: active ? tone.tape : overlaySoft }]}
                  >
                    <Text style={[styles.segmentBtnText, { color: active ? '#fff' : tone.text, fontFamily: opt.fontFamily }]}>{t(opt.labelKey)}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity onPress={() => setReminderModalVisible(true)} style={[styles.reminderBtn, isRTL && { flexDirection: 'row-reverse' }]}>
              <Ionicons name="notifications-outline" size={14} color={tone.text} />
              <Text style={[styles.reminderBtnText, { color: tone.text }]}>
                {note?.reminderAt ? `${t('reminderSetLabel')}: ${new Date(note.reminderAt).toLocaleString()}` : t('reminderButtonLabel')}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Emoji + title */}
        <View style={[styles.titleRow, isRTL && { flexDirection: 'row-reverse' }]}>
          <TouchableOpacity onPress={() => setEmojiPickerVisible(true)} style={[styles.emojiBtn, { backgroundColor: overlaySoft }]}>
            <Text style={styles.emojiBtnText}>{note?.emoji || DEFAULT_NOTE_EMOJI}</Text>
          </TouchableOpacity>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder={t('titlePlaceholder')}
            placeholderTextColor={tone.text + '99'}
            style={[styles.titleInput, { color: tone.text, fontSize: 22 * fontScale, fontFamily: titleFontFamily, textAlign: autoTextAlign(title, isRTL) }]}
            multiline
          />
        </View>

        {/* Full-screen writing canvas: paragraphs, headings, quotes, lists, dividers + isolated checklist blocks */}
        <View style={styles.body}>
          {blocks.map((block, idx) => {
            if (block.type === 'paragraph') {
              return (
                <View key={block.id}>
                  <TextInput
                    value={block.text}
                    onChangeText={(v) => updateParagraphText(block.id, v)}
                    onFocus={() => setFocusedBlockId(block.id)}
                    onBlur={() => setFocusedBlockId((cur) => (cur === block.id ? null : cur))}
                    placeholder={idx === 0 ? t('noteBodyPlaceholder') : ''}
                    placeholderTextColor={tone.text + '99'}
                    style={[
                      styles.bodyInput,
                      {
                        color: tone.text,
                        fontSize: 15 * fontScale,
                        lineHeight: 22 * fontScale,
                        fontWeight: block.bold ? '700' : '400',
                        fontStyle: block.italic ? 'italic' : 'normal',
                        textDecorationLine: block.underline ? 'underline' : 'none',
                        textAlign: block.align || autoTextAlign(block.text, isRTL),
                        backgroundColor: block.highlight ? tone.tape + '4d' : 'transparent',
                      },
                    ]}
                    multiline
                  />
                  {renderToolbar(block)}
                  {renderLinkChips(block.text)}
                </View>
              );
            }

            if (block.type === 'heading') {
              const headingSize = (block.level === 2 ? 18 : 22) * fontScale;
              return (
                <View key={block.id}>
                  <TextInput
                    value={block.text}
                    onChangeText={(v) => setBlocks((prev) => prev.map((b) => (b.id === block.id ? { ...b, text: v } : b)))}
                    onFocus={() => setFocusedBlockId(block.id)}
                    onBlur={() => setFocusedBlockId((cur) => (cur === block.id ? null : cur))}
                    placeholder={t('noteHeadingPlaceholder')}
                    placeholderTextColor={tone.text + '99'}
                    style={[
                      styles.headingInput,
                      {
                        color: tone.text,
                        fontSize: headingSize,
                        fontWeight: block.bold ? '900' : '800',
                        fontStyle: block.italic ? 'italic' : 'normal',
                        textDecorationLine: block.underline ? 'underline' : 'none',
                        textAlign: block.align || autoTextAlign(block.text, isRTL),
                        backgroundColor: block.highlight ? tone.tape + '4d' : 'transparent',
                      },
                    ]}
                    multiline
                  />
                  {renderToolbar(block)}
                </View>
              );
            }

            if (block.type === 'quote') {
              return (
                <View key={block.id}>
                  <View
                    style={[
                      styles.quoteWrap,
                      isRTL ? { borderRightWidth: 3, borderRightColor: tone.tape, paddingRight: 10 } : { borderLeftWidth: 3, borderLeftColor: tone.tape, paddingLeft: 10 },
                    ]}
                  >
                    <TextInput
                      value={block.text}
                      onChangeText={(v) => setBlocks((prev) => prev.map((b) => (b.id === block.id ? { ...b, text: v } : b)))}
                      onFocus={() => setFocusedBlockId(block.id)}
                      onBlur={() => setFocusedBlockId((cur) => (cur === block.id ? null : cur))}
                      placeholder={t('noteQuotePlaceholder')}
                      placeholderTextColor={tone.text + '99'}
                      style={[
                        styles.quoteInput,
                        {
                          color: tone.text,
                          fontSize: 15 * fontScale,
                          lineHeight: 21 * fontScale,
                          fontWeight: block.bold ? '700' : '400',
                          fontStyle: block.italic === false ? 'normal' : 'italic',
                          textDecorationLine: block.underline ? 'underline' : 'none',
                          textAlign: block.align || autoTextAlign(block.text, isRTL),
                          backgroundColor: block.highlight ? tone.tape + '4d' : 'transparent',
                        },
                      ]}
                      multiline
                    />
                  </View>
                  {renderToolbar(block)}
                  {renderLinkChips(block.text)}
                </View>
              );
            }

            if (block.type === 'bulletList' || block.type === 'numberedList') {
              return (
                <EditableListBlock
                  key={block.id}
                  block={block}
                  tint={tone.text}
                  fontScale={fontScale}
                  onChangeItemText={(itemId, v) => updateListItemText(block.id, itemId, v)}
                  onSubmitItem={(itemId) => addListItemAfter(block.id, itemId)}
                  onBackspaceEmptyItem={(itemId) => removeListItemOrExit(block.id, itemId)}
                  registerInputRef={registerListInputRef}
                />
              );
            }

            if (block.type === 'divider') {
              return (
                <View key={block.id} style={[styles.dividerRow, isRTL && { flexDirection: 'row-reverse' }]}>
                  <View style={[styles.dividerLine, { backgroundColor: tone.tape }]} />
                  <TouchableOpacity onPress={() => deleteBlock(block.id)} hitSlop={8} style={{ marginHorizontal: 8 }}>
                    <Ionicons name="close-circle-outline" size={16} color={tone.text} style={{ opacity: 0.55 }} />
                  </TouchableOpacity>
                </View>
              );
            }

            // Isolated checklist block
            return (
              <View key={block.id} style={[styles.checklistBlock, { backgroundColor: overlayPanel }]}>
                {(note?.checklistItems || [])
                  .filter((it) => (it.groupId || 'main') === block.groupId)
                  .map((item) => (
                    <View key={item.id} style={[styles.checklistRow, isRTL && { flexDirection: 'row-reverse' }]}>
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
                          {
                            color: tone.text,
                            fontSize: 14 * fontScale,
                            opacity: item.isChecked ? 0.55 : 0.92,
                            textDecorationLine: item.isChecked ? 'line-through' : 'none',
                            textAlign: autoTextAlign(item.text, isRTL),
                          },
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
                  <View style={[styles.checklistInputRow, isRTL && { flexDirection: 'row-reverse' }]}>
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
                      style={[styles.checklistInput, { color: tone.text, borderColor: tone.tape, textAlign: autoTextAlign(drafts[block.groupId], isRTL) }]}
                    />
                    <TouchableOpacity onPress={() => commitChecklistDraft(block.groupId)} style={[styles.smallAddBtn, { backgroundColor: overlaySoft }]}>
                      <Ionicons name="add" size={14} color={tone.text} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => closeChecklistInput(block.groupId)} hitSlop={6}>
                      <Ionicons name="close" size={16} color={tone.text} style={{ opacity: 0.6 }} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity onPress={() => reopenChecklistInput(block.groupId)} style={[styles.reopenBtn, isRTL && { flexDirection: 'row-reverse' }]}>
                    <Ionicons name="add" size={13} color={tone.text} />
                    <Text style={[styles.reopenBtnText, { color: tone.text }]}>{t('addChecklistItemPlaceholder')}</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>

        <Text style={[styles.wordCount, { color: tone.text, textAlign }]}>
          {t('noteWordCount', words, characters)}
        </Text>
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
  segmentRow: { flexDirection: 'row', gap: 8 },
  segmentBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999 },
  segmentBtnText: { fontSize: 12, fontWeight: '700' },
  reminderBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
  reminderBtnText: { fontSize: 12, fontWeight: '700' },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 6 },
  emojiBtn: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  emojiBtnText: { fontSize: 22 },
  titleInput: { fontWeight: '800', flex: 1, paddingTop: 8, padding: 0 },
  body: { marginTop: 4 },
  bodyInput: { padding: 0, minHeight: 40, textAlignVertical: 'top', borderRadius: 6 },
  headingInput: { padding: 4, marginTop: 4, marginBottom: 8, textAlignVertical: 'top', borderRadius: 6 },
  quoteWrap: { marginVertical: 8 },
  quoteInput: { padding: 0, textAlignVertical: 'top', opacity: 0.9, borderRadius: 6 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 14 },
  dividerLine: { flex: 1, height: 1.5, borderRadius: 1, opacity: 0.7 },
  linkChipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: -6, marginBottom: 10 },
  linkChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 999 },
  linkChipText: { fontSize: 11, maxWidth: 180 },
  checklistBlock: { borderRadius: 14, padding: 10, marginVertical: 10 },
  checklistRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  checklistItemText: { flex: 1 },
  checklistInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checklistInput: { flex: 1, fontSize: 14, borderBottomWidth: 1, paddingBottom: 4 },
  smallAddBtn: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  reopenBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  reopenBtnText: { fontSize: 12, fontWeight: '700', opacity: 0.85 },
  wordCount: { fontSize: 11, opacity: 0.55, marginTop: 16 },
});
