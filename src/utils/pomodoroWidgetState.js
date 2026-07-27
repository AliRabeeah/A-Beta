import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'a_pomodoro_widget_state';

/**
 * Persists a snapshot of the Pomodoro timer so the home-screen widget
 * can show an accurate "time remaining" even though it can't run a
 * live countdown itself. `endTimestamp` is a fixed point in time, so
 * the widget (and the app, after resuming) can always compute
 * remaining = endTimestamp - now, rather than relying on a ticking
 * counter that would go stale the moment the app is backgrounded.
 */
export async function savePomodoroWidgetState({ phase, running, endTimestamp }) {
  await AsyncStorage.setItem(KEY, JSON.stringify({ phase, running, endTimestamp }));
}

export async function loadPomodoroWidgetState() {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

export async function clearPomodoroWidgetState() {
  await AsyncStorage.removeItem(KEY);
}
