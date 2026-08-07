import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, PanResponder, Animated, LayoutAnimation, Platform, UIManager } from 'react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Smooth expand/collapse used by every foldable section on this screen.
const animateLayout = () => LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
import * as Haptics from 'expo-haptics';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { QUOTE_CATEGORIES } from '../constants/quotes';
import { pickRandomQuote, emojiForQuoteId } from '../utils/quotePicker';
import {
  getQuoteNotifEnabled, setQuoteNotifEnabled,
  getQuoteNotifTimes, setQuoteNotifTimes,
  getQuoteCategories, setQuoteCategories,
  getQuoteEmojiEnabled, setQuoteEmojiEnabled,
  getWidgetTextColor, setWidgetTextColor,
  getWidgetFontFamily, setWidgetFontFamily,
  getWidgetSize, setWidgetSize,
  getWidgetAlign, setWidgetAlign,
  getShowAuthor, setShowAuthor,
  getLikedQuoteIds, toggleLikedQuoteId,
  getWidgetFitMode, setWidgetFitMode,
  getWidgetOffsets, setWidgetOffsets, resetWidgetOffsets,
  WIDGET_COLOR_OPTIONS, WIDGET_FONT_OPTIONS, WIDGET_FIT_OPTIONS,
  DEFAULT_WIDGET_OFFSETS, MAX_WIDGET_OFFSET_DP,
} from '../utils/quoteSettings';
import { ensurePermission, scheduleQuoteNotifications, cancelQuoteNotifications } from '../utils/notifications';
import { refreshQuoteWidget } from '../utils/widgetSync';

const SIZE_OPTIONS = ['small', 'medium', 'large'];
const ALIGN_OPTIONS = [
  { id: 'left', icon: 'menu-outline' },
  { id: 'center', icon: 'reorder-two-outline' },
  { id: 'right', icon: 'menu-outline' },
];

// "Magnet": while dragging, snap to perfectly centered (offset 0, i.e. equal
// margins on both sides) once within this many dp of it, with a haptic tick
// and a highlighted guide line so it's obvious you've hit true center.
const SNAP_THRESHOLD_DP = 6;

// Tappable header row for a foldable card section — matches the
// "customize bottom bar" pattern used on the Settings screen.
function CollapsibleHeader({ icon, title, isOpen, onToggle, colors }) {
  return (
    <TouchableOpacity onPress={onToggle} style={styles.row} activeOpacity={0.7}>
      <View style={styles.rowLeft}>
        <Ionicons name={icon} size={18} color={colors.textSecondary} style={{ marginRight: 10 }} />
        <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>{title}</Text>
      </View>
      <Ionicons name={isOpen ? 'chevron-down' : 'chevron-forward'} size={18} color={colors.textSecondary} />
    </TouchableOpacity>
  );
}

/**
 * A freely-draggable label used in the "element positions" calibration
 * canvas. Its resting position comes from normal flexbox flow (so it
 * starts centered, same as the real widget); dragging applies a visual
 * `transform: translate` computed manually (not Animated.event) so we can
 * inject "magnet" snap-to-center behavior, then reports the final,
 * clamped {x, y} (dp) back via onRelease so it can be persisted and sent
 * to the actual widget as marginLeft/marginTop.
 */
