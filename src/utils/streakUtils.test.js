import {
  isDueOnDate,
  statusOf,
  getCurrentStreak,
  getBestStreak,
  getWeekProgress,
  getCompletionRate,
  getAvoidStreak,
  getLongestAvoidStreak,
} from './streakUtils';

// "Today" is frozen at Saturday 2026-08-01 so streak math is deterministic.
const TODAY = new Date(2026, 7, 1, 10, 0, 0);

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(TODAY);
});

afterEach(() => {
  jest.useRealTimers();
});

describe('isDueOnDate', () => {
  test('daily habits are due every day', () => {
    expect(isDueOnDate({ frequency: 'daily' }, new Date(2026, 0, 1))).toBe(true);
  });
  test('specific_days habits are only due on listed weekdays', () => {
    const habit = { frequency: 'specific_days', specificDays: [1, 3, 5] }; // Mon/Wed/Fri
    expect(isDueOnDate(habit, new Date(2026, 7, 3))).toBe(true); // Monday
    expect(isDueOnDate(habit, new Date(2026, 7, 4))).toBe(false); // Tuesday
  });
});

describe('statusOf', () => {
  test('returns done for a truthy completion', () => {
    const habit = { completions: { '2026-08-01': true } };
    expect(statusOf(habit, '2026-08-01')).toBe('done');
  });
  test('returns skipped for an excused day', () => {
    const habit = { completions: { '2026-08-01': 'skipped' } };
    expect(statusOf(habit, '2026-08-01')).toBe('skipped');
  });
  test('returns null when there is no entry', () => {
    expect(statusOf({ completions: {} }, '2026-08-01')).toBe(null);
  });
});

describe('getCurrentStreak', () => {
  test('counts consecutive done days ending yesterday when today is untouched', () => {
    const habit = {
      frequency: 'daily',
      completions: {
        '2026-07-30': true,
        '2026-07-31': true,
        // 2026-08-01 (today) has no entry yet — should not break the streak
      },
    };
    expect(getCurrentStreak(habit)).toBe(2);
  });

  test('includes today when already marked done', () => {
    const habit = {
      frequency: 'daily',
      completions: {
        '2026-07-31': true,
        '2026-08-01': true,
      },
    };
    expect(getCurrentStreak(habit)).toBe(2);
  });

  test('a skipped day keeps the streak alive without incrementing it', () => {
    const habit = {
      frequency: 'daily',
      completions: {
        '2026-07-29': true,
        '2026-07-30': 'skipped',
        '2026-07-31': true,
      },
    };
    expect(getCurrentStreak(habit)).toBe(2);
  });

  test('a missed due day breaks the streak', () => {
    const habit = {
      frequency: 'daily',
      completions: {
        '2026-07-28': true,
        // 2026-07-29 through 2026-07-31 missing
      },
    };
    expect(getCurrentStreak(habit)).toBe(0);
  });

  test('specific_days habits only count due days toward the streak', () => {
    // Habit due Mon/Wed/Fri. Today (Sat) and yesterday (Fri) are the recent due days.
    const habit = {
      frequency: 'specific_days',
      specificDays: [1, 3, 5],
      completions: {
        '2026-07-31': true, // Friday
        '2026-07-29': true, // Wednesday
        '2026-07-27': true, // Monday
      },
    };
    expect(getCurrentStreak(habit)).toBe(3);
  });
});

describe('getBestStreak', () => {
  test('finds the longest run of done days in history', () => {
    const habit = {
      frequency: 'daily',
      completions: {
        '2026-07-01': true,
        '2026-07-02': true,
        '2026-07-03': true,
        '2026-07-10': true, // isolated day, gap before it
        '2026-07-20': true,
        '2026-07-21': true,
      },
    };
    expect(getBestStreak(habit)).toBe(3);
  });

  test('returns 0 when nothing has ever been completed', () => {
    expect(getBestStreak({ completions: {} })).toBe(0);
  });

  test('a skipped gap does not break the streak', () => {
    const habit = {
      frequency: 'daily',
      completions: {
        '2026-07-01': true,
        '2026-07-02': 'skipped',
        '2026-07-03': true,
      },
    };
    expect(getBestStreak(habit)).toBe(2);
  });
});

describe('getWeekProgress', () => {
  test('counts done vs due days in the current week, excluding skipped', () => {
    // Week of 2026-08-01 (Sat) starts Monday 2026-07-27.
    const habit = {
      frequency: 'daily',
      completions: {
        '2026-07-27': true,
        '2026-07-28': true,
        '2026-07-29': 'skipped',
        '2026-07-30': true,
      },
    };
    const { done, due } = getWeekProgress(habit, TODAY);
    expect(done).toBe(3);
    expect(due).toBe(6); // 7 days minus the 1 skipped/excused day
  });
});

describe('getCompletionRate', () => {
  test('returns a percentage rounded to the nearest integer', () => {
    const habit = {
      frequency: 'daily',
      completions: {
        '2026-08-01': true,
        '2026-07-31': true,
        '2026-07-30': false,
      },
    };
    expect(getCompletionRate(habit, 3)).toBe(67); // 2 of 3 due days done
  });

  test('returns 0 when there are no due days in the window', () => {
    const habit = { frequency: 'specific_days', specificDays: [], completions: {} };
    expect(getCompletionRate(habit, 5)).toBe(0);
  });
});

describe('getAvoidStreak', () => {
  test('counts whole days since the last relapse', () => {
    const habit = { relapses: [{ date: '2026-07-28T12:00:00' }] };
    expect(getAvoidStreak(habit, TODAY)).toBe(4);
  });

  test('falls back to createdAt when there are no relapses', () => {
    const habit = { createdAt: '2026-07-25T00:00:00' };
    expect(getAvoidStreak(habit, TODAY)).toBe(7);
  });
});

describe('getLongestAvoidStreak', () => {
  test('finds the biggest gap between relapses', () => {
    const habit = {
      createdAt: '2026-07-01T00:00:00',
      relapses: [
        { date: '2026-07-05T00:00:00' }, // 4-day gap from start
        { date: '2026-07-20T00:00:00' }, // 15-day gap from previous relapse
      ],
    };
    expect(getLongestAvoidStreak(habit, TODAY)).toBe(15);
  });
});
