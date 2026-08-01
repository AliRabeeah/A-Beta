import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { toKey } from './dateUtils';
import { getDayClosingNotifId, setDayClosingNotifId } from './dayClosingSettings';
import { getWeeklyReviewNotifId, setWeeklyReviewNotifId } from './weeklyReviewSettings';
import { pickRandomQuote, randomQuoteEmoji } from './quotePicker';
import {
  getQuoteNotifEnabled,
  getQuoteNotifTimes,
  getQuoteEmojiEnabled,
  getLastScheduledDate,
  setLastScheduledDate,
  getScheduledQuoteNotifIds,
  setScheduledQuoteNotifIds,
} from './quoteSettings';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function ensurePermission() {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/** Reads current permission status without prompting, for display purposes. */
export async function getPermissionStatus() {
  const { status } = await Notifications.getPermissionsAsync();
  return status; // 'granted' | 'denied' | 'undetermined'
}

// Identifier for the interactive habit-reminder notification category (a
// "✓ Done" and "⏰ Snooze" button pair). Registering it is a no-op if it's
// already registered, so it's safe to call this on every app start.
export const HABIT_REMINDER_CATEGORY = 'habit-reminder';

export async function ensureHabitNotificationCategory(t) {
  try {
    await Notifications.setNotificationCategoryAsync(HABIT_REMINDER_CATEGORY, [
      {
        identifier: 'MARK_DONE',
        buttonTitle: t ? t('notifActionDone') : '✓ Done',
        options: { opensAppToForeground: true },
      },
      {
        identifier: 'SNOOZE_1H',
        buttonTitle: t ? t('notifActionSnooze') : '⏰ +1h',
        options: { opensAppToForeground: true },
      },
    ]);
  } catch (e) {
    // Category actions are best-effort; the notification still works as a
    // plain tap-to-open reminder even if this fails on some platform/OS.
  }
}

export async function scheduleReminder(habit) {
  if (!habit.reminderTime) return null;
  const [hour, minute] = habit.reminderTime.split(':').map(Number);

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('reminders-v2', {
      name: 'Habit Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
      enableVibrate: true,
    });
  }

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: habit.icon ? `${habit.icon} ${habit.name}` : habit.name,
      body: "Time to check off today's habit.",
      sound: 'default',
      categoryIdentifier: HABIT_REMINDER_CATEGORY,
      data: { screen: 'Today', habitId: habit.id, type: 'habit-reminder' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      channelId: 'reminders-v2',
    },
  });
  return id;
}

/**
 * Re-fires a single habit reminder ~1 hour from now, for the "⏰ +1h" action
 * on a habit reminder notification. A one-off (not repeating) alert, kept
 * separate from the habit's own daily `scheduleReminder` schedule/id.
 */
export async function scheduleHabitSnooze(habit) {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('reminders-v2', {
      name: 'Habit Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
      enableVibrate: true,
    });
  }
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: habit.icon ? `${habit.icon} ${habit.name}` : habit.name,
      body: "Time to check off today's habit.",
      sound: 'default',
      categoryIdentifier: HABIT_REMINDER_CATEGORY,
      data: { screen: 'Today', habitId: habit.id, type: 'habit-reminder' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 60 * 60,
      channelId: 'reminders-v2',
    },
  });
  return id;
}

export async function cancelReminder(notificationId) {
  if (!notificationId) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (e) {
    // already cancelled or invalid id
  }
}

/**
 * Schedules a one-off local notification `seconds` from now, so the
 * Timer screen still alerts the user even if the app is backgrounded
 * or the screen turns off. Returns the notification id so it can be
 * cancelled if the timer is paused/reset/restarted before it fires.
 */
export async function scheduleTimerAlert(seconds, title, body) {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('timer-v2', {
      name: 'Timer',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
      enableVibrate: true,
    });
  }
  const id = await Notifications.scheduleNotificationAsync({
    content: { title, body, sound: 'default' },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: Math.max(1, Math.round(seconds)),
      channelId: 'timer-v2',
    },
  });
  return id;
}

export async function cancelTimerAlert(notificationId) {
  if (!notificationId) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (e) {
    // already fired or invalid id
  }
}

/**
 * Schedules one or more reminders for a task. For a single (one-off)
 * task, each reminder fires once at the task's due date + the given
 * time. For a recurring task, each reminder repeats daily at that
 * time (recurring tasks may only be due on certain days, but the
 * reminder itself simply repeats daily for simplicity — the app's
 * own due-date logic still only *shows* the task on its actual days).
 * Returns an array of notification ids, parallel to `task.reminders`.
 */