function DraggableTag({ label, offset, maxOffset, onRelease, textStyle, interactive = true, groupPan = null, onSnapChange, snapTargetX = 0 }) {
  const pan = useRef(new Animated.ValueXY({ x: offset.x, y: offset.y })).current;
  const currentRef = useRef({ x: offset.x, y: offset.y });
  const grantRef = useRef({ x: offset.x, y: offset.y });
  const wasSnappedRef = useRef(false);
  const snapTargetXRef = useRef(snapTargetX);
  useEffect(() => { snapTargetXRef.current = snapTargetX; }, [snapTargetX]);

  useEffect(() => {
    currentRef.current = { x: offset.x, y: offset.y };
    pan.setValue({ x: offset.x, y: offset.y });
    // Only re-sync when the stored offset itself changes externally (e.g. reset button).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offset.x, offset.y]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => interactive,
      onMoveShouldSetPanResponder: () => interactive,
      onPanResponderGrant: () => {
        grantRef.current = { ...currentRef.current };
        wasSnappedRef.current = false;
      },
      onPanResponderMove: (evt, gestureState) => {
        let x = grantRef.current.x + gestureState.dx;
        const y = grantRef.current.y + gestureState.dy;
        const snapTarget = snapTargetXRef.current;
        let snapped = false;
        if (Math.abs(x - snapTarget) <= SNAP_THRESHOLD_DP) {
          x = snapTarget; // magnet: locks into alignment with the snap target (screen center for the quote, or the quote's own x for author/emoji)
          snapped = true;
        }
        if (snapped && !wasSnappedRef.current) {
          Haptics.selectionAsync();
        }
        wasSnappedRef.current = snapped;
        currentRef.current = { x, y };
        pan.setValue({ x, y });
        onSnapChange && onSnapChange(snapped);
      },
      onPanResponderRelease: () => {
        const clampedX = Math.max(-maxOffset, Math.min(maxOffset, Math.round(currentRef.current.x)));
        const clampedY = Math.max(-maxOffset, Math.min(maxOffset, Math.round(currentRef.current.y)));
        currentRef.current = { x: clampedX, y: clampedY };
        pan.setValue({ x: clampedX, y: clampedY });
        onSnapChange && onSnapChange(false);
        onRelease({ x: clampedX, y: clampedY });
      },
    })
  ).current;

  // Linked/group mode: no own gesture handling, just display base offset
  // plus the shared live group-drag delta on top (applied by the parent's
  // single PanResponder covering the whole canvas).
  const transform = interactive
    ? pan.getTranslateTransform()
    : [{ translateX: offset.x }, { translateY: offset.y }, ...(groupPan ? groupPan.getTranslateTransform() : [])];

  return (
    <Animated.View {...(interactive ? panResponder.panHandlers : {})} style={{ transform }}>
      <Text style={textStyle}>{label}</Text>
    </Animated.View>
  );
}

