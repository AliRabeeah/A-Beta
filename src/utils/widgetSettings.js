import AsyncStorage from './secureStorage'; // encrypted at rest -- see secureStorage.js

const OPACITY_KEY = 'a_widget_opacity';
const DAY_OFFSET_KEY = 'a_widget_day_offset';

export async function getWidgetOpacity() {
  const raw = await AsyncStorage.getItem(OPACITY_KEY);
  const val = raw ? Number(raw) : 100;
  return Number.isFinite(val) ? val : 100;
}

export async function setWidgetOpacity(value) {
  await AsyncStorage.setItem(OPACITY_KEY, String(value));
}

export async function getWidgetDayOffset() {
  const raw = await AsyncStorage.getItem(DAY_OFFSET_KEY);
  const val = raw ? Number(raw) : 0;
  return Number.isFinite(val) ? val : 0;
}

export async function setWidgetDayOffset(value) {
  await AsyncStorage.setItem(DAY_OFFSET_KEY, String(value));
}

const FOCUS_HABIT_KEY = 'a_widget_focus_habit_id';
const HEATMAP_HABIT_KEY = 'a_widget_heatmap_habit_id';

export async function getFocusHabitId() {
  return AsyncStorage.getItem(FOCUS_HABIT_KEY);
}

export async function setFocusHabitId(habitId) {
  await AsyncStorage.setItem(FOCUS_HABIT_KEY, habitId || '');
}

export async function getHeatmapHabitId() {
  return AsyncStorage.getItem(HEATMAP_HABIT_KEY);
}

export async function setHeatmapHabitId(habitId) {
  await AsyncStorage.setItem(HEATMAP_HABIT_KEY, habitId || '');
}
