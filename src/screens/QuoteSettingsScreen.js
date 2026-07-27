import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
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
  WIDGET_COLOR_OPTIONS, WIDGET_FONT_OPTIONS,
} from '../utils/quoteSettings';
import { ensurePermission, scheduleQuoteNotifications, cancelQuoteNotifications } from '../utils/notifications';
import { refreshQuoteWidget } from '../utils/widgetSync';

const SIZE_OPTIONS = ['small', 'medium', 'large'];
const ALIGN_OPTIONS = [
  { id: 'left', icon: 'menu-outline' },
  { id: 'center', icon: 'reorder-two-outline' },
  { id: 'right', icon: 'menu-outline' },
];

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
  const [align, setAlignState] = useState('center');
  const [showAuthor, setShowAuthorState] = useState(true);

  const [previewQuote, setPreviewQuote] = useState(null);
  const [likedIds, setLikedIds] = useState([]);

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
    getWidgetAlign().then(setAlignState);
    getShowAuthor().then(setShowAuthorState);
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
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, padding: 14 }]}>
        <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 10 }}>{t('quoteCategoriesHint')}</Text>
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
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, padding: 14 }]}>
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
  pill: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, borderWidth: 1 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  swatch: { width: 34, height: 34, borderRadius: 17 },
  divider: { height: 1 },
  timeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  previewCard: { borderWidth: 1, borderRadius: 20, padding: 24, alignItems: 'center', marginBottom: 8 },
});
