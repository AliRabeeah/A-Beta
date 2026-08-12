import { toKey } from '/home/claude/project/A-Beta-main/src/utils/dateUtils.js.compiled';

/** Parses a 'YYYY-MM-DD' key back into a local-midnight Date. */
export function keyToDate(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Whole-day difference between two 'YYYY-MM-DD' keys (b - a). */
export function dayDiff(aKey, bKey) {
  const MS_PER_DAY = 86400000;
  return Math.round((keyToDate(bKey) - keyToDate(aKey)) / MS_PER_DAY);
}

/**
 * A plan is a free-form outline: a title, an optional description ("what I
 * want to do"), an optional overall period (startDate/dueDate), and a list
 * of points — each one its own bit of text, with its own optional due date
 * and its own completed flag.
 *
 * Progress across a whole plan = completed points / total points.
 */
export function pointsProgress(item) {
  const points = item.points || [];
  const total = points.length;
  const done = points.filter(p => p.completed).length;
  const percent = total ? Math.round(done / total * 100) : 0;
  return {
    done,
    total,
    percent
  };
}
export function isPlanFullyCompleted(item) {
  const {
    total,
    done
  } = pointsProgress(item);
  return total > 0 && done === total;
}

/** Whether a Planning item should show up on the Today/Agenda screens for `date`. */
export function isDueOnDate(item, date) {
  const key = toKey(date);
  if (item.archived) return false;
  if (item.hiddenDays?.[key]) return false;
  const start = item.startDate || toKey(new Date(item.createdAt || Date.now()));
  if (key < start) return false;
  if (item.dueDate && key > item.dueDate) return false;
  return true;
}

/** `true` once every point is checked off — ignores the `date` argument;
 *  kept so existing call sites that pass a date keep working unchanged. */
export function isDayCompleted(item /* , date */) {
  return isPlanFullyCompleted(item);
}

/** Days remaining until a plan's due date (negative once overdue). `null` if no due date is set. */
export function daysUntilDue(item, today = new Date()) {
  if (!item.dueDate) return null;
  return dayDiff(toKey(today), item.dueDate);
}
export function isPlanOverdue(item, today = new Date()) {
  const remaining = daysUntilDue(item, today);
  return remaining !== null && remaining < 0 && !isPlanFullyCompleted(item);
}

/** Days remaining until a single point's own due date. `null` if it has none. */
export function daysUntilPointDue(point, today = new Date()) {
  if (!point.dueDate) return null;
  return dayDiff(toKey(today), point.dueDate);
}
export function isPointOverdue(point, today = new Date()) {
  const remaining = daysUntilPointDue(point, today);
  return remaining !== null && remaining < 0 && !point.completed;
}
let pointIdSeed = 0;
export function makePointId() {
  pointIdSeed += 1;
  return `pt_${Date.now()}_${pointIdSeed}`;
}
export function emptyPoint() {
  return {
    id: makePointId(),
    text: '',
    dueDate: null,
    completed: false,
    completedAt: null
  };
}

/**
 * One-time migration from the old "daily goal / extended plan (subjects)"
 * model to the new free-form points model. Leaves already-migrated items
 * (anything that already has a `points` array) untouched.
 *
 * - daily: each subject becomes a point; the plan's single completedDays
 *   flag applied to the whole day, so it applies to every point at once.
 *   dueDate = the day it was created (its only occurrence).
 * - extended: each subject becomes a point whose own dueDate is the last
 *   day that subject was scheduled to run; a point is only carried over
 *   as completed if every day in that subject's run was marked done in
 *   the old per-day completedDays map (best-effort — the old model never
 *   tracked completion per-subject, only per-day-for-the-whole-plan).
 */
export function migratePlanningItem(item) {
  if (item.points) return item; // already on the new model

  const createdAt = item.createdAt || new Date(`${item.createdDate || item.startDate || toKey(new Date())}T00:00:00`).toISOString();
  if (item.type === 'daily') {
    const dayKey = item.createdDate || toKey(new Date(createdAt));
    const wasCompleted = !!item.completedDays?.[dayKey];
    const points = (item.subjects || []).map(s => ({
      id: s.id || makePointId(),
      text: [s.name, s.quantityLabel].filter(Boolean).join(' \u2014 '),
      dueDate: dayKey,
      completed: wasCompleted,
      completedAt: wasCompleted ? createdAt : null
    }));
    return {
      id: item.id,
      title: item.title,
      description: '',
      startDate: dayKey,
      dueDate: dayKey,
      reminderAt: item.reminderTime ? new Date(`${dayKey}T${item.reminderTime}:00`).toISOString() : null,
      reminderId: item.reminderId || null,
      archived: !!item.archived,
      hiddenDays: item.hiddenDays || {},
      createdAt,
      points
    };
  }

  // extended
  const startKey = item.startDate || item.createdDate || toKey(new Date(createdAt));
  let latestDue = startKey;
  const points = (item.subjects || []).map(s => {
    const days = Number(s.days) || 0;
    const subjectDueKey = toKey(new Date(keyToDate(startKey).getTime() + Math.max(0, days - 1) * 86400000));
    if (subjectDueKey > latestDue) latestDue = subjectDueKey;

    // Best-effort completion: every day this subject ran must be marked
    // done in the old per-day map for the point to carry over as completed.
    let allDaysDone = days > 0;
    for (let i = 0; i < days; i++) {
      const dKey = toKey(new Date(keyToDate(startKey).getTime() + i * 86400000));
      if (!item.completedDays?.[dKey]) {
        allDaysDone = false;
        break;
      }
    }
    return {
      id: s.id || makePointId(),
      text: [s.name, s.perDay].filter(Boolean).join(' \u2014 '),
      dueDate: days > 0 ? subjectDueKey : null,
      completed: allDaysDone,
      completedAt: null
    };
  });
  return {
    id: item.id,
    title: item.title,
    description: '',
    startDate: startKey,
    dueDate: latestDue,
    reminderAt: null,
    reminderId: null,
    archived: !!item.archived,
    hiddenDays: item.hiddenDays || {},
    createdAt,
    points
  };
}