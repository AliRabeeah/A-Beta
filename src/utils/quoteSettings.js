import AsyncStorage from './secureStorage'; // encrypted at rest -- see secureStorage.js
import { QUOTE_CATEGORIES } from '../constants/quotes';

const ENABLED_KEY = 'a_quote_notif_enabled';
const TIMES_KEY = 'a_quote_notif_times'; // JSON array of 'HH:MM' strings
const CATEGORIES_KEY = 'a_quote_categories'; // JSON array of category ids, empty = all
const EMOJI_KEY = 'a_quote_emoji_enabled';
const WIDGET_COLOR_KEY = 'a_quote_widget_color';
const WIDGET_FONT_KEY = 'a_quote_widget_font';
const WIDGET_FIT_KEY = 'a_quote_widget_fit'; // 'roomy' | 'balanced' | 'snug'
const WIDGET_SIZE_KEY = 'a_quote_widget_size'; // 'small' | 'medium' | 'large'
const WIDGET_ALIGN_KEY = 'a_quote_widget_align'; // 'left' | 'center' | 'right'
const SHOW_AUTHOR_KEY = 'a_quote_widget_show_author';
const RECENT_IDS_KEY = 'a_quote_recent_ids';
const LIKED_IDS_KEY = 'a_quote_liked_ids';
const LAST_SCHEDULED_DATE_KEY = 'a_quote_last_scheduled_date';
const SCHEDULED_NOTIF_IDS_KEY = 'a_quote_scheduled_notif_ids';
const CURRENT_WIDGET_QUOTE_KEY = 'a_quote_widget_current_id';
const WIDGET_OFFSETS_KEY = 'a_quote_widget_offsets'; // { emoji:{x,y}, quote:{x,y}, author:{x,y} }
const ROTATION_INTERVAL_KEY = 'a_quote_widget_rotation_interval'; // minutes between auto-changes; 0 = off (manual/tap only)
const LAST_ROTATED_AT_KEY = 'a_quote_widget_last_rotated_at'; // ms epoch timestamp of the last auto or manual change

export const DEFAULT_WIDGET_COLOR = '#FFFFFF';
export const DEFAULT_WIDGET_FONT = 'serif';
export const RECENT_HISTORY_SIZE = 20;

// Safe, guaranteed-to-render Android generic font families. 'PlayfairDisplay'
// is included as an experimental option — it only renders correctly once the
// actual font file has been embedded natively (see plugins/withWidgetFonts.js);
// until then it silently falls back to the device's serif font.
export const WIDGET_FONT_OPTIONS = [
  { id: 'serif', label: 'Serif (Times-like)' },
  { id: 'sans-serif', label: 'Sans Serif' },
  { id: 'sans-serif-condensed', label: 'Condensed' },
  { id: 'sans-serif-light', label: 'Light' },
  { id: 'monospace', label: 'Monospace' },
  { id: 'casual', label: 'Casual' },
  { id: 'PlayfairDisplay', label: 'Playfair Display (تجريبي)' },
];

export const WIDGET_COLOR_OPTIONS = [
  '#FFFFFF', '#FFD60A', '#0A84FF', '#FF9F0A', '#FF375F', '#BF5AF2', '#00E676', '#64D2FF',
];

// How much of the widget size Android/the launcher *reports* we actually
// trust when sizing the quote text. Some launchers (heavily themed ones
// especially) report a widget size larger than what they actually render,
// which silently clips text with no reflow. Lower ratio = more safety
// margin = smaller text but never clipped; higher ratio = larger text but
// more likely to clip on launchers that over-report size.
export const DEFAULT_WIDGET_FIT = 'balanced';
export const WIDGET_FIT_OPTIONS = [
  { id: 'roomy', ratio: 0.7 },
  { id: 'balanced', ratio: 0.8 },
  { id: 'snug', ratio: 0.9 },
  // Tighter than 'snug' — reserves the least margin of the four presets.
  // Text sits closer to the widget's true edges (more centered, less dead
  // space) at the cost of a slightly higher risk of clipping on the rare
  // launchers that over-report widget size (see estimateQuoteFontSize's
  // comment for why the margin exists at all).
  { id: 'tightest', ratio: 0.96 },
];

