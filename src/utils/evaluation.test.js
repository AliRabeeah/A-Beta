import { evaluateNumeric, evaluateTimer, evaluateChecklist, defaultHabitFieldsForType } from './evaluation';

describe('evaluateNumeric', () => {
  test('atleast (default): succeeds when value meets or exceeds the goal', () => {
    const habit = { numericGoal: 8 };
    expect(evaluateNumeric(habit, 8)).toBe(true);
    expect(evaluateNumeric(habit, 9)).toBe(true);
    expect(evaluateNumeric(habit, 7)).toBe(false);
  });

  test('lessthan: succeeds only when strictly under the goal', () => {
    const habit = { numericGoal: 5, numericComparator: 'lessthan' };
    expect(evaluateNumeric(habit, 4)).toBe(true);
    expect(evaluateNumeric(habit, 5)).toBe(false);
  });

  test('any: succeeds with any value above zero, regardless of goal', () => {
    const habit = { numericGoal: 100, numericComparator: 'any' };
    expect(evaluateNumeric(habit, 1)).toBe(true);
    expect(evaluateNumeric(habit, 0)).toBe(false);
  });

  test('a missing/invalid goal is treated as 0', () => {
    const habit = {};
    expect(evaluateNumeric(habit, 0)).toBe(true); // 0 >= 0
  });
});

describe('evaluateTimer', () => {
  test('atleast (default): converts goal minutes to seconds', () => {
    const habit = { timerGoalMinutes: 1 };
    expect(evaluateTimer(habit, 60)).toBe(true);
    expect(evaluateTimer(habit, 59)).toBe(false);
  });

  test('lessthan: succeeds only when strictly under the goal in seconds', () => {
    const habit = { timerGoalMinutes: 1, timerComparator: 'lessthan' };
    expect(evaluateTimer(habit, 59)).toBe(true);
    expect(evaluateTimer(habit, 60)).toBe(false);
  });

  test('any: succeeds with any logged time above zero', () => {
    const habit = { timerGoalMinutes: 30, timerComparator: 'any' };
    expect(evaluateTimer(habit, 1)).toBe(true);
    expect(evaluateTimer(habit, 0)).toBe(false);
  });
});

describe('evaluateChecklist', () => {
  test('fails when the habit has no checklist items at all', () => {
    expect(evaluateChecklist({ checklistItems: [] }, { a: true })).toBe(false);
  });

  test('default mode: succeeds only when every item is checked', () => {
    const habit = { checklistItems: [{ id: 'a' }, { id: 'b' }] };
    expect(evaluateChecklist(habit, { a: true, b: true })).toBe(true);
    expect(evaluateChecklist(habit, { a: true, b: false })).toBe(false);
    expect(evaluateChecklist(habit, {})).toBe(false);
  });

  test('custom mode: succeeds when all required ids are checked, extras ignored', () => {
    const habit = {
      checklistItems: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
      checklistSuccessCondition: 'custom',
      checklistRequiredIds: ['a', 'b'],
    };
    expect(evaluateChecklist(habit, { a: true, b: true })).toBe(true);
    expect(evaluateChecklist(habit, { a: true, b: true, c: false })).toBe(true);
    expect(evaluateChecklist(habit, { a: true })).toBe(false);
  });

  test('custom mode with no required ids configured always fails', () => {
    const habit = {
      checklistItems: [{ id: 'a' }],
      checklistSuccessCondition: 'custom',
      checklistRequiredIds: [],
    };
    expect(evaluateChecklist(habit, { a: true })).toBe(false);
  });
});

describe('defaultHabitFieldsForType', () => {
  test('numeric type gets sensible defaults', () => {
    expect(defaultHabitFieldsForType('numeric')).toEqual({
      numericGoal: 8,
      numericUnit: '',
      numericComparator: 'atleast',
    });
  });

  test('timer type gets sensible defaults', () => {
    expect(defaultHabitFieldsForType('timer')).toEqual({
      timerGoalMinutes: 30,
      timerComparator: 'atleast',
    });
  });

  test('checklist type gets an empty item list', () => {
    expect(defaultHabitFieldsForType('checklist')).toEqual({
      checklistItems: [],
      checklistSuccessCondition: 'all',
      checklistRequiredIds: [],
    });
  });

  test('yesno / unknown types get no extra fields', () => {
    expect(defaultHabitFieldsForType('yesno')).toEqual({});
    expect(defaultHabitFieldsForType(undefined)).toEqual({});
  });
});
