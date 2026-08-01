import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import {
  getCurrentStreak,
  getBestStreak,
  getCompletionRate,
  getAvoidStreak,
  getLongestAvoidStreak,
} from './streakUtils';

const STATS_FILE = FileSystem.cacheDirectory + 'a-stats-export.csv';

function csvEscape(value) {
  const str = String(value ?? '');
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

/**
 * Builds a CSV snapshot of habit stats: one row per non-archived habit.
 * Build-type habits get streak/completion-rate columns; avoid-type habits
 * get avoid-streak columns instead (the other set is left blank for that row).
 */
export function buildStatsCSV(habits) {
  const active = (habits || []).filter((h) => !h.archived);
  const header = [
    'Name',
    'Kind',
    'Current Streak (days)',
    'Best Streak (days)',
    'Completion Rate 30d (%)',
    'Avoid Streak (days)',
    'Longest Avoid Streak (days)',
  ];

  const rows = active.map((h) => {
    const isAvoid = h.kind === 'avoid';
    return [
      csvEscape(h.name),
      isAvoid ? 'avoid' : 'build',
      isAvoid ? '' : getCurrentStreak(h),
      isAvoid ? '' : getBestStreak(h),
      isAvoid ? '' : getCompletionRate(h, 30),
      isAvoid ? getAvoidStreak(h) : '',
      isAvoid ? getLongestAvoidStreak(h) : '',
    ].join(',');
  });

  return [header.join(','), ...rows].join('\n');
}

/**
 * Writes the CSV to the cache directory and opens the native share sheet
 * (if available) so the user can save it wherever they like.
 * Returns the file uri.
 */
export async function exportStatsToFile(habits) {
  const csv = buildStatsCSV(habits);
  await FileSystem.writeAsStringAsync(STATS_FILE, csv, { encoding: FileSystem.EncodingType.UTF8 });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(STATS_FILE, { mimeType: 'text/csv', dialogTitle: 'Export Stats' });
  }

  return STATS_FILE;
}
