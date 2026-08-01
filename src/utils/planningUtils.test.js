import {
  keyToDate,
  maxDuration,
  planStartKey,
  planEndKey,
  isDueOnDate,
  activeSubjectsOnDate,
  completedDaysCount,
  totalDaysCount,
  isDayCompleted,
} from './planningUtils';

describe('keyToDate', () => {
  test('parses a date key into a local-midnight Date', () => {
    const d = keyToDate('2026-08-01');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(7); // 0-indexed
    expect(d.getDate()).toBe(1);
  });
});

describe('maxDuration', () => {
  test('daily items are always 1 day', () => {
    expect(maxDuration({ type: 'daily' })).toBe(1);
  });

  test('extended items use the longest subject duration', () => {
    const item = { type: 'extended', subjects: [{ days: 10 }, { days: 25 }, { days: 5 }] };
    expect(maxDuration(item)).toBe(25);
  });

  test('extended items with no subjects fall back to 1', () => {
    expect(maxDuration({ type: 'extended', subjects: [] })).toBe(1);
  });
});

describe('planStartKey / planEndKey', () => {
  test('daily item start/end is its creation date', () => {
    const item = { type: 'daily', createdDate: '2026-08-01' };
    expect(planStartKey(item)).toBe('2026-08-01');
    expect(planEndKey(item)).toBe('2026-08-01');
  });

  test('extended item spans from startDate for (maxDuration - 1) more days', () => {
    const item = { type: 'extended', startDate: '2026-08-01', subjects: [{ days: 5 }] };
    expect(planStartKey(item)).toBe('2026-08-01');
    expect(planEndKey(item)).toBe('2026-08-05');
  });

  test('extended item without startDate falls back to createdDate', () => {
    const item = { type: 'extended', createdDate: '2026-08-01', subjects: [{ days: 3 }] };
    expect(planStartKey(item)).toBe('2026-08-01');
    expect(planEndKey(item)).toBe('2026-08-03');
  });
});

describe('isDueOnDate', () => {
  test('archived items are never due', () => {
    const item = { type: 'daily', createdDate: '2026-08-01', archived: true };
    expect(isDueOnDate(item, new Date(2026, 7, 1))).toBe(false);
  });

  test('a day explicitly hidden is not due', () => {
    const item = { type: 'daily', createdDate: '2026-08-01', hiddenDays: { '2026-08-01': true } };
    expect(isDueOnDate(item, new Date(2026, 7, 1))).toBe(false);
  });

  test('daily items are due only on their exact creation date', () => {
    const item = { type: 'daily', createdDate: '2026-08-01' };
    expect(isDueOnDate(item, new Date(2026, 7, 1))).toBe(true);
    expect(isDueOnDate(item, new Date(2026, 7, 2))).toBe(false);
  });

  test('extended items are due anywhere within their date range, inclusive', () => {
    const item = { type: 'extended', startDate: '2026-08-01', subjects: [{ days: 5 }] };
    expect(isDueOnDate(item, new Date(2026, 7, 1))).toBe(true); // first day
    expect(isDueOnDate(item, new Date(2026, 7, 3))).toBe(true); // middle
    expect(isDueOnDate(item, new Date(2026, 7, 5))).toBe(true); // last day
    expect(isDueOnDate(item, new Date(2026, 7, 6))).toBe(false); // past the end
  });
});

describe('activeSubjectsOnDate', () => {
  test('non-extended items return all their subjects unfiltered', () => {
    const item = { type: 'daily', subjects: [{ id: 1 }] };
    expect(activeSubjectsOnDate(item, new Date(2026, 7, 1))).toEqual([{ id: 1 }]);
  });

  test('only subjects still running on that day are returned', () => {
    const item = {
      type: 'extended',
      startDate: '2026-08-01',
      subjects: [
        { id: 'short', days: 2 }, // runs day 0-1 (Aug 1-2)
        { id: 'long', days: 5 },  // runs day 0-4 (Aug 1-5)
      ],
    };
    const day1 = activeSubjectsOnDate(item, new Date(2026, 7, 1));
    expect(day1.map((s) => s.id)).toEqual(['short', 'long']);

    const day3 = activeSubjectsOnDate(item, new Date(2026, 7, 3));
    expect(day3.map((s) => s.id)).toEqual(['long']); // 'short' already finished
  });
});

describe('completedDaysCount / totalDaysCount', () => {
  test('counts keys in completedDays', () => {
    const item = { completedDays: { '2026-08-01': true, '2026-08-02': true } };
    expect(completedDaysCount(item)).toBe(2);
  });

  test('totalDaysCount mirrors maxDuration', () => {
    const item = { type: 'extended', subjects: [{ days: 9 }] };
    expect(totalDaysCount(item)).toBe(9);
  });
});

describe('isDayCompleted', () => {
  test('true only when that exact day key is marked complete', () => {
    const item = { completedDays: { '2026-08-01': true } };
    expect(isDayCompleted(item, new Date(2026, 7, 1))).toBe(true);
    expect(isDayCompleted(item, new Date(2026, 7, 2))).toBe(false);
  });
});
