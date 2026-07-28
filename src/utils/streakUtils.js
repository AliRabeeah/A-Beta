import { toKey, addDays, startOfWeek } from './dateUtils';

export function isDueOnDate(habit, date) {
  if (habit.frequency === 'specific_days') {
    return habit.specificDays.includes(date.getDay());
  }
  return true; // daily & weekly: every day is a valid opportunity
}

/**
 * Returns 'done' | 'skipped' | null for a given date key.
 * Legacy data stored `true` for completed days — treated as 'done'.
 */
export function statusOf(habit, dateKey) {
  const v = habit.completions?.[dateKey];
  if (v === 'skipped') return 'skipped';
  if (v) return 'done';
  return null;
}

export function getCurrentStreak(habit) {
  let streak = 0;
  let cursor = new Date();
  const todayKey = toKey(cursor);

  if (isDueOnDate(habit, cursor) && statusOf(habit, todayKey) === null) {
    // Today hasn't been acted on yet — don't penalize, start from yesterday.
    cursor = addDays(cursor, -1);
  }

  for (let i = 0; i < 3650; i++) {
    if (isDueOnDate(habit, cursor)) {
      const status = statusOf(habit, toKey(cursor));
      if (status === 'done') {
        streak++;
      } else if (status === 'skipped') {
        // Excused day — streak continues but doesn't increment.
      } else {
        break;
      }
    }
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function getBestStreak(habit) {
  const doneDates = Object.keys(habit.completions || {})
    .filter((k) => statusOf(habit, k) === 'done')
    .sort();
  if (doneDates.length === 0) return 0;

  let best = 0;
  let current = 0;
  let prev = null;

  for (const dateStr of doneDates) {
    const d = new Date(dateStr + 'T00:00:00');
    if (prev) {
      let gapOk = true;
      let cursor = addDays(prev, 1);
      while (toKey(cursor) !== dateStr) {
        const key = toKey(cursor);
        if (isDueOnDate(habit, cursor) && statusOf(habit, key) !== 'skipped') {
          gapOk = false;
          break;
        }
        cursor = addDays(cursor, 1);
      }
      current = gapOk ? current + 1 : 1;
    } else {
      current = 1;
    }
    best = Math.max(best, current);
    prev = d;
  }
  return best;
}

export function getWeekProgress(habit, referenceDate = new Date()) {
  const start = startOfWeek(referenceDate);
  let done = 0;
  let due = 0;
  for (let i = 0; i < 7; i++) {
    const d = addDays(start, i);
    if (isDueOnDate(habit, d)) {
      const status = statusOf(habit, toKey(d));
      if (status === 'skipped') continue; // excused — excluded from both counts
      due++;
      if (status === 'done') done++;
    }
  }
  return { done, due };
}

export function getCompletionRate(habit, days = 30) {
  let due = 0;
  let done = 0;
  let cursor = new Date();
  for (let i = 0; i < days; i++) {
    if (isDueOnDate(habit, cursor)) {
      const status = statusOf(habit, toKey(cursor));
      if (status !== 'skipped') {
        due++;
        if (status === 'done') done++;
      }
    }
    cursor = addDays(cursor, -1);
  }
  return due === 0 ? 0 : Math.round((done / due) * 100);
}

/**
 * 'avoid' habits don't use the daily completions map at all — every day is
 * automatically a success unless a relapse was logged for it. Streak math
 * is therefore derived purely from `habit.relapses` (and `createdAt` as the
 * starting point), completely separate from the build-habit streak logic
 * above so the two are never mixed together in stats.
 */
function relapseDatesSorted(habit) {
  return (habit.relapses || [])
    .map((r) => new Date(r.date))
    .filter((d) => !Number.isNaN(d.getTime()))
    .sort((a, b) => a - b);
}

/** Whole days elapsed since the most recent relapse (or since creation if none). */
export function getAvoidStreak(habit, referenceDate = new Date()) {
  const dates = relapseDatesSorted(habit);
  const start = dates.length > 0 ? dates[dates.length - 1] : new Date(habit.createdAt || referenceDate);
  const msPerDay = 24 * 60 * 60 * 1000;
  const diff = Math.floor((toDayStart(referenceDate) - toDayStart(start)) / msPerDay);
  return Math.max(0, diff);
}

/** The longest gap (in days) between relapses across the habit's whole history. */
export function getLongestAvoidStreak(habit, referenceDate = new Date()) {
  const dates = relapseDatesSorted(habit);
  const start = new Date(habit.createdAt || referenceDate);
  const msPerDay = 24 * 60 * 60 * 1000;

  const checkpoints = [start, ...dates, referenceDate];
  let longest = 0;
  for (let i = 1; i < checkpoints.length; i++) {
    const gapDays = Math.floor((toDayStart(checkpoints[i]) - toDayStart(checkpoints[i - 1])) / msPerDay);
    longest = Math.max(longest, gapDays);
  }
  return Math.max(0, longest);
}

function toDayStart(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}
