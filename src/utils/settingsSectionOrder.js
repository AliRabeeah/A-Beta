import AsyncStorage from './secureStorage'; // encrypted at rest -- see secureStorage.js

export const SETTINGS_SECTION_ORDER_KEY = 'a_settings_sections_order_v1';

export const DEFAULT_SETTINGS_SECTION_ORDER = [
  'language', 'appearance', 'accent', 'font', 'appIcon', 'tabBar', 'speedDial', 'appLock',
  'notifications', 'widget', 'backup', 'trash', 'github', 'moodHistory',
  'dayClosing', 'weeklyReview', 'quoteSettings', 'about',
];

/** Raw read, no validation against the current known-section list. */
export async function getSettingsSectionOrder() {
  const raw = await AsyncStorage.getItem(SETTINGS_SECTION_ORDER_KEY);
  try {
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) ? parsed : null;
  } catch (e) {
    return null;
  }
}

export async function setSettingsSectionOrder(order) {
  await AsyncStorage.setItem(SETTINGS_SECTION_ORDER_KEY, JSON.stringify(order));
}
