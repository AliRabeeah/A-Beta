import { toKey, addDays } from './dateUtils';

/** Whether an entry has enough real content to count (not just whitespace). */
export function hasContent(entry) {
  return !!entry && !!(entry.content || '').trim();
}

export function wordCount(text) {
  const trimmed = (text || '').trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

export function entryCount(entries) {
  return Object.values(entries || {}).filter(hasContent).length;
}

/**
 * Current consecutive-day writing streak, counted backward from today.
 * If today doesn't have an entry yet, the streak still counts through
 * yesterday (so it doesn't zero out the moment the clock passes midnight
 * before that day's entry is written) — mirrors how habit streaks work
 * elsewhere in the app.
 */
export function computeStreak(entries, today = new Date()) {
  let cursor = hasContent(entries[toKey(today)]) ? today : addDays(today, -1);
  let streak = 0;
  while (hasContent(entries[toKey(cursor)])) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/** Entries sorted most-recent-first, as [{ date, ...entry }]. */
export function sortedEntryList(entries) {
  return Object.entries(entries || {})
    .filter(([, entry]) => hasContent(entry))
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .map(([date, entry]) => ({ date, ...entry }));
}
