import { toKey } from './dateUtils';

// XP weights — deliberately simple and transparent (no hidden multipliers)
// so the number on screen always matches what a person would expect from
// what they did: a habit check-in is worth less than finishing a task,
// which is worth less than a challenge milestone.
const XP_PER_HABIT_DONE = 1;
const XP_PER_TASK_DONE = 2;
const XP_PER_MILESTONE = 5;
const XP_PER_CHALLENGE_COMPLETED = 10;

// Cumulative XP required to REACH each level (index 0 -> level 1).
const LEVEL_THRESHOLDS = [0, 10, 25, 50, 90, 150, 230, 330, 450, 600, 800, 1050];
const MAX_STAGE = 6; // how many distinct growth-art stages the creature has

export function computeTotalXP({ habits = [], tasks = [], challenges = [] }) {
  let xp = 0;

  for (const habit of habits) {
    const completions = habit.completions || {};
    for (const status of Object.values(completions)) {
      if (status === true || status === 'done') xp += XP_PER_HABIT_DONE;
    }
  }

  for (const task of tasks) {
    if (task.completed) xp += XP_PER_TASK_DONE;
  }

  for (const challenge of challenges) {
    const milestones = challenge.milestones || [];
    xp += milestones.filter((m) => m.achieved).length * XP_PER_MILESTONE;
    if (challenge.status === 'completed') xp += XP_PER_CHALLENGE_COMPLETED;
  }

  return xp;
}

export function levelForXP(xp) {
  let level = 1;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (xp >= LEVEL_THRESHOLDS[i]) level = i + 1;
    else break;
  }
  return level;
}

export function levelProgress(xp) {
  const level = levelForXP(xp);
  const currentThreshold = LEVEL_THRESHOLDS[level - 1] ?? 0;
  const nextThreshold = LEVEL_THRESHOLDS[level] ?? currentThreshold + (LEVEL_THRESHOLDS[level - 1] - (LEVEL_THRESHOLDS[level - 2] ?? 0)) * 1.4;
  const xpIntoLevel = xp - currentThreshold;
  const xpForLevel = Math.max(1, nextThreshold - currentThreshold);
  const isMaxTrackedLevel = level >= LEVEL_THRESHOLDS.length;
  return {
    level,
    xpIntoLevel,
    xpForLevel,
    ratio: isMaxTrackedLevel ? 1 : Math.min(1, xpIntoLevel / xpForLevel),
    nextLevelXP: isMaxTrackedLevel ? null : nextThreshold,
  };
}

export function stageForLevel(level) {
  return Math.min(MAX_STAGE, 1 + Math.floor((level - 1) / 2));
}

function mostRecentActivityDate({ habits = [], tasks = [] }) {
  let latest = null;
  const consider = (dateLike) => {
    if (!dateLike) return;
    const d = new Date(dateLike);
    if (Number.isNaN(d.getTime())) return;
    if (!latest || d > latest) latest = d;
  };

  for (const habit of habits) {
    const completions = habit.completions || {};
    for (const [dateKey, status] of Object.entries(completions)) {
      if (status === true || status === 'done') consider(dateKey);
    }
  }
  for (const task of tasks) {
    if (task.completed && task.completedAt) consider(task.completedAt);
  }

  return latest;
}

// 'happy' (did something today), 'content' (yesterday, streak still alive),
// 'sleepy' (2+ days quiet), or 'new' (no activity logged yet at all).
export function moodFromActivity({ habits = [], tasks = [] }) {
  const latest = mostRecentActivityDate({ habits, tasks });
  if (!latest) return 'new';

  const todayKey = toKey(new Date());
  const latestKey = toKey(latest);
  if (latestKey === todayKey) return 'happy';

  const daysSince = Math.round((new Date(todayKey) - new Date(latestKey)) / (1000 * 60 * 60 * 24));
  if (daysSince <= 1) return 'content';
  return 'sleepy';
}

export function computeCompanionState({ habits = [], tasks = [], challenges = [] }) {
  const xp = computeTotalXP({ habits, tasks, challenges });
  const progress = levelProgress(xp);
  const stage = stageForLevel(progress.level);
  const mood = moodFromActivity({ habits, tasks });
  return { xp, ...progress, stage, mood };
}

// How much XP came in specifically today — a small "here's today's
// contribution" figure for the companion screen, separate from the
// all-time total.
export function xpEarnedToday({ habits = [], tasks = [] }) {
  const todayKey = toKey(new Date());
  let xp = 0;

  for (const habit of habits) {
    const status = habit.completions?.[todayKey];
    if (status === true || status === 'done') xp += XP_PER_HABIT_DONE;
  }

  for (const task of tasks) {
    if (task.completed && task.completedAt && toKey(new Date(task.completedAt)) === todayKey) {
      xp += XP_PER_TASK_DONE;
    }
  }

  return xp;
}
