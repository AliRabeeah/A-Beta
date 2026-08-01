import { pad, toKey, calendarDaysBetween, addDays, isSameDay, startOfWeek, getMonthMatrix } from './dateUtils';

describe('pad', () => {
  test('pads single digits with a leading zero', () => {
    expect(pad(5)).toBe('05');
  });
  test('leaves two-digit numbers unchanged', () => {
    expect(pad(12)).toBe('12');
  });
});

describe('toKey', () => {
  test('formats a date as YYYY-MM-DD', () => {
    expect(toKey(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('calendarDaysBetween', () => {
  test('is 0 for the same calendar day, even with different times', () => {
    const morning = new Date(2026, 6, 1, 0, 5);
    const night = new Date(2026, 6, 1, 23, 55);
    expect(calendarDaysBetween(morning, night)).toBe(0);
  });
  test('counts a crossed midnight as 1 day, regardless of elapsed hours', () => {
    const lateNight = new Date(2026, 6, 1, 23, 58);
    const justAfterMidnight = new Date(2026, 6, 2, 0, 2);
    expect(calendarDaysBetween(lateNight, justAfterMidnight)).toBe(1);
  });
});

describe('addDays', () => {
  test('adds positive days', () => {
    expect(toKey(addDays(new Date(2026, 0, 30), 3))).toBe('2026-02-02');
  });
  test('subtracts with negative days', () => {
    expect(toKey(addDays(new Date(2026, 0, 1), -1))).toBe('2025-12-31');
  });
});

describe('isSameDay', () => {
  test('true for same calendar day', () => {
    expect(isSameDay(new Date(2026, 0, 1, 1), new Date(2026, 0, 1, 23))).toBe(true);
  });
  test('false for different days', () => {
    expect(isSameDay(new Date(2026, 0, 1), new Date(2026, 0, 2))).toBe(false);
  });
});

describe('startOfWeek', () => {
  test('returns the Monday of the given week', () => {
    // 2026-08-01 is a Saturday
    const monday = startOfWeek(new Date(2026, 7, 1));
    expect(toKey(monday)).toBe('2026-07-27');
  });
  test('a Monday maps to itself', () => {
    const monday = new Date(2026, 6, 27);
    expect(toKey(startOfWeek(monday))).toBe('2026-07-27');
  });
});

describe('getMonthMatrix', () => {
  test('every week row has 7 cells', () => {
    const weeks = getMonthMatrix(2026, 0); // January 2026
    weeks.forEach((week) => expect(week).toHaveLength(7));
  });
  test('contains every day of the month exactly once', () => {
    const weeks = getMonthMatrix(2026, 1); // February 2026 (28 days)
    const days = weeks.flat().filter(Boolean).map((d) => d.getDate());
    expect(days).toEqual(Array.from({ length: 28 }, (_, i) => i + 1));
  });
});
