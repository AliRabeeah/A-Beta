/**
 * Habits can be evaluated four ways:
 *  - 'yesno'     : plain Done/Skip (original behavior)
 *  - 'numeric'   : a number logged toward a daily goal (e.g. glasses of water)
 *  - 'timer'     : time logged toward a daily goal
 *  - 'checklist' : a set of sub-items checked off
 *
 * For numeric/timer/checklist habits, the raw daily input is stored
 * separately (habit.values / habit.checklist) and these functions
 * derive whether that counts as a successful day, which then gets
 * written into the same `completions[dateKey] = 'done'` field used
 * everywhere else (streaks, calendar, widget, stats) — so none of
 * that logic needs to know about evaluation types at all.
 */

export function evaluateNumeric(habit, value) {
  const goal = Number(habit.numericGoal) || 0;
  const comparator = habit.numericComparator || 'atleast';
  if (comparator === 'any') return value > 0;
  if (comparator === 'lessthan') return value < goal;
  return value >= goal; // 'atleast'
}

export function evaluateTimer(habit, seconds) {
  const goalSeconds = (Number(habit.timerGoalMinutes) || 0) * 60;
  const comparator = habit.timerComparator || 'atleast';
  if (comparator === 'any') return seconds > 0;
  if (comparator === 'lessthan') return seconds < goalSeconds;
  return seconds >= goalSeconds; // 'atleast'
}

export function evaluateChecklist(habit, checklistState) {
  const items = habit.checklistItems || [];
  if (items.length === 0) return false;
  const state = checklistState || {};

  if (habit.checklistSuccessCondition === 'custom') {
    const required = habit.checklistRequiredIds || [];
    if (required.length === 0) return false;
    return required.every((id) => state[id] === true);
  }
  // default: all items required
  return items.every((item) => state[item.id] === true);
}

export function defaultHabitFieldsForType(evaluationType) {
  switch (evaluationType) {
    case 'numeric':
      return { numericGoal: 8, numericUnit: '', numericComparator: 'atleast' };
    case 'timer':
      return { timerGoalMinutes: 30, timerComparator: 'atleast' };
    case 'checklist':
      return { checklistItems: [], checklistSuccessCondition: 'all', checklistRequiredIds: [] };
    default:
      return {};
  }
}