export default function QuoteSettingsScreen() {
  const { colors } = useTheme();
  const { t, language } = useLanguage();

  const [notifEnabled, setNotifEnabledState] = useState(false);
  const [permissionOk, setPermissionOk] = useState(true);
  const [times, setTimesState] = useState(['09:00']);
  const [showPickerIndex, setShowPickerIndex] = useState(null); // number | 'new' | null
  const [categories, setCategoriesState] = useState([]); // [] = all
  const [emojiEnabled, setEmojiEnabledState] = useState(true);

  const [color, setColorState] = useState('#FFFFFF');
  const [fontFamily, setFontFamilyState] = useState('serif');
  const [size, setSizeState] = useState('medium');
  const [fit, setFitState] = useState('balanced');
  const [align, setAlignState] = useState('center');
  const [showAuthor, setShowAuthorState] = useState(true);
  const [offsets, setOffsetsState] = useState(DEFAULT_WIDGET_OFFSETS);
  const offsetsRef = useRef(offsets);
  useEffect(() => { offsetsRef.current = offsets; }, [offsets]);
  const [linkedMode, setLinkedMode] = useState(true);
  const linkedModeRef = useRef(linkedMode);
  useEffect(() => { linkedModeRef.current = linkedMode; }, [linkedMode]);
  const [snapActive, setSnapActive] = useState(false);

  // Linked-mode drag: one shared gesture region: dragging anywhere on the
  // canvas moves emoji + quote + author together, preserving their
  // individual positions relative to each other. Magnet: snaps when the
  // quote text (the main anchor) would land back at true center (x = 0).
  const groupPan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const groupLiveRef = useRef({ x: 0, y: 0 });
  const groupWasSnappedRef = useRef(false);
  const groupPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => linkedModeRef.current,
      onMoveShouldSetPanResponder: () => linkedModeRef.current,
      onPanResponderGrant: () => {
        groupLiveRef.current = { x: 0, y: 0 };
        groupWasSnappedRef.current = false;
        groupPan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: (evt, gestureState) => {
        let dx = gestureState.dx;
        const dy = gestureState.dy;
        const prospectiveQuoteX = offsetsRef.current.quote.x + dx;
        let snapped = false;
        if (Math.abs(prospectiveQuoteX) <= SNAP_THRESHOLD_DP) {
          dx = -offsetsRef.current.quote.x; // land the quote exactly at true center
          snapped = true;
        }
        if (snapped && !groupWasSnappedRef.current) {
          Haptics.selectionAsync();
        }
        groupWasSnappedRef.current = snapped;
        setSnapActive(snapped);
        groupLiveRef.current = { x: dx, y: dy };
        groupPan.setValue({ x: dx, y: dy });
      },
      onPanResponderRelease: () => {
        const delta = { x: Math.round(groupLiveRef.current.x), y: Math.round(groupLiveRef.current.y) };
        groupPan.setValue({ x: 0, y: 0 });
        setSnapActive(false);
        handleGroupOffsetChange(delta);
      },
    })
  ).current;

  const [previewQuote, setPreviewQuote] = useState(null);
  const [likedIds, setLikedIds] = useState([]);

  // Accordion: only one of the big foldable sections
  // ('categories' | 'widget' | 'position') is expanded at a time.
  const [openSection, setOpenSectionState] = useState(null);
  const setOpenSection = (id) => {
    animateLayout();
    setOpenSectionState((prev) => (prev === id ? null : id));
  };

  const loadPreview = useCallback(async () => {
    const q = await pickRandomQuote({ markShown: false });
    setPreviewQuote(q);
  }, []);

  useEffect(() => {
    getQuoteNotifEnabled().then(setNotifEnabledState);
    getQuoteNotifTimes().then(setTimesState);
    getQuoteCategories().then(setCategoriesState);
    getQuoteEmojiEnabled().then(setEmojiEnabledState);
    getWidgetTextColor().then(setColorState);
    getWidgetFontFamily().then(setFontFamilyState);
    getWidgetSize().then(setSizeState);
    getWidgetFitMode().then(setFitState);
    getWidgetAlign().then(setAlignState);
    getShowAuthor().then(setShowAuthorState);
    getWidgetOffsets().then(setOffsetsState);
    getLikedQuoteIds().then(setLikedIds);
    loadPreview();
  }, [loadPreview]);

  const handleToggleNotif = async () => {
    const next = !notifEnabled;
    if (next) {
      const granted = await ensurePermission();
      setPermissionOk(granted);
      if (!granted) return;
      await scheduleQuoteNotifications(times);
    } else {
      await cancelQuoteNotifications();
    }
    setNotifEnabledState(next);
    await setQuoteNotifEnabled(next);
  };

  const handleAddTime = () => setShowPickerIndex('new');

  const handleTimeChange = async (event, selected) => {
    setShowPickerIndex(null);
    if (!selected) return;
    const hh = String(selected.getHours()).padStart(2, '0');
    const mm = String(selected.getMinutes()).padStart(2, '0');
    const value = `${hh}:${mm}`;

    let next;
    if (showPickerIndex === 'new') {
      if (times.includes(value)) return;
      next = [...times, value].sort();
    } else {
      next = [...times];
      next[showPickerIndex] = value;
      next.sort();
    }
    setTimesState(next);
    await setQuoteNotifTimes(next);
    if (notifEnabled) await scheduleQuoteNotifications(next);
  };

  const handleRemoveTime = async (index) => {
    const next = times.filter((_, i) => i !== index);
    setTimesState(next);
    await setQuoteNotifTimes(next);
    if (notifEnabled) await scheduleQuoteNotifications(next);
  };

  const handleToggleCategory = async (id) => {
    const has = categories.includes(id);
    const next = has ? categories.filter((c) => c !== id) : [...categories, id];
    setCategoriesState(next);
    await setQuoteCategories(next);
  };

  const handleToggleEmoji = async () => {
    const next = !emojiEnabled;
    setEmojiEnabledState(next);
    await setQuoteEmojiEnabled(next);
    refreshQuoteWidget();
  };

  const handlePickColor = async (hex) => {
    setColorState(hex);
    await setWidgetTextColor(hex);
    refreshQuoteWidget();
  };

  const handlePickFont = async (id) => {
    setFontFamilyState(id);
    await setWidgetFontFamily(id);
    refreshQuoteWidget();
  };

  const handlePickSize = async (s) => {
    setSizeState(s);
    await setWidgetSize(s);
    refreshQuoteWidget();
  };

  const handlePickFit = async (f) => {
    setFitState(f);
    await setWidgetFitMode(f);
    refreshQuoteWidget();
  };

  const handleOffsetChange = async (elementKey, next) => {
    setOffsetsState((prev) => {
      const updated = { ...prev, [elementKey]: next };
      setWidgetOffsets(updated).then(refreshQuoteWidget);
      return updated;
    });
  };

  /** Linked-mode: dragging anywhere moves emoji + quote + author together by the same delta, each clamped independently. */
  const handleGroupOffsetChange = async (delta) => {
    setOffsetsState((prev) => {
      const clamp = (v) => Math.max(-MAX_WIDGET_OFFSET_DP, Math.min(MAX_WIDGET_OFFSET_DP, v));
      const shift = (o) => ({ x: clamp(o.x + delta.x), y: clamp(o.y + delta.y) });
      const updated = { emoji: shift(prev.emoji), quote: shift(prev.quote), author: shift(prev.author) };
      setWidgetOffsets(updated).then(refreshQuoteWidget);
      return updated;
    });
  };

  const handleResetOffsets = async () => {
    await resetWidgetOffsets();
    setOffsetsState(DEFAULT_WIDGET_OFFSETS);
    refreshQuoteWidget();
  };

  const handlePickAlign = async (a) => {
    setAlignState(a);
    await setWidgetAlign(a);
    refreshQuoteWidget();
  };

  const handleToggleShowAuthor = async () => {
    const next = !showAuthor;
    setShowAuthorState(next);
    await setShowAuthor(next);
    refreshQuoteWidget();
  };

  const handleShuffle = () => loadPreview();

  const handleLikePreview = async () => {
    if (!previewQuote) return;
    const nowLiked = await toggleLikedQuoteId(previewQuote.id);
    setLikedIds((prev) => (nowLiked ? [previewQuote.id, ...prev] : prev.filter((x) => x !== previewQuote.id)));
  };

  const sizeLabel = { small: t('quoteSizeSmall'), medium: t('quoteSizeMedium'), large: t('quoteSizeLarge') };
  const fitLabel = { roomy: t('quoteFitRoomy'), balanced: t('quoteFitBalanced'), snug: t('quoteFitSnug'), tightest: t('quoteFitTightest') };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={{ paddingTop: 16, paddingBottom: 40 }}>
      {/* Live preview, styled exactly like the widget will look */}
      <View style={[styles.previewCard, { backgroundColor: '#111318', borderColor: colors.border }]}>
        {emojiEnabled && previewQuote && (
          <Text style={{ fontSize: 20, marginBottom: 6 }}>{emojiForQuoteId(previewQuote.id)}</Text>
        )}
        <Text
          style={{
            color, fontSize: size === 'small' ? 15 : size === 'large' ? 22 : 18,
            fontWeight: '700', fontFamily, textAlign: align,
          }}
        >
          "{previewQuote?.text || ''}"
        </Text>
        {showAuthor && previewQuote?.author ? (
          <Text style={{ color, fontSize: 12, fontFamily, marginTop: 8, textAlign: align }}>— {previewQuote.author}</Text>
        ) : null}
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
          <TouchableOpacity onPress={handleShuffle} style={[styles.pill, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
            <Text style={{ color: colors.text, fontSize: 13, fontWeight: '600' }}>🔀 {t('quoteShuffle')}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLikePreview} style={[styles.pill, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
            <Text style={{ fontSize: 13, fontWeight: '600' }}>
              {previewQuote && likedIds.includes(previewQuote.id) ? '❤️' : '🤍'} {t('quoteLike')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Notifications */}
      <Text style={[styles.section, { color: colors.textSecondary }]}>{t('quoteNotifSection')}</Text>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <TouchableOpacity onPress={handleToggleNotif} style={styles.row}>
          <Text style={{ color: colors.text, fontSize: 15 }}>{t('quoteNotifEnable')}</Text>
          <Ionicons name={notifEnabled ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={notifEnabled ? colors.primary : colors.textSecondary} />
        </TouchableOpacity>

        {notifEnabled && (
          <View style={{ padding: 14, paddingTop: 0 }}>
            <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 10 }}>{t('quoteNotifTimesHint')}</Text>
            {times.map((time, i) => (
              <View key={time} style={styles.timeRow}>
                <TouchableOpacity onPress={() => setShowPickerIndex(i)} style={[styles.pill, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, flex: 1, alignItems: 'center' }]}>
                  <Text style={{ color: colors.text, fontWeight: '700', fontSize: 14 }}>{time}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleRemoveTime(i)} style={{ marginLeft: 10, padding: 6 }}>
                  <Ionicons name="trash-outline" size={18} color="#FF6B6B" />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity onPress={handleAddTime} style={[styles.pill, { alignSelf: 'flex-start', backgroundColor: colors.primary, borderColor: colors.primary, marginTop: 4 }]}>
              <Text style={{ color: colors.onPrimary, fontWeight: '700', fontSize: 13 }}>+ {t('quoteAddTime')}</Text>
            </TouchableOpacity>

            {showPickerIndex !== null && (
              <DateTimePicker
                value={(() => {
                  const base = new Date();
                  if (showPickerIndex !== 'new' && times[showPickerIndex]) {
                    const [h, m] = times[showPickerIndex].split(':').map(Number);
                    base.setHours(h, m, 0, 0);
                  }
                  return base;
                })()}
                mode="time"
                display="default"
                onChange={handleTimeChange}
              />
            )}
          </View>
        )}
      </View>

      {/* Categories */}
      <Text style={[styles.section, { color: colors.textSecondary }]}>{t('quoteCategoriesSection')}</Text>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <CollapsibleHeader
          icon="pricetags-outline"
          title={t('quoteCategoriesHint')}
          isOpen={openSection === 'categories'}
          onToggle={() => setOpenSection('categories')}
          colors={colors}
        />
        {openSection === 'categories' && (
          <View style={{ padding: 14, paddingTop: 0 }}>
            <View style={[styles.divider, { backgroundColor: colors.border, marginBottom: 14 }]} />
            <View style={styles.chipRow}>
              {QUOTE_CATEGORIES.map((c) => {
                const active = categories.length === 0 || categories.includes(c.id);
                return (
                  <TouchableOpacity
                    key={c.id}
                    onPress={() => handleToggleCategory(c.id)}
                    style={[styles.pill, { backgroundColor: active ? colors.primary : colors.surfaceElevated, borderColor: colors.border }]}
                  >
                    <Text style={{ color: active ? colors.onPrimary : colors.text, fontWeight: '600', fontSize: 13 }}>
                      {c.label[language] || c.label.en}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}
      </View>

      {/* Emoji toggle */}
      <Text style={[styles.section, { color: colors.textSecondary }]}>{t('quoteEmojiSection')}</Text>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <TouchableOpacity onPress={handleToggleEmoji} style={styles.row}>
          <Text style={{ color: colors.text, fontSize: 15 }}>{t('quoteEmojiToggle')}</Text>
          <Ionicons name={emojiEnabled ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={emojiEnabled ? colors.primary : colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Widget appearance */}
      <Text style={[styles.section, { color: colors.textSecondary }]}>{t('quoteWidgetSection')}</Text>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <CollapsibleHeader
          icon="color-palette-outline"
          title={t('quoteWidgetSection')}
          isOpen={openSection === 'widget'}
          onToggle={() => setOpenSection('widget')}
          colors={colors}
        />
        {openSection === 'widget' && (
      <View style={{ padding: 14, paddingTop: 0 }}>
        <View style={[styles.divider, { backgroundColor: colors.border, marginBottom: 14 }]} />
        <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 10 }}>{t('quoteColorHint')}</Text>
        <View style={styles.chipRow}>
          {WIDGET_COLOR_OPTIONS.map((hex) => (
            <TouchableOpacity
              key={hex}
              onPress={() => handlePickColor(hex)}
              style={[styles.swatch, { backgroundColor: hex, borderWidth: color === hex ? 3 : 1, borderColor: color === hex ? colors.text : colors.border }]}
            />
          ))}
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border, marginVertical: 14 }]} />

        <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 10 }}>{t('quoteFontHint')}</Text>
        <View style={styles.chipRow}>
          {WIDGET_FONT_OPTIONS.map((f) => (
            <TouchableOpacity
              key={f.id}
              onPress={() => handlePickFont(f.id)}
              style={[styles.pill, { backgroundColor: fontFamily === f.id ? colors.primary : colors.surfaceElevated, borderColor: colors.border }]}
            >
              <Text style={{ color: fontFamily === f.id ? colors.onPrimary : colors.text, fontSize: 13, fontWeight: '600' }}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border, marginVertical: 14 }]} />

        <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 10 }}>{t('quoteSizeHint')}</Text>
        <View style={styles.chipRow}>
          {SIZE_OPTIONS.map((s) => (
            <TouchableOpacity
              key={s}
              onPress={() => handlePickSize(s)}
              style={[styles.pill, { backgroundColor: size === s ? colors.primary : colors.surfaceElevated, borderColor: colors.border }]}
            >
              <Text style={{ color: size === s ? colors.onPrimary : colors.text, fontSize: 13, fontWeight: '600' }}>{sizeLabel[s]}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border, marginVertical: 14 }]} />

        <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 10 }}>{t('quoteFitHint')}</Text>
        <View style={styles.chipRow}>
          {WIDGET_FIT_OPTIONS.map((f) => (
            <TouchableOpacity
              key={f.id}
              onPress={() => handlePickFit(f.id)}
              style={[styles.pill, { backgroundColor: fit === f.id ? colors.primary : colors.surfaceElevated, borderColor: colors.border }]}
            >
              <Text style={{ color: fit === f.id ? colors.onPrimary : colors.text, fontSize: 13, fontWeight: '600' }}>{fitLabel[f.id]}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border, marginVertical: 14 }]} />

        <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 10 }}>{t('quoteAlignHint')}</Text>
        <View style={styles.chipRow}>
          {ALIGN_OPTIONS.map((a) => (
            <TouchableOpacity
              key={a.id}
              onPress={() => handlePickAlign(a.id)}
              style={[styles.pill, { backgroundColor: align === a.id ? colors.primary : colors.surfaceElevated, borderColor: colors.border }]}
            >
              <Ionicons name={a.icon} size={16} color={align === a.id ? colors.onPrimary : colors.text} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border, marginVertical: 14 }]} />

        <TouchableOpacity onPress={handleToggleShowAuthor} style={styles.row}>
          <Text style={{ color: colors.text, fontSize: 15 }}>{t('quoteShowAuthor')}</Text>
          <Ionicons name={showAuthor ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={showAuthor ? colors.primary : colors.textSecondary} />
        </TouchableOpacity>
      </View>
        )}
      </View>

      {/* Manual element positions — drag each label to nudge it on the real widget */}
      <Text style={[styles.section, { color: colors.textSecondary }]}>{t('quotePositionSection')}</Text>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <CollapsibleHeader
          icon="move-outline"
          title={t('quotePositionSection')}
          isOpen={openSection === 'position'}
          onToggle={() => setOpenSection('position')}
          colors={colors}
        />
        {openSection === 'position' && (
      <View style={{ padding: 16, paddingTop: 0 }}>
        <View style={[styles.divider, { backgroundColor: colors.border, marginBottom: 14 }]} />
        <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 12 }}>{t('quotePositionHint')}</Text>

        <View style={[styles.chipRow, { marginBottom: 12 }]}>
          <TouchableOpacity
            onPress={() => setLinkedMode(true)}
            style={[styles.pill, { backgroundColor: linkedMode ? colors.primary : colors.surfaceElevated, borderColor: colors.border }]}
          >
            <Text style={{ color: linkedMode ? colors.onPrimary : colors.text, fontSize: 13, fontWeight: '600' }}>{t('quotePositionLinked')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setLinkedMode(false)}
            style={[styles.pill, { backgroundColor: !linkedMode ? colors.primary : colors.surfaceElevated, borderColor: colors.border }]}
          >
            <Text style={{ color: !linkedMode ? colors.onPrimary : colors.text, fontSize: 13, fontWeight: '600' }}>{t('quotePositionIndividual')}</Text>
          </TouchableOpacity>
        </View>

        <View
          style={[styles.positionCanvas, { backgroundColor: '#111318', borderColor: colors.border }]}
          {...(linkedMode ? groupPanResponder.panHandlers : {})}
        >
          {/* Magnet guide: a center line that lights up once you're perfectly centered */}
          <View
            pointerEvents="none"
            style={[
              styles.centerGuideLine,
              { backgroundColor: snapActive ? colors.primary : colors.border, opacity: snapActive ? 1 : 0.35 },
            ]}
          />

          {emojiEnabled && (
            <DraggableTag
              label="⭐"
              offset={offsets.emoji}
              maxOffset={MAX_WIDGET_OFFSET_DP}
              onRelease={(next) => handleOffsetChange('emoji', next)}
              textStyle={{ fontSize: 20, marginBottom: 6 }}
              interactive={!linkedMode}
              groupPan={linkedMode ? groupPan : null}
              snapTargetX={offsets.quote.x}
              onSnapChange={setSnapActive}
            />
          )}
          <DraggableTag
            label={t('quotePositionQuoteLabel')}
            offset={offsets.quote}
            maxOffset={MAX_WIDGET_OFFSET_DP}
            onRelease={(next) => handleOffsetChange('quote', next)}
            textStyle={{ color, fontSize: 16, fontWeight: '700', fontFamily, textAlign: 'center' }}
            interactive={!linkedMode}
            groupPan={linkedMode ? groupPan : null}
            snapTargetX={0}
            onSnapChange={setSnapActive}
          />
          {showAuthor && (
            <DraggableTag
              label={t('quotePositionAuthorLabel')}
              offset={offsets.author}
              maxOffset={MAX_WIDGET_OFFSET_DP}
              onRelease={(next) => handleOffsetChange('author', next)}
              textStyle={{ color, fontSize: 12, fontFamily, marginTop: 8 }}
              interactive={!linkedMode}
              groupPan={linkedMode ? groupPan : null}
              snapTargetX={offsets.quote.x}
              onSnapChange={setSnapActive}
            />
          )}
        </View>

        <TouchableOpacity onPress={handleResetOffsets} style={[styles.pill, { alignSelf: 'flex-start', marginTop: 14, backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
          <Text style={{ color: colors.text, fontSize: 13, fontWeight: '600' }}>↺ {t('quotePositionReset')}</Text>
        </TouchableOpacity>
      </View>
        )}
      </View>

      {likedIds.length > 0 && (
        <Text style={[styles.section, { color: colors.textSecondary }]}>
          {t('quoteLikedCount')} {likedIds.length}
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20 },
  section: { fontSize: 12, fontWeight: '700', marginTop: 20, marginBottom: 8, letterSpacing: 0.5 },
  card: { borderWidth: 1, borderRadius: 14, overflow: 'hidden' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  rowLeft: { flexDirection: 'row', alignItems: 'center' },
  pill: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, borderWidth: 1 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  swatch: { width: 34, height: 34, borderRadius: 17 },
  divider: { height: 1 },
  timeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  previewCard: { borderWidth: 1, borderRadius: 20, padding: 24, alignItems: 'center', marginBottom: 8 },
  positionCanvas: {
    borderWidth: 1,
    borderRadius: 16,
    minHeight: 220,
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  centerGuideLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '50%',
    width: 1,
  },
});
