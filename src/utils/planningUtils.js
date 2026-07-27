import { toKey } from './dateUtils';

/** Parses a 'YYYY-MM-DD' key back into a local-midnight Date. */
export function keyToDate(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Days between two 'YYYY-MM-DD' keys (b - a), as a whole number. */
function dayDiff(aKey, bKey) {
  const MS_PER_DAY = 86400000;
  return Math.round((keyToDate(bKey) - keyToDate(aKey)) / MS_PER_DAY);
}

/**
 * Total length of an extended plan = the longest `days` value among its
 * subjects (each subject may run for a different number of days).
 * Daily goals are always exactly 1 day.
 */
export function maxDuration(item) {
  if (item.type !== 'extended') return 1;
  return (item.subjects || []).reduce((max, s) => Math.max(max, Number(s.days) || 0), 0) || 1;
}

export function planStartKey(item) {
  return item.type === 'extended' ? item.startDate || item.createdDate : item.createdDate;
}

export function planEndKey(item) {
  const start = planStartKey(item);
  return toKey(new Date(keyToDate(start).getTime() + (maxDuration(item) - 1) * 86400000));
}

/** Whether a Planning item should show up on the Today screen for `date`. */
export function isDueOnDate(item, date) {
  const key = toKey(date);
  if (item.archived) return false;
  if (item.hiddenDays?.[key]) return false;

  if (item.type === 'daily') return item.createdDate === key;

  const startKey = planStartKey(item);
  const endKey = planEndKey(item);
  return key >= startKey && key <= endKey;
}

/** For an extended plan, only the subjects still "running" on `date`. */
export function activeSubjectsOnDate(item, date) {
  if (item.type !== 'extended') return item.subjects || [];
  const key = toKey(date);
  const startKey = planStartKey(item);
  const dayIndex = dayDiff(startKey, key);
  return (item.subjects || []).filter((s) => dayIndex >= 0 && dayIndex < (Number(s.days) || 0));
}

export function completedDaysCount(item) {
  return Object.keys(item.completedDays || {}).length;
}

export function totalDaysCount(item) {
  return maxDuration(item);
}

export function isDayCompleted(item, date) {
  return !!item.completedDays?.[toKey(date)];
}
