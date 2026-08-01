import * as QuickActions from 'expo-quick-actions';
import { navigate } from '../navigation';

// Maps a shortcut's id to the stack screen that opens its "new" flow (no
// id param passed = create mode, matching how these screens already work
// from in-app "+" buttons).
const SHORTCUT_ROUTES = {
  new_task: 'NewTask',
  new_habit: 'AddEditHabit',
  new_note: 'AddEditNote',
};

/**
 * (Re)registers the app's home-screen/launcher-icon quick actions. Safe to
 * call on every app start — it just overwrites the previous list — and
 * fails silently on devices/OS versions that don't support quick actions
 * at all, since that just means the shortcuts won't appear.
 */
export async function setupAppShortcuts(t) {
  try {
    await QuickActions.setItems([
      { id: 'new_task', title: t('quickActionNewTask'), icon: 'compose' },
      { id: 'new_habit', title: t('quickActionNewHabit'), icon: 'confirmation' },
      { id: 'new_note', title: t('quickActionNewNote'), icon: 'message' },
    ]);
  } catch (e) {
    // Unsupported on this device/OS — nothing to do.
  }
}

/** Navigates to the right screen for a triggered quick action, if any. */
export function handleQuickAction(action) {
  if (!action) return;
  const screen = SHORTCUT_ROUTES[action.id];
  if (screen) navigate(screen);
}
