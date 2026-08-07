import AsyncStorage from './secureStorage'; // encrypted at rest -- see secureStorage.js

// One customization record per widget, stored as a single JSON blob (same
// pattern as quoteSettings.js's widget offsets) so a settings screen can
// read/write everything about one widget in one call instead of five.
const PREFIX = 'a_widget_custom_';

export const WIDGET_KEYS = {
  list: 'list',
  stats: 'stats',
  quickAdd: 'quickAdd',
};

// Same accent palette the quote widget already uses, so colors picked
// across every widget on the home screen feel like one consistent set.
export const WIDGET_ACCENT_OPTIONS = ['#FFFFFF', '#FFD60A', '#0A84FF', '#FF9F0A', '#FF375F', '#BF5AF2', '#00E676', '#64D2FF'];

export const WIDGET_STYLE_OPTIONS = [
  { id: 'glass', labelKey: 'widgetStyleGlass' },
  { id: 'solid', labelKey: 'widgetStyleSolid' },
  { id: 'transparent', labelKey: 'widgetStyleTransparent' },
];

export const WIDGET_SIZE_OPTIONS = [
  { id: 'small', labelKey: 'widgetSizeSmall' },
  { id: 'medium', labelKey: 'widgetSizeMedium' },
  { id: 'large', labelKey: 'widgetSizeLarge' },
];

export const MAX_WIDGET_CUSTOM_OFFSET = 24; // dp, matches the quote widget's per-element drag range

export const DEFAULT_WIDGET_CUSTOMIZATION = {
  accentColor: '#0A84FF',
  style: 'glass',
  size: 'medium',
  offset: { x: 0, y: 0 },
};

export async function getWidgetCustomization(widgetKey) {
  const raw = await AsyncStorage.getItem(`${PREFIX}${widgetKey}`);
  if (!raw) return DEFAULT_WIDGET_CUSTOMIZATION;
  try {
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_WIDGET_CUSTOMIZATION,
      ...parsed,
      offset: { ...DEFAULT_WIDGET_CUSTOMIZATION.offset, ...(parsed.offset || {}) },
    };
  } catch {
    return DEFAULT_WIDGET_CUSTOMIZATION;
  }
}

export async function setWidgetCustomization(widgetKey, customization) {
  await AsyncStorage.setItem(`${PREFIX}${widgetKey}`, JSON.stringify(customization));
}

export async function resetWidgetCustomization(widgetKey) {
  await AsyncStorage.setItem(`${PREFIX}${widgetKey}`, JSON.stringify(DEFAULT_WIDGET_CUSTOMIZATION));
}

/** Converts a size preset into concrete scale factors a widget component can use directly. */
export function sizeScale(size) {
  if (size === 'small') return { font: 0.85, rowHeight: 0.82, padding: 0.8 };
  if (size === 'large') return { font: 1.18, rowHeight: 1.15, padding: 1.15 };
  return { font: 1, rowHeight: 1, padding: 1 };
}

/** Converts a style id into a concrete backgroundColor (ARGB hex) for the widget's outer card. */
export function styleBackground(style) {
  if (style === 'transparent') return '#00000000';
  if (style === 'solid') return '#F2121212'; // opaque-ish dark card
  return '#B3141414'; // 'glass' — translucent dark card, default
}