export async function scheduleTaskReminders(task) {
  const reminders = task.reminders || [];
  if (reminders.length === 0) return [];

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('tasks-v1', {
      name: 'Task Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
      enableVibrate: true,
    });
  }

  const ids = [];
  for (const time of reminders) {
    const [hour, minute] = time.split(':').map(Number);
    let trigger;

    if (task.taskType === 'recurring') {
      trigger = { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute, channelId: 'tasks-v1' };
    } else {
      const due = task.dueDate ? new Date(task.dueDate + 'T00:00:00') : new Date();
      due.setHours(hour, minute, 0, 0);
      if (due.getTime() <= Date.now()) {
        // Due time already passed today; skip scheduling rather than
        // firing an immediate/backdated notification.
        ids.push(null);
        continue;
      }
      trigger = { type: Notifications.SchedulableTriggerInputTypes.DATE, date: due, channelId: 'tasks-v1' };
    }

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: task.title,
        body: 'Task reminder',
        sound: 'default',
      },
      trigger,
    });
    ids.push(id);
  }
  return ids;
}

export async function cancelTaskReminders(notificationIds) {
  if (!notificationIds) return;
  for (const id of notificationIds) {
    if (!id) continue;
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch (e) {
      // already fired or invalid id
    }
  }
}

/**
 * Schedules a one-off reminder for a Planning "daily goal" item, firing
 * at `reminderTime` on the item's `createdDate` (a daily goal is only
 * ever due on that single day). Mirrors the single-task reminder
 * pattern above. Returns null if there's no reminder time set or the
 * moment has already passed.
 */
export async function schedulePlanningReminder(item) {
  if (!item.reminderTime || item.type !== 'daily') return null;
  const [hour, minute] = item.reminderTime.split(':').map(Number);
  const due = new Date(item.createdDate + 'T00:00:00');
  due.setHours(hour, minute, 0, 0);
  if (due.getTime() <= Date.now()) return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('planning-v1', {
      name: 'Planning Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
      enableVibrate: true,
    });
  }

  const id = await Notifications.scheduleNotificationAsync({
    content: { title: item.title, body: 'Planning reminder', sound: 'default' },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: due, channelId: 'planning-v1' },
  });
  return id;
}

export async function cancelPlanningReminder(notificationId) {
  if (!notificationId) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (e) {
    // already fired or invalid id
  }
}

/**
 * Schedules a one-off reminder for a Note at an exact date+time
 * (`note.reminderAt`, an ISO datetime string). Returns null if there's
 * no reminder set or the moment has already passed.
 */
export async function scheduleNoteReminder(note) {
  if (!note.reminderAt) return null;
  const due = new Date(note.reminderAt);
  if (isNaN(due.getTime()) || due.getTime() <= Date.now()) return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('notes-v1', {
      name: 'Note Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
      enableVibrate: true,
    });
  }

  const title = note.emoji ? `${note.emoji} ${note.title || 'Note'}` : (note.title || 'Note');
  const body = (note.content || '').trim().slice(0, 120) || 'Note reminder';

  const id = await Notifications.scheduleNotificationAsync({
    content: { title, body, sound: 'default' },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: due, channelId: 'notes-v1' },
  });
  return id;
}

export async function cancelNoteReminder(notificationId) {
  if (!notificationId) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (e) {
    // already fired or invalid id
  }
}

/**
 * Schedules a one-off reminder for a Wishlist item at an exact date+time
 * (`item.reminderAt`, an ISO datetime string). Mirrors scheduleNoteReminder.
 * Returns null if there's no reminder set or the moment has already passed.
 */
export async function scheduleWishlistReminder(item) {
  if (!item.reminderAt) return null;
  const due = new Date(item.reminderAt);
  if (isNaN(due.getTime()) || due.getTime() <= Date.now()) return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('wishlist-v1', {
      name: 'Wishlist Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
      enableVibrate: true,
    });
  }

  const title = item.title || 'Wishlist reminder';
  const body = (item.description || '').trim().slice(0, 120) || 'Wishlist reminder';

  const id = await Notifications.scheduleNotificationAsync({
    content: { title, body, sound: 'default', data: { screen: 'Wishlist' } },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: due, channelId: 'wishlist-v1' },
  });
  return id;
}

export async function cancelWishlistReminder(notificationId) {
  if (!notificationId) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (e) {
    // already fired or invalid id
  }
}