async function getBool(key, fallback) {
  const raw = await AsyncStorage.getItem(key);
  if (raw === null) return fallback;
  return raw === 'true';
}
async function setBool(key, value) {
  await AsyncStorage.setItem(key, value ? 'true' : 'false');
}
async function getJson(key, fallback) {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch (e) {
    return fallback;
  }
}
async function setJson(key, value) {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export async function getQuoteNotifEnabled() {
  return getBool(ENABLED_KEY, false);
}
export async function setQuoteNotifEnabled(value) {
  await setBool(ENABLED_KEY, value);
}

export async function getQuoteNotifTimes() {
  return getJson(TIMES_KEY, ['09:00']);
}
export async function setQuoteNotifTimes(times) {
  await setJson(TIMES_KEY, times);
}

/** Empty array means "all categories enabled". */
export async function getQuoteCategories() {
  return getJson(CATEGORIES_KEY, []);
}
export async function setQuoteCategories(categoryIds) {
  await setJson(CATEGORIES_KEY, categoryIds);
}

export async function getQuoteEmojiEnabled() {
  return getBool(EMOJI_KEY, true);
}
export async function setQuoteEmojiEnabled(value) {
  await setBool(EMOJI_KEY, value);
}

export async function getWidgetTextColor() {
  const raw = await AsyncStorage.getItem(WIDGET_COLOR_KEY);
  return raw || DEFAULT_WIDGET_COLOR;
}
export async function setWidgetTextColor(hex) {
  await AsyncStorage.setItem(WIDGET_COLOR_KEY, hex);
}

export async function getWidgetFontFamily() {
  const raw = await AsyncStorage.getItem(WIDGET_FONT_KEY);
  return raw || DEFAULT_WIDGET_FONT;
}
export async function setWidgetFontFamily(fontId) {
  await AsyncStorage.setItem(WIDGET_FONT_KEY, fontId);
}

export async function getWidgetSize() {
  const raw = await AsyncStorage.getItem(WIDGET_SIZE_KEY);
  return raw || 'medium';
}
export async function setWidgetSize(size) {
  await AsyncStorage.setItem(WIDGET_SIZE_KEY, size);
}

export async function getWidgetFitMode() {
  const raw = await AsyncStorage.getItem(WIDGET_FIT_KEY);
  return WIDGET_FIT_OPTIONS.some((o) => o.id === raw) ? raw : DEFAULT_WIDGET_FIT;
}
export async function setWidgetFitMode(fitId) {
  await AsyncStorage.setItem(WIDGET_FIT_KEY, fitId);
}
/** Resolves the stored fit mode straight to the safety ratio used by estimateQuoteFontSize. */
export async function getWidgetFitRatio() {
  const fitId = await getWidgetFitMode();
  return (WIDGET_FIT_OPTIONS.find((o) => o.id === fitId) || WIDGET_FIT_OPTIONS[1]).ratio;
}

export async function getWidgetAlign() {
  const raw = await AsyncStorage.getItem(WIDGET_ALIGN_KEY);
  return raw || 'center';
}
export async function setWidgetAlign(align) {
  await AsyncStorage.setItem(WIDGET_ALIGN_KEY, align);
}

export async function getShowAuthor() {
  return getBool(SHOW_AUTHOR_KEY, true);
}
export async function setShowAuthor(value) {
  await setBool(SHOW_AUTHOR_KEY, value);
}

export async function getRecentQuoteIds() {
  return getJson(RECENT_IDS_KEY, []);
}
export async function pushRecentQuoteId(id) {
  const recent = await getRecentQuoteIds();
  const next = [id, ...recent.filter((x) => x !== id)].slice(0, RECENT_HISTORY_SIZE);
  await setJson(RECENT_IDS_KEY, next);
}

export async function getLikedQuoteIds() {
  return getJson(LIKED_IDS_KEY, []);
}
export async function toggleLikedQuoteId(id) {
  const liked = await getLikedQuoteIds();
  const isLiked = liked.includes(id);
  const next = isLiked ? liked.filter((x) => x !== id) : [id, ...liked];
  await setJson(LIKED_IDS_KEY, next);
  return !isLiked;
}

export async function getLastScheduledDate() {
  return AsyncStorage.getItem(LAST_SCHEDULED_DATE_KEY);
}
export async function setLastScheduledDate(dateKey) {
  await AsyncStorage.setItem(LAST_SCHEDULED_DATE_KEY, dateKey);
}

export async function getScheduledQuoteNotifIds() {
  return getJson(SCHEDULED_NOTIF_IDS_KEY, []);
}
export async function setScheduledQuoteNotifIds(ids) {
  await setJson(SCHEDULED_NOTIF_IDS_KEY, ids);
}

export async function getCurrentWidgetQuoteId() {
  const raw = await AsyncStorage.getItem(CURRENT_WIDGET_QUOTE_KEY);
  return raw ? Number(raw) : null;
}
export async function setCurrentWidgetQuoteId(id) {
  await AsyncStorage.setItem(CURRENT_WIDGET_QUOTE_KEY, String(id));
}

export const DEFAULT_WIDGET_OFFSETS = {
  emoji: { x: 0, y: 0 },
  quote: { x: 0, y: 0 },
  author: { x: 0, y: 0 },
};

/** Max nudge (dp) allowed per axis — keeps a small safety margin reserved in the width math too. */
export const MAX_WIDGET_OFFSET_DP = 40;

export async function getWidgetOffsets() {
  const stored = await getJson(WIDGET_OFFSETS_KEY, null);
  if (!stored) return DEFAULT_WIDGET_OFFSETS;
  // Merge with defaults in case a future version adds a 4th element etc.
  return {
    emoji: { ...DEFAULT_WIDGET_OFFSETS.emoji, ...(stored.emoji || {}) },
    quote: { ...DEFAULT_WIDGET_OFFSETS.quote, ...(stored.quote || {}) },
    author: { ...DEFAULT_WIDGET_OFFSETS.author, ...(stored.author || {}) },
  };
}
export async function setWidgetOffsets(offsets) {
  await setJson(WIDGET_OFFSETS_KEY, offsets);
}
export async function resetWidgetOffsets() {
  await setJson(WIDGET_OFFSETS_KEY, DEFAULT_WIDGET_OFFSETS);
}

export function categoryIsKnown(id) {
  return QUOTE_CATEGORIES.some((c) => c.id === id);
}

// ---------------------------------------------------------------------
// Widget auto-rotation (change the quote by itself, no tap needed)
// ---------------------------------------------------------------------
// The widget's own periodic refresh (Android's AppWidgetProvider tick, see
// app.json's updatePeriodMillis for QuoteWidget) runs every 30 minutes at
// most — that's the OS-enforced floor, we can't go tighter than that
// without a custom foreground service. So "every 30 minutes" is the
// shortest selectable option; longer options just skip most ticks until
// their own interval has actually elapsed (tracked via
// getWidgetLastRotatedAt/setWidgetLastRotatedAt, checked in
// widget-task-handler.js on every periodic tick).
export const DEFAULT_ROTATION_INTERVAL_MINUTES = 240; // 4 hours

export const WIDGET_ROTATION_INTERVAL_OPTIONS = [
  { id: 0, labelKey: 'quoteRotationOff' },
  { id: 30, labelKey: 'quoteRotation30m' },
  { id: 60, labelKey: 'quoteRotation1h' },
  { id: 120, labelKey: 'quoteRotation2h' },
  { id: 240, labelKey: 'quoteRotation4h' },
  { id: 360, labelKey: 'quoteRotation6h' },
  { id: 720, labelKey: 'quoteRotation12h' },
  { id: 1440, labelKey: 'quoteRotation24h' },
];

/** Minutes between automatic quote changes on the widget. 0 = off (only changes when tapped). */
export async function getWidgetRotationInterval() {
  const raw = await AsyncStorage.getItem(ROTATION_INTERVAL_KEY);
  const n = raw !== null ? Number(raw) : DEFAULT_ROTATION_INTERVAL_MINUTES;
  return WIDGET_ROTATION_INTERVAL_OPTIONS.some((o) => o.id === n) ? n : DEFAULT_ROTATION_INTERVAL_MINUTES;
}
export async function setWidgetRotationInterval(minutes) {
  await AsyncStorage.setItem(ROTATION_INTERVAL_KEY, String(minutes));
}

/** When the widget's quote last changed (auto or by tap), as an epoch ms timestamp. */
export async function getWidgetLastRotatedAt() {
  const raw = await AsyncStorage.getItem(LAST_ROTATED_AT_KEY);
  return raw ? Number(raw) : 0;
}
export async function setWidgetLastRotatedAt(timestampMs) {
  await AsyncStorage.setItem(LAST_ROTATED_AT_KEY, String(timestampMs));
}
