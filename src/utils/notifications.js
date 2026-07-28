import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { toKey } from './dateUtils';
import { getDayClosingNotifId, setDayClosingNotifId } from './dayClosingSettings';
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
 * Cancels every currently-scheduled quote notification. Used when the
 * feature is turned off, and internally before re-scheduling with a fresh
 * set of quotes.
 */
export async function cancelQuoteNotifications() {
  const ids = await getScheduledQuoteNotifIds();
  for (const id of ids) {
    if (!id) continue;
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch (e) {
      // already fired or invalid id
    }
  }
  await setScheduledQuoteNotifIds([]);
}

/**
 * (Re)schedules one daily quote notification per configured time, each
 * with a freshly-picked random quote. Expo's DAILY trigger repeats the
 * same content every day, so to get a *different* quote each day this
 * must be called again once a day — see `rebuildQuoteNotificationsIfNeeded`,
 * which is the function screens/App startup should actually call.
 */
export async function scheduleQuoteNotifications(times) {
  await cancelQuoteNotifications();

  const list = (times && times.length > 0 ? times : ['09:00']).filter(Boolean);
  if (list.length === 0) return [];

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('quotes-v1', {
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
      content: { title, body, sound: 'default' },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
        channelId: 'quotes-v1',
      },
    });
    ids.push(id);
  }

  await setScheduledQuoteNotifIds(ids);
  await setLastScheduledDate(toKey(new Date()));
  return ids;
}

/**
 * Call on app startup (and whenever quote notification settings change).
 * Re-schedules with fresh quotes once per calendar day, and leaves the
 * existing schedule untouched otherwise so reopening the app repeatedly in
 * the same day doesn't reshuffle the quote that's about to fire.
 */
export async function rebuildQuoteNotificationsIfNeeded() {
  const enabled = await getQuoteNotifEnabled();
  if (!enabled) return;

  const todayKey = toKey(new Date());
  const lastDate = await getLastScheduledDate();
  if (lastDate === todayKey) return;

  const times = await getQuoteNotifTimes();
  await scheduleQuoteNotifications(times);
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