/**
 * Quote notifications are entered from three places (app mount, every
 * AppState -> 'active' transition, and the Quote Settings screen), and
 * `rebuildQuoteNotificationsIfNeeded`'s "already scheduled today?" check
 * involves several `await`s before it writes `lastScheduledDate` back.
 * Without serialization, two calls landing close together (mount + the
 * 'active' event that commonly fires right after it on startup) can both
 * pass that check before either finishes, so both cancel-and-reschedule
 * concurrently. The second call's notification ids then overwrite the
 * first's in storage, leaving the first batch still scheduled with the OS
 * but no longer tracked — an orphan that fires alongside the second batch
 * (duplicate quote notifications at the same time), and that lingers as a
 * stale alarm afterwards (a plausible cause of "late/at the wrong time"
 * deliveries too, since it's competing with the real one).
 *
 * All entry points below funnel through this queue so only one runs at a
 * time; the others simply await their turn instead of racing.
 */
let quoteNotifQueue = Promise.resolve();
function serializeQuoteNotif(task) {
  const result = quoteNotifQueue.then(task, task);
  // Keep the chain alive even if a task throws, and swallow the rejection
  // here so it doesn't surface as an unhandled rejection — callers still
  // get the real error via the `result` promise they were returned.
  quoteNotifQueue = result.then(() => {}, () => {});
  return result;
}

/** Marks every quote notification's payload so it can be found and swept
 * later even if its id was never (or is no longer) in storage. */
const QUOTE_NOTIF_DATA = { type: 'quote' };
const QUOTE_CHANNEL_ID = 'quotes-v1';

/**
 * Identifies a quote notification from an OS-level scheduled-notification
 * record. Checked three ways, broadest first:
 *  1. `data.type === 'quote'` — set by this file for anything it schedules
 *     going forward.
 *  2. Android `channelId === 'quotes-v1'` — a second, independent tag on
 *     the same notifications.
 *  3. `title` containing "Daily Quote" — the fixed title string this
 *     feature has always used, tag or not.
 * (3) exists specifically to catch notifications scheduled by an *older*
 * build of this app, before `data`/tagging was added — those have neither
 * of the first two markers, so relying on the tag alone silently ignores
 * exactly the pre-existing duplicates a user upgrading the app needs
 * cleaned up. Matching on the title too means this cleanup is retroactive
 * instead of only protecting installs going forward.
 */
function isQuoteNotification(n) {
  if (!n) return false;
  if (n?.content?.data?.type === 'quote') return true;
  if (n?.trigger?.channelId === QUOTE_CHANNEL_ID) return true;
  if (typeof n?.content?.title === 'string' && n.content.title.includes('Daily Quote')) return true;
  return false;
}

async function cancelQuoteNotificationsImpl() {
  // Cancel by stored ids...
  const ids = await getScheduledQuoteNotifIds();
  for (const id of ids) {
    if (!id) continue;
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch (e) {
      // already fired or invalid id
    }
  }
  // ...and also sweep any quote notification actually scheduled with the
  // OS that isn't in that list (orphans from a past race, a killed app, a
  // pre-update install, or any other loss of storage sync).
  await sweepStrayQuoteNotifications();
  await setScheduledQuoteNotifIds([]);
}

/**
 * Cancels every OS-scheduled notification matching `isQuoteNotification`
 * except (optionally) a given set of ids to keep. No-ops quietly if
 * `getAllScheduledNotificationsAsync` isn't available on this platform.
 */
async function sweepStrayQuoteNotifications(keepIds) {
  const keep = keepIds ? new Set(keepIds) : null;
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of scheduled) {
      if (!isQuoteNotification(n)) continue;
      if (keep && keep.has(n.identifier)) continue;
      try {
        await Notifications.cancelScheduledNotificationAsync(n.identifier);
      } catch (e) {
        // already fired or invalid id
      }
    }
  } catch (e) {
    // getAllScheduledNotificationsAsync unsupported/unavailable; stored-id
    // cancellation elsewhere still covers the common case.
  }
}

async function scheduleQuoteNotificationsImpl(times) {
  await cancelQuoteNotificationsImpl();

  const list = (times && times.length > 0 ? times : ['09:00']).filter(Boolean);
  if (list.length === 0) return [];

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(QUOTE_CHANNEL_ID, {
      name: 'Motivational Quotes',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 200, 150, 200],
      enableVibrate: true,
    });
  }

  const emojiEnabled = await getQuoteEmojiEnabled();
  const ids = [];

  for (const time of list) {
    const [hour, minute] = time.split(':').map(Number);
    if (Number.isNaN(hour) || Number.isNaN(minute)) continue;

    const quote = await pickRandomQuote();
    if (!quote) continue;

    const emoji = emojiEnabled ? `${randomQuoteEmoji()} ` : '';
    const title = `${emoji}Daily Quote`;
    const body = quote.author ? `"${quote.text}" — ${quote.author}` : `"${quote.text}"`;

    const id = await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: 'default', data: QUOTE_NOTIF_DATA },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
        channelId: QUOTE_CHANNEL_ID,
      },
    });
    ids.push(id);
  }

  await setScheduledQuoteNotifIds(ids);
  await setLastScheduledDate(toKey(new Date()));
  return ids;
}

