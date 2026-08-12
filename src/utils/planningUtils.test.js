import {
  keyToDate,
  dayDiff,
  pointsProgress,
  isPlanFullyCompleted,
  isDueOnDate,
  isDayCompleted,
  daysUntilDue,
  isPlanOverdue,
  daysUntilPointDue,
  isPointOverdue,
  migratePlanningItem,
} from './planningUtils';

describe('keyToDate', () => {
  test('parses a date key into a local-midnight Date', () => {
    const d = keyToDate('2026-08-01');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(7); // 0-indexed
    expect(d.getDate()).toBe(1);
  });
});

describe('dayDiff', () => {
  test('counts whole days between two keys', () => {
    expect(dayDiff('2026-08-01', '2026-08-05')).toBe(4);
    expect(dayDiff('2026-08-05', '2026-08-01')).toBe(-4);
    expect(dayDiff('2026-08-01', '2026-08-01')).toBe(0);
  });
});

describe('pointsProgress / isPlanFullyCompleted', () => {
  test('counts done vs total points', () => {
    const item = { points: [{ completed: true }, { completed: false }, { completed: true }] };
    expect(pointsProgress(item)).toEqual({ done: 2, total: 3, percent: 67 });
  });

  test('a plan with no points is not "fully completed"', () => {
    expect(isPlanFullyCompleted({ points: [] })).toBe(false);
  });

  test('fully completed once every point is checked', () => {
    const item = { points: [{ completed: true }, { completed: true }] };
    expect(isPlanFullyCompleted(item)).toBe(true);
  });
});

describe('isDueOnDate', () => {
  test('archived items are never due', () => {
    const item = { archived: true, startDate: '2026-08-01', createdAt: '2026-08-01T00:00:00.000Z' };
    expect(isDueOnDate(item, new Date(2026, 7, 1))).toBe(false);
  });

  test('a day explicitly hidden is not due', () => {
    const item = { startDate: '2026-08-01', hiddenDays: { '2026-08-01': true } };
    expect(isDueOnDate(item, new Date(2026, 7, 1))).toBe(false);
  });

  test('due anywhere within [startDate, dueDate], inclusive', () => {
    const item = { startDate: '2026-08-01', dueDate: '2026-08-05' };
    expect(isDueOnDate(item, new Date(2026, 7, 1))).toBe(true); // first day
    expect(isDueOnDate(item, new Date(2026, 7, 3))).toBe(true); // middle
    expect(isDueOnDate(item, new Date(2026, 7, 5))).toBe(true); // last day
    expect(isDueOnDate(item, new Date(2026, 7, 6))).toBe(false); // past the end
    expect(isDueOnDate(item, new Date(2026, 6, 31))).toBe(false); // before start
  });

  test('no dueDate set means it stays due indefinitely after starting', () => {
    const item = { startDate: '2026-08-01' };
    expect(isDueOnDate(item, new Date(2026, 11, 25))).toBe(true);
  });

  test('falls back to createdAt when no startDate is set', () => {
    const item = { createdAt: '2026-08-01T00:00:00.000Z' };
    expect(isDueOnDate(item, new Date(2026, 7, 1))).toBe(true);
    expect(isDueOnDate(item, new Date(2026, 6, 31))).toBe(false);
  });
});

describe('isDayCompleted', () => {
  test('mirrors isPlanFullyCompleted, ignoring the date argument', () => {
    const done = { points: [{ completed: true }] };
    const notDone = { points: [{ completed: true }, { completed: false }] };
    expect(isDayCompleted(done, new Date(2026, 7, 1))).toBe(true);
    expect(isDayCompleted(notDone, new Date(2026, 7, 1))).toBe(false);
  });
});

describe('daysUntilDue / isPlanOverdue', () => {
  test('null when no dueDate is set', () => {
    expect(daysUntilDue({}, new Date(2026, 7, 1))).toBeNull();
    expect(isPlanOverdue({}, new Date(2026, 7, 1))).toBe(false);
  });

  test('positive when due date is in the future, negative once passed', () => {
    const item = { dueDate: '2026-08-10' };
    expect(daysUntilDue(item, new Date(2026, 7, 5))).toBe(5);
    expect(daysUntilDue(item, new Date(2026, 7, 12))).toBe(-2);
  });

  test('overdue only if past due AND not fully completed', () => {
    const incomplete = { dueDate: '2026-08-01', points: [{ completed: false }] };
    const complete = { dueDate: '2026-08-01', points: [{ completed: true }] };
    const today = new Date(2026, 7, 5);
    expect(isPlanOverdue(incomplete, today)).toBe(true);
    expect(isPlanOverdue(complete, today)).toBe(false);
  });
});

describe('daysUntilPointDue / isPointOverdue', () => {
  test('null when the point has no dueDate', () => {
    expect(daysUntilPointDue({})).toBeNull();
    expect(isPointOverdue({})).toBe(false);
  });

  test('overdue only if past due AND not completed', () => {
    const today = new Date(2026, 7, 5);
    expect(isPointOverdue({ dueDate: '2026-08-01', completed: false }, today)).toBe(true);
    expect(isPointOverdue({ dueDate: '2026-08-01', completed: true }, today)).toBe(false);
    expect(isPointOverdue({ dueDate: '2026-08-10', completed: false }, today)).toBe(false);
  });
});

describe('migratePlanningItem', () => {
  test('already-migrated items (with a points array) pass through untouched', () => {
    const item = { id: '1', title: 'x', points: [{ id: 'p1', text: 'a', completed: false }] };
    expect(migratePlanningItem(item)).toBe(item);
  });

  test('a completed daily goal becomes a plan with all points completed on its creation date', () => {
    const legacy = {
      id: '1',
      type: 'daily',
      title: 'Study day',
      createdDate: '2026-08-01',
      subjects: [{ id: 's1', name: 'Math', quantityLabel: '3 lectures' }],
      completedDays: { '2026-08-01': true },
      reminderTime: '18:00',
    };
    const migrated = migratePlanningItem(legacy);
    expect(migrated.points).toHaveLength(1);
    expect(migrated.points[0].completed).toBe(true);
    expect(migrated.points[0].text).toBe('Math \u2014 3 lectures');
    expect(migrated.startDate).toBe('2026-08-01');
    expect(migrated.dueDate).toBe('2026-08-01');
    expect(migrated.reminderAt).toContain('2026-08-01');
  });

  test('an extended plan spreads subject due dates and best-effort completion', () => {
    const legacy = {
      id: '2',
      type: 'extended',
      title: 'Reading plan',
      startDate: '2026-08-01',
      subjects: [
        { id: 's1', name: 'Book A', perDay: '10 pages', days: 2 }, // Aug 1-2
        { id: 's2', name: 'Book B', perDay: '5 pages', days: 5 },  // Aug 1-5
      ],
      completedDays: { '2026-08-01': true, '2026-08-02': true }, // only the first two days done
    };
    const migrated = migratePlanningItem(legacy);
    expect(migrated.points).toHaveLength(2);
    expect(migrated.points[0].dueDate).toBe('2026-08-02');
    expect(migrated.points[0].completed).toBe(true); // both its days were completed
    expect(migrated.points[1].dueDate).toBe('2026-08-05');
    expect(migrated.points[1].completed).toBe(false); // days 3-5 weren't marked done
    expect(migrated.dueDate).toBe('2026-08-05'); // longest subject wins
  });
});
