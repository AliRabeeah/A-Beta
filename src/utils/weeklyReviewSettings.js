import AsyncStorage from '@react-native-async-storage/async-storage';

const ENABLED_KEY = 'a_weeklyreview_reminder_enabled_v1';
const WEEKDAY_KEY = 'a_weeklyreview_reminder_weekday_v1'; // 1 (Sun) - 7 (Sat)
const TIME_KEY = 'a_weeklyreview_reminder_time_v1';
const NOTIF_ID_KEY = 'a_weeklyreview_reminder_notif_id_v1';
const LAST_VIEWED_KEY = 'a_weeklyreview_last_viewed_week_v1'; // e.g. "2026-W31"

export async function getWeeklyReviewEnabled() {
  const raw = await AsyncStorage.getItem(ENABLED_KEY);
  return raw === 'true';
}

export async function setWeeklyReviewEnabled(value) {
  await AsyncStorage.setItem(ENABLED_KEY, value ? 'true' : 'false');
}

/** 1 = Sunday ... 7 = Saturday, matching Notifications' WEEKLY trigger. */
export async function getWeeklyReviewWeekday() {
  const raw = await AsyncStorage.getItem(WEEKDAY_KEY);
  const n = raw ? parseInt(raw, 10) : 1; // default Sunday
  return Number.isNaN(n) ? 1 : n;
}

export async function setWeeklyReviewWeekday(weekday) {
  await AsyncStorage.setItem(WEEKDAY_KEY, String(weekday));
}

export async function getWeeklyReviewTime() {
  return AsyncStorage.getItem(TIME_KEY);
}

export async function setWeeklyReviewTime(time) {
  await AsyncStorage.setItem(TIME_KEY, time);
}

export async function getWeeklyReviewNotifId() {
  return AsyncStorage.getItem(NOTIF_ID_KEY);
}

export async function setWeeklyReviewNotifId(id) {
  if (id) await AsyncStorage.setItem(NOTIF_ID_KEY, id);
  else await AsyncStorage.removeItem(NOTIF_ID_KEY);
}

export async function getWeeklyReviewLastViewedWeek() {
  return AsyncStorage.getItem(LAST_VIEWED_KEY);
}

export async function setWeeklyReviewLastViewedWeek(weekKey) {
  await AsyncStorage.setItem(LAST_VIEWED_KEY, weekKey);
}
