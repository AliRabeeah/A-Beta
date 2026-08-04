jest.mock(
  'expo-file-system',
  () => ({
    cacheDirectory: 'file://cache/',
    EncodingType: { UTF8: 'utf8' },
    writeAsStringAsync: jest.fn().mockResolvedValue(undefined),
    readAsStringAsync: jest.fn(),
  }),
  { virtual: true }
);

jest.mock(
  'expo-sharing',
  () => ({
    isAvailableAsync: jest.fn().mockResolvedValue(true),
    shareAsync: jest.fn().mockResolvedValue(undefined),
  }),
  { virtual: true }
);

jest.mock(
  'expo-document-picker',
  () => ({
    getDocumentAsync: jest.fn(),
  }),
  { virtual: true }
);

jest.mock(
  './noteEncryption',
  () => ({
    // Payload-shape tests don't need real crypto — encryptNotesForBackup
    // has its own dedicated coverage in noteEncryption.test.js.
    encryptNotesForBackup: jest.fn(async (notes) => notes || []),
  }),
  { virtual: true }
);

import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { buildBackupPayload, exportBackupToFile, importBackupFromFile, BACKUP_VERSION } from './backup';

afterEach(() => {
  jest.clearAllMocks();
});

describe('buildBackupPayload', () => {
  test('wraps app data with app name, version, and a timestamp', async () => {
    const payload = await buildBackupPayload({ habits: [{ id: 1 }] });
    expect(payload.app).toBe('A');
    expect(payload.version).toBe(BACKUP_VERSION);
    expect(typeof payload.exportedAt).toBe('string');
    expect(payload.data.habits).toEqual([{ id: 1 }]);
  });

  test('defaults every missing collection to an empty array', async () => {
    const payload = await buildBackupPayload({ habits: [] });
    expect(payload.data.tasks).toEqual([]);
    expect(payload.data.challenges).toEqual([]);
    expect(payload.data.badges).toEqual([]);
    expect(payload.data.favorites).toEqual([]);
    expect(payload.data.notes).toEqual([]);
    expect(payload.data.planningItems).toEqual([]);
    expect(payload.data.wishlist).toEqual([]);
    expect(payload.data.wishlistTags).toEqual([]);
  });

  test('carries through provided settings fields as-is', async () => {
    const payload = await buildBackupPayload({ habits: [], accent: 'orange', mode: 'dark', language: 'ar' });
    expect(payload.data.accent).toBe('orange');
    expect(payload.data.mode).toBe('dark');
    expect(payload.data.language).toBe('ar');
  });
});

describe('exportBackupToFile', () => {
  test('writes the JSON payload to the cache directory', async () => {
    const payload = await buildBackupPayload({ habits: [{ id: 1 }] });
    const uri = await exportBackupToFile(payload);

    expect(uri).toBe('file://cache/a-backup.json');
    expect(FileSystem.writeAsStringAsync).toHaveBeenCalledWith(
      'file://cache/a-backup.json',
      JSON.stringify(payload, null, 2),
      { encoding: 'utf8' }
    );
  });

  test('opens the share sheet when sharing is available', async () => {
    Sharing.isAvailableAsync.mockResolvedValue(true);
    await exportBackupToFile(await buildBackupPayload({ habits: [] }));
    expect(Sharing.shareAsync).toHaveBeenCalledTimes(1);
  });

  test('skips the share sheet when sharing is unavailable, but still writes the file', async () => {
    Sharing.isAvailableAsync.mockResolvedValue(false);
    const uri = await exportBackupToFile(await buildBackupPayload({ habits: [] }));
    expect(Sharing.shareAsync).not.toHaveBeenCalled();
    expect(uri).toBe('file://cache/a-backup.json');
  });
});

describe('importBackupFromFile', () => {
  test('returns null when the user cancels the file picker', async () => {
    DocumentPicker.getDocumentAsync.mockResolvedValue({ canceled: true });
    const result = await importBackupFromFile();
    expect(result).toBeNull();
  });

  test('throws when no file/uri comes back from the picker', async () => {
    DocumentPicker.getDocumentAsync.mockResolvedValue({ canceled: false, assets: [] });
    await expect(importBackupFromFile()).rejects.toThrow('No file selected');
  });

  test('parses a valid backup file and returns { encrypted: false, data }', async () => {
    const backupData = { habits: [{ id: 'h1' }], tasks: [] };
    DocumentPicker.getDocumentAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file://picked.json' }],
    });
    FileSystem.readAsStringAsync.mockResolvedValue(
      JSON.stringify({ app: 'A', version: 1, data: backupData })
    );

    const result = await importBackupFromFile();
    expect(result).toEqual({ encrypted: false, data: backupData });
    expect(FileSystem.readAsStringAsync).toHaveBeenCalledWith('file://picked.json', { encoding: 'utf8' });
  });

  test('recognizes a password-encrypted backup envelope instead of failing validation', async () => {
    const envelope = { app: 'A', encrypted: true, version: 1, salt: 'aa', iv: 'bb', ciphertext: 'cc' };
    DocumentPicker.getDocumentAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file://picked.json' }],
    });
    FileSystem.readAsStringAsync.mockResolvedValue(JSON.stringify(envelope));

    const result = await importBackupFromFile();
    expect(result).toEqual({ encrypted: true, envelope });
  });

  test('rejects a file with no habits array as an invalid backup', async () => {
    DocumentPicker.getDocumentAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file://picked.json' }],
    });
    FileSystem.readAsStringAsync.mockResolvedValue(JSON.stringify({ data: { tasks: [] } }));

    await expect(importBackupFromFile()).rejects.toThrow('Invalid backup file format');
  });

  test('rejects a file where habits is not an array', async () => {
    DocumentPicker.getDocumentAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file://picked.json' }],
    });
    FileSystem.readAsStringAsync.mockResolvedValue(
      JSON.stringify({ data: { habits: 'not-an-array' } })
    );

    await expect(importBackupFromFile()).rejects.toThrow('Invalid backup file format');
  });
});
