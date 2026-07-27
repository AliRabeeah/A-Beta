import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { toKey, calendarDaysBetween } from '../utils/dateUtils';
import { scheduleReminder, cancelReminder } from '../utils/notifications';

const STORAGE_KEY = 'a_challenges_v1';

// Preset challenge templates
export const PRESET_CHALLENGES = [
  {
    id: 'preset_sugar_free',
    name: '30 Days Sugar-Free',
    icon: '🍬',
    description: 'Cut out all added sugars and refined carbohydrates.',
    durationDays: 30,
    defaultMetrics: { unit: 'calories', valuePerDay: 200 },
    defaultReminders: ['20:00'],
  },
  {
    id: 'preset_sleep_reset',
    name: '7-Day Sleep Reset',
    icon: '😴',
    description: 'Establish a consistent sleep schedule and improve sleep quality.',
    durationDays: 7,
    defaultMetrics: { unit: 'hours', valuePerDay: 8 },
    defaultReminders: ['22:00'],
  },
  {
    id: 'preset_no_junk_food',
    name: '21-Day No Fast Food',
    icon: '🍔',
    description: 'Eliminate fast food and processed meals from your diet.',
    durationDays: 21,
    defaultMetrics: { unit: 'meals', valuePerDay: 1 },
    defaultReminders: ['12:00', '18:00'],
  },
  {
    id: 'preset_digital_detox',
    name: '14-Day Digital Detox',
    icon: '📱',
    description: 'Reduce screen time and social media usage.',
    durationDays: 14,
    defaultMetrics: { unit: 'hours', valuePerDay: 2 },
    defaultReminders: ['21:00'],
  },
  {
    id: 'preset_daily_reading',
    name: '30-Day Daily Reading',
    icon: '📚',
    description: 'Read for at least 30 minutes every day.',
    durationDays: 30,
    defaultMetrics: { unit: 'minutes', valuePerDay: 30 },
    defaultReminders: ['19:00'],
  },
  {
    id: 'preset_exercise',
    name: '30-Day Exercise Habit',
    icon: '💪',
    description: 'Exercise for at least 30 minutes every day.',
    durationDays: 30,
    defaultMetrics: { unit: 'minutes', valuePerDay: 30 },
    defaultReminders: ['07:00'],
  },
  {
    id: 'preset_meditation',
    name: '21-Day Meditation',
    icon: '🧘',
    description: 'Meditate for 10 minutes every day.',
    durationDays: 21,
    defaultMetrics: { unit: 'minutes', valuePerDay: 10 },
    defaultReminders: ['06:00'],
  },
  {
    id: 'preset_water_intake',
    name: '30-Day Hydration Challenge',
    icon: '💧',
    description: 'Drink 8 glasses of water daily.',
    durationDays: 30,
    defaultMetrics: { unit: 'glasses', valuePerDay: 8 },
    defaultReminders: ['09:00', '12:00', '15:00', '18:00'],
  },
];

// Badge definitions
export const BADGES = {
  badge_3d: { id: 'badge_3d', name: '3-Day Starter', icon: '🌱', day: 3 },
  badge_7d: { id: 'badge_7d', name: '1-Week Warrior', icon: '⚔️', day: 7 },
  badge_14d: { id: 'badge_14d', name: 'Fortnight Fighter', icon: '🛡️', day: 14 },
  badge_30d: { id: 'badge_30d', name: 'Month Master', icon: '👑', day: 30 },
  badge_complete: { id: 'badge_complete', name: 'Challenge Complete', icon: '🏆', day: -1 },
};

// Default milestones for new challenges
export const DEFAULT_MILESTONES = [
  { day: 3, badgeId: 'badge_3d', achieved: false },
  { day: 7, badgeId: 'badge_7d', achieved: false },
  { day: 14, badgeId: 'badge_14d', achieved: false },
  { day: 30, badgeId: 'badge_30d', achieved: false },
];

const ChallengeContext = createContext(null);