/**
 * Cancels every currently-scheduled quote notification. Used when the
 * feature is turned off, and internally before re-scheduling with a fresh
 * set of quotes.
 */
export async function cancelQuoteNotifications() {
  return serializeQuoteNotif(cancelQuoteNotificationsImpl);
}

/**
 * (Re)schedules one daily quote notification per configured time, each
 * with a freshly-picked random quote. Expo's DAILY trigger repeats the
 * same content every day, so to get a *different* quote each day this
 * must be called again once a day — see `rebuildQuoteNotificationsIfNeeded`,
 * which is the function screens/App startup should actually call.
 */
export async function scheduleQuoteNotifications(times) {
  return serializeQuoteNotif(() => scheduleQuoteNotificationsImpl(times));
}

/**
 * Call on app startup (and whenever quote notification settings change).
 * Re-schedules with fresh quotes once per calendar day, and leaves the
 * existing schedule untouched otherwise so reopening the app repeatedly in
 * the same day doesn't reshuffle the quote that's about to fire.
 *
 * Every call — including the "nothing to do today" fast path — first runs
 * a cheap dedupe pass that cancels anything scheduled at the OS level that
 * doesn't match this app's own tracked id list. That's what makes the fix
 * self-healing for a device that already has stray/duplicate quote
 * notifications sitting on it from before this fix existed: rather than
 * waiting for the next full reschedule (tomorrow) to clean them via
 * `cancelQuoteNotificationsImpl`, they get trimmed the very next time the
 * app is opened, today.
 */
export async function rebuildQuoteNotificationsIfNeeded() {
  return serializeQuoteNotif(async () => {
    const enabled = await getQuoteNotifEnabled();
    if (!enabled) {
      // Feature is off but stray quote notifications could still be
      // sitting on the device from before it was turned off/before this
      // fix existed — clear them out entirely rather than leaving them.
      await sweepStrayQuoteNotifications();
      return;
    }

    const todayKey = toKey(new Date());
    const lastDate = await getLastScheduledDate();
    if (lastDate === todayKey) {
      // Already scheduled today — don't reshuffle the quote, but do make
      // sure the OS doesn't have more quote notifications sitting around
      // than the ones this app is actually tracking.
      const trackedIds = await getScheduledQuoteNotifIds();
      await sweepStrayQuoteNotifications(trackedIds);
      return;
    }

    const times = await getQuoteNotifTimes();
    await scheduleQuoteNotificationsImpl(times);
  });
}

/**
 * Schedules (or reschedules) the daily "close your day" reminder at the
 * given HH:mm local time. Tapping the notification carries a `data.screen`
 * payload of 'DayClosing' so App.js's notification-response listener can
 * open that screen directly — see navigationRef in navigation/index.js.
 */
export async function ensureDayClosingReminder(time) {
  await cancelDayClosingReminder();
  const [hour, minute] = (time || '21:00').split(':').map(Number);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('day-closing-v1', {
      name: 'Day Closing Reminder',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
      enableVibrate: true,
    });
  }

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: '🌙 Close your day',
      body: "Take a minute to reflect and plan tomorrow's priority.",
      sound: 'default',
      data: { screen: 'DayClosing' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      channelId: 'day-closing-v1',
    },
  });
  await setDayClosingNotifId(id);
  return id;
}

export async function cancelDayClosingReminder() {
  const id = await getDayClosingNotifId();
  if (!id) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch (e) {
    // already cancelled or invalid id
  }
  await setDayClosingNotifId(null);
}

/**
 * Schedules (or reschedules) the weekly review reminder on the given
 * weekday (1 = Sunday ... 7 = Saturday) at the given HH:mm local time.
 * Tapping it carries `data.screen = 'WeeklyReview'` so App.js's
 * notification-response listener opens that screen directly.
 */
export async function ensureWeeklyReviewReminder(weekday, time) {
  await cancelWeeklyReviewReminder();
  const [hour, minute] = (time || '19:00').split(':').map(Number);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('weekly-review-v1', {
      name: 'Weekly Review',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
      enableVibrate: true,
    });
  }

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: '📅 Weekly Review',
      body: 'See how your week went and plan the next one.',
      sound: 'default',
      data: { screen: 'WeeklyReview' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday: weekday || 1,
      hour,
      minute,
      channelId: 'weekly-review-v1',
    },
  });
  await setWeeklyReviewNotifId(id);
  return id;
}

export async function cancelWeeklyReviewReminder() {
  const id = await getWeeklyReviewNotifId();
  if (!id) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch (e) {
    // already cancelled or invalid id
  }
  await setWeeklyReviewNotifId(null);
}
