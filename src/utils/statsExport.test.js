jest.mock('expo-file-system', () => ({
  cacheDirectory: 'file://cache/',
  EncodingType: { UTF8: 'utf8' },
  writeAsStringAsync: jest.fn().mockResolvedValue(undefined),
}), { virtual: true });

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn().mockResolvedValue(true),
  shareAsync: jest.fn().mockResolvedValue(undefined),
}), { virtual: true });

const TODAY = new Date(2026, 7, 1, 10, 0, 0);
beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(TODAY);
});
afterEach(() => jest.useRealTimers());

const { buildStatsCSV, exportStatsToFile } = require('./statsExport');
const FileSystem = require('expo-file-system');
const Sharing = require('expo-sharing');

test('builds a header row plus one row per non-archived habit, build vs avoid columns', () => {
  const habits = [
    {
      name: 'Study',
      kind: 'build',
      completions: { '2026-07-31': true, '2026-08-01': true },
      frequency: 'daily',
    },
    {
      name: 'No Smoking',
      kind: 'avoid',
      createdAt: '2026-07-01T00:00:00',
      relapses: [],
    },
    { name: 'Archived one', archived: true, kind: 'build', completions: {} },
  ];

  const csv = buildStatsCSV(habits);
  const lines = csv.split('\n');

  expect(lines).toHaveLength(3); // header + 2 active habits (archived excluded)
  expect(lines[0]).toBe('Name,Kind,Current Streak (days),Best Streak (days),Completion Rate 30d (%),Avoid Streak (days),Longest Avoid Streak (days)');
  expect(lines[1]).toBe('Study,build,2,2,7,,');
  expect(lines[2]).toBe('No Smoking,avoid,,,,31,31');
});

test('quotes a habit name containing a comma', () => {
  const csv = buildStatsCSV([{ name: 'Read, then write', kind: 'build', completions: {} }]);
  expect(csv.split('\n')[1]).toBe('"Read, then write",build,0,0,0,,');
});

test('exportStatsToFile writes the csv and shares it', async () => {
  const uri = await exportStatsToFile([{ name: 'A', kind: 'build', completions: {} }]);
  expect(uri).toBe('file://cache/a-stats-export.csv');
  expect(FileSystem.writeAsStringAsync).toHaveBeenCalled();
  expect(Sharing.shareAsync).toHaveBeenCalled();
});