export function ChallengeProvider({ children }) {
  const [challenges, setChallenges] = useState([]);
  const [badges, setBadges] = useState([]); // Array of earned badge IDs
  const [loaded, setLoaded] = useState(false);

  // Load challenges and badges from AsyncStorage
  useEffect(() => {
    (async () => {
      try {
        const [challengesData, badgesData] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY),
          AsyncStorage.getItem('a_badges_v1'),
        ]);
        if (challengesData) setChallenges(JSON.parse(challengesData));
        if (badgesData) setBadges(JSON.parse(badgesData));
      } catch (error) {
        console.error('Error loading challenges:', error);
      }
      setLoaded(true);
    })();
  }, []);

  const persist = useCallback(async (nextChallenges) => {
    setChallenges(nextChallenges);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextChallenges));
  }, []);

  const persistBadges = useCallback(async (nextBadges) => {
    setBadges(nextBadges);
    await AsyncStorage.setItem('a_badges_v1', JSON.stringify(nextBadges));
  }, []);

  /**
   * Creates a new challenge from a preset or custom configuration.
   */
  const addChallenge = useCallback(
    async (challengeData) => {
      let reminderIds = [];
      if (challengeData.reminders && challengeData.reminders.length > 0) {
        reminderIds = await Promise.all(
          challengeData.reminders.map((time) =>
            scheduleReminder({
              ...challengeData,
              reminderTime: time,
              isChallenge: true,
            })
          )
        );
      }

      const startDate = new Date(challengeData.startDate || new Date());
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + (challengeData.durationDays || 30));

      const newChallenge = {
        id: Date.now().toString(),
        type: 'custom',
        completions: {},
        slips: [],
        status: 'active',
        reminderIds,
        archived: false,
        createdAt: new Date().toISOString(),
        ...challengeData,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        milestones: challengeData.milestones || DEFAULT_MILESTONES,
      };

      await persist([...challenges, newChallenge]);
      return newChallenge;
    },
    [challenges, persist]
  );

  /**
   * Updates an existing challenge.
   */
  const updateChallenge = useCallback(
    async (id, updates) => {
      const existing = challenges.find((c) => c.id === id);
      if (!existing) return;

      // Handle reminder rescheduling
      let reminderIds = existing.reminderIds || [];
      if (updates.reminders && updates.reminders !== existing.reminders) {
        // Cancel old reminders
        if (existing.reminderIds) {
          await Promise.all(existing.reminderIds.map((rid) => cancelReminder(rid)));
        }
        // Schedule new reminders
        reminderIds = await Promise.all(
          updates.reminders.map((time) =>
            scheduleReminder({
              ...existing,
              ...updates,
              reminderTime: time,
              isChallenge: true,
            })
          )
        );
      }

      const next = challenges.map((c) =>
        c.id === id ? { ...c, ...updates, reminderIds } : c
      );
      await persist(next);
    },
    [challenges, persist]
  );

  /**
   * Replaces all local challenges with an imported/restored set, mirroring
   * replaceAllHabits/replaceAllTasks: cancels reminders tied to the current
   * set first (their ids won't be valid for the imported one), then
   * reschedules any reminders included in the imported data.
   */
  const replaceAllChallenges = useCallback(async (importedChallenges) => {
    for (const c of challenges) {
      if (c.reminderIds) await Promise.all(c.reminderIds.map((rid) => cancelReminder(rid)));
    }
    const rehydrated = [];
    for (const c of importedChallenges) {
      let reminderIds = [];
      if (c.status === 'active' && !c.archived && c.reminders && c.reminders.length > 0) {
        reminderIds = await Promise.all(
          c.reminders.map((time) => scheduleReminder({ ...c, reminderTime: time, isChallenge: true }))
        );
      }
      rehydrated.push({ ...c, reminderIds });
    }
    await persist(rehydrated);
  }, [challenges, persist]);

  /** Replaces the shared earned-badges list with an imported/restored set. */
  const replaceAllBadges = useCallback(async (importedBadges) => {
    await persistBadges(importedBadges || []);
  }, [persistBadges]);

  /**
   * Deletes a challenge and cancels associated reminders.
   */
  const deleteChallenge = useCallback(
    async (id) => {
      const existing = challenges.find((c) => c.id === id);
      if (existing?.reminderIds) {
        await Promise.all(
          existing.reminderIds.map((rid) => cancelReminder(rid))
        );
      }
      await persist(challenges.filter((c) => c.id !== id));
    },
    [challenges, persist]
  );

  /**
   * Records a daily check-in for a challenge. Tapping again on a day that's
   * already checked in undoes it (a real toggle): the completion mark, the
   * impact metric it added, and any milestone it triggered are all reverted.
   * Earlier days/achievements are never touched, and a badge is only removed
   * from the shared trophy case if no other challenge still holds it.
   */
  const checkInChallenge = useCallback(
    async (id, date = new Date()) => {
      const key = toKey(date);
      const existing = challenges.find((c) => c.id === id);
      if (!existing) return;

      const alreadyCheckedIn = !!existing.completions?.[key];
      let revertedBadgeIds = [];

      const next = challenges.map((c) => {
        if (c.id !== id) return c;

        if (alreadyCheckedIn) {
          // --- Undo today's check-in ---
          const completions = { ...c.completions };
          delete completions[key];

          // Only revert milestones that were achieved *today* as a direct
          // result of this check-in; milestones achieved on earlier days
          // stay achieved.
          const updatedMilestones = (c.milestones || []).map((m) => {
            if (m.achieved && m.achievedDate && toKey(new Date(m.achievedDate)) === key) {
              revertedBadgeIds.push(m.badgeId);
              return { ...m, achieved: false, achievedDate: null };
            }
            return m;
          });

          let totalImpact = c.metrics?.totalImpact || 0;
          if (c.metrics?.valuePerDay) {
            totalImpact = Math.max(0, totalImpact - c.metrics.valuePerDay);
          }

          return {
            ...c,
            completions,
            milestones: updatedMilestones,
            metrics: { ...c.metrics, totalImpact },
          };
        }

        // --- Record today's check-in ---
        const completions = { ...c.completions, [key]: true };
        const currentDay = calendarDaysBetween(new Date(c.startDate), new Date(date)) + 1;

        const updatedMilestones = (c.milestones || []).map((m) => {
          if (!m.achieved && currentDay >= m.day) {
            return { ...m, achieved: true, achievedDate: new Date().toISOString() };
          }
          return m;
        });

        let totalImpact = c.metrics?.totalImpact || 0;
        if (c.metrics?.valuePerDay) {
          totalImpact += c.metrics.valuePerDay;
        }

        return {
          ...c,
          completions,
          milestones: updatedMilestones,
          metrics: { ...c.metrics, totalImpact },
        };
      });

      await persist(next);

      if (alreadyCheckedIn) {
        // Drop a badge from the shared trophy case only if it's no longer
        // held by *any* challenge (another challenge may share the same
        // generic badge id, e.g. two "3-Day Starter" streaks).
        if (revertedBadgeIds.length > 0) {
          const stillEarned = new Set();
          next.forEach((c) => (c.milestones || []).forEach((m) => {
            if (m.achieved) stillEarned.add(m.badgeId);
          }));
          const prunedBadges = badges.filter(
            (b) => stillEarned.has(b) || !revertedBadgeIds.includes(b)
          );
          if (prunedBadges.length !== badges.length) {
            await persistBadges(prunedBadges);
          }
        }
      } else {
        // Check and award badges
        const updated = next.find((c) => c.id === id);
        if (updated) {
          const newBadges = updated.milestones
            .filter((m) => m.achieved && !badges.includes(m.badgeId))
            .map((m) => m.badgeId);

          if (newBadges.length > 0) {
            await persistBadges([...badges, ...newBadges]);
          }
        }
      }
    },
    [challenges, badges, persist, persistBadges]
  );

  /**
   * Records a slip for a challenge.
   */
  const recordSlip = useCallback(
    async (id, reason = '', recoveryAction = '', date = new Date()) => {
      const key = toKey(date);
      const next = challenges.map((c) => {
        if (c.id !== id) return c;
        const slip = { date: key, reason, recoveryAction, recordedAt: new Date().toISOString() };
        return {
          ...c,
          slips: [...(c.slips || []), slip],
        };
      });
      await persist(next);
    },
    [challenges, persist]
  );

  /**
   * Archives a challenge.
   */
  const archiveChallenge = useCallback(
    async (id) => {
      const existing = challenges.find((c) => c.id === id);
      if (existing?.reminderIds) {
        await Promise.all(existing.reminderIds.map((rid) => cancelReminder(rid)));
      }
      const next = challenges.map((c) =>
        c.id === id ? { ...c, archived: true } : c
      );
      await persist(next);
    },
    [challenges, persist]
  );

  /**
   * Unarchives a challenge.
   */
  const unarchiveChallenge = useCallback(
    async (id) => {
      const next = challenges.map((c) =>
        c.id === id ? { ...c, archived: false } : c
      );
      await persist(next);
    },
    [challenges, persist]
  );

  /**
   * Completes a challenge and awards the completion badge.
   */
  const completeChallenge = useCallback(
    async (id) => {
      const existing = challenges.find((c) => c.id === id);
      if (existing?.reminderIds) {
        await Promise.all(existing.reminderIds.map((rid) => cancelReminder(rid)));
      }
      const next = challenges.map((c) => {
        if (c.id !== id) return c;
        return { ...c, status: 'completed', completedAt: new Date().toISOString() };
      });
      await persist(next);

      // Award completion badge
      if (!badges.includes('badge_complete')) {
        await persistBadges([...badges, 'badge_complete']);
      }
    },
    [challenges, badges, persist, persistBadges]
  );

  /**
   * Marks a challenge as failed.
   */
  const failChallenge = useCallback(
    async (id) => {
      const existing = challenges.find((c) => c.id === id);
      if (existing?.reminderIds) {
        await Promise.all(existing.reminderIds.map((rid) => cancelReminder(rid)));
      }
      const next = challenges.map((c) =>
        c.id === id ? { ...c, status: 'failed', failedAt: new Date().toISOString() } : c
      );
      await persist(next);
    },
    [challenges, persist]
  );

  return (
    <ChallengeContext.Provider
      value={{
        challenges,
        badges,
        loaded,
        addChallenge,
        updateChallenge,
        deleteChallenge,
        replaceAllChallenges,
        replaceAllBadges,
        checkInChallenge,
        recordSlip,
        archiveChallenge,
        unarchiveChallenge,
        completeChallenge,
        failChallenge,
        presets: PRESET_CHALLENGES,
        badgeDefinitions: BADGES,
      }}
    >
      {children}
    </ChallengeContext.Provider>
  );
}

export function useChallenges() {
  const ctx = useContext(ChallengeContext);
  if (!ctx) throw new Error('useChallenges must be used within ChallengeProvider');
  return ctx;
}
