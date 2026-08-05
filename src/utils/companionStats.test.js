import { computeTotalXP, levelForXP, levelProgress, stageForLevel, moodFromActivity, computeCompanionState } from './companionStats';
import { toKey } from './dateUtils';

describe('computeTotalXP', () => {
  test('counts done habit completions, completed tasks, milestones, and finished challenges', () => {
    const habits = [
      { completions: { '2026-01-01': 'done', '2026-01-02': 'done', '2026-01-03': 'skipped' } },
      { completions: { '2026-01-01': true } }, // legacy boolean format still counts
    ];
    const tasks = [{ completed: true }, { completed: false }, { completed: true }];
    const challenges = [
      { status: 'active', milestones: [{ achieved: true }, { achieved: false }] },
      { status: 'completed', milestones: [{ achieved: true }] },
    ];

    // habits: 3 done (2 + 1) * 1 = 3
    // tasks: 2 completed * 2 = 4
    // milestones: 2 achieved * 5 = 10
    // completed challenge bonus: 1 * 10 = 10
    expect(computeTotalXP({ habits, tasks, challenges })).toBe(3 + 4 + 10 + 10);
  });

  test('returns 0 for no activity', () => {
    expect(computeTotalXP({ habits: [], tasks: [], challenges: [] })).toBe(0);
  });
});

describe('levelForXP / levelProgress', () => {
  test('starts at level 1 with 0 xp', () => {
    expect(levelForXP(0)).toBe(1);
  });

  test('levels up at each threshold', () => {
    expect(levelForXP(9)).toBe(1);
    expect(levelForXP(10)).toBe(2);
    expect(levelForXP(24)).toBe(2);
    expect(levelForXP(25)).toBe(3);
  });

  test('levelProgress ratio is between 0 and 1 and increases with xp', () => {
    const low = levelProgress(11);
    const high = levelProgress(23);
    expect(low.level).toBe(2);
    expect(high.level).toBe(2);
    expect(low.ratio).toBeGreaterThanOrEqual(0);
    expect(high.ratio).toBeGreaterThan(low.ratio);
    expect(high.ratio).toBeLessThanOrEqual(1);
  });

  test('never throws for very large xp (beyond the tracked thresholds)', () => {
    expect(() => levelProgress(1_000_000)).not.toThrow();
    const result = levelProgress(1_000_000);
    expect(result.ratio).toBe(1);
    expect(result.nextLevelXP).toBeNull();
  });
});

describe('stageForLevel', () => {
  test('grows every 2 levels and caps at 6', () => {
    expect(stageForLevel(1)).toBe(1);
    expect(stageForLevel(2)).toBe(1);
    expect(stageForLevel(3)).toBe(2);
    expect(stageForLevel(11)).toBe(6);
    expect(stageForLevel(50)).toBe(6);
  });
});

describe('moodFromActivity', () => {
  test('"new" when there is no activity at all', () => {
    expect(moodFromActivity({ habits: [], tasks: [] })).toBe('new');
  });

  test('"happy" when something was done today', () => {
    const todayKey = toKey(new Date());
    const habits = [{ completions: { [todayKey]: 'done' } }];
    expect(moodFromActivity({ habits, tasks: [] })).toBe('happy');
  });

  test('"sleepy" after a multi-day gap', () => {
    const oldKey = toKey(new Date('2020-01-01'));
    const habits = [{ completions: { [oldKey]: 'done' } }];
    expect(moodFromActivity({ habits, tasks: [] })).toBe('sleepy');
  });
});

describe('computeCompanionState', () => {
  test('combines xp, level, stage, and mood into one object', () => {
    const state = computeCompanionState({ habits: [], tasks: [], challenges: [] });
    expect(state).toMatchObject({ xp: 0, level: 1, stage: 1, mood: 'new' });
    expect(typeof state.ratio).toBe('number');
  });
});
