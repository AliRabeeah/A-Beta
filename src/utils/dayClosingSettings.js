import AsyncStorage from '@react-native-async-storage/async-storage';

const ENABLED_KEY = 'a_dayclosing_reminder_enabled_v1';
const TIME_KEY = 'a_dayclosing_reminder_time_v1';
const NOTIF_ID_KEY = 'a_dayclosing_reminder_notif_id_v1';

export async function getDayClosingReminderEnabled() {
  const raw = await AsyncStorage.getItem(ENABLED_KEY);
  return raw === 'true';
}

export async function setDayClosingReminderEnabled(value) {
  await AsyncStorage.setItem(ENABLED_KEY, value ? 'true' : 'false');
}

export async function getDayClosingReminderTime() {
  return AsyncStorage.getItem(TIME_KEY);
}

export async function setDayClosingReminderTime(time) {
  await AsyncStorage.setItem(TIME_KEY, time);
}

export async function getDayClosingNotifId() {
  return AsyncStorage.getItem(NOTIF_ID_KEY);
}

export async function setDayClosingNotifId(id) {
  if (id) await AsyncStorage.setItem(NOTIF_ID_KEY, id);
  else await AsyncStorage.removeItem(NOTIF_ID_KEY);
}
