let mockSecureStoreData = {};

jest.mock(
  'expo-secure-store',
  () => ({
    getItemAsync: jest.fn((k) => Promise.resolve(k in mockSecureStoreData ? mockSecureStoreData[k] : null)),
    setItemAsync: jest.fn((k, v) => {
      mockSecureStoreData[k] = v;
      return Promise.resolve();
    }),
    deleteItemAsync: jest.fn((k) => {
      delete mockSecureStoreData[k];
      return Promise.resolve();
    }),
  }),
  { virtual: true }
);

jest.mock(
  'expo-crypto',
  () => ({
    getRandomBytesAsync: jest.fn((n) => {
      const arr = new Uint8Array(n);
      for (let i = 0; i < n; i++) arr[i] = Math.floor(Math.random() * 256);
      return Promise.resolve(arr);
    }),
  }),
  { virtual: true }
);

const { encryptNotesForBackup, decryptNotesFromBackup } = require('./noteEncryption');

beforeEach(() => {
  mockSecureStoreData = {};
  jest.clearAllMocks();
});

describe('encryptNotesForBackup', () => {
  test('leaves an empty/undefined list untouched', async () => {
    expect(await encryptNotesForBackup([])).toEqual([]);
    expect(await encryptNotesForBackup(undefined)).toEqual([]);
  });

  test('passes unlocked notes through unchanged', async () => {
    const notes = [{ id: '1', isLocked: false, title: 'Groceries', content: 'milk, eggs' }];
    const result = await encryptNotesForBackup(notes);
    expect(result).toEqual(notes);
  });

  test('strips plain-text fields from locked notes and adds an encrypted payload', async () => {
    const notes = [
      { id: '2', isLocked: true, title: 'Secret', content: 'sensitive text', blocks: [{ type: 'paragraph', text: 'sensitive text' }], checklistItems: [], color: 'yellow', emoji: '🔒' },
    ];
    const result = await encryptNotesForBackup(notes);

    expect(result).toHaveLength(1);
    const [locked] = result;
    expect(locked.encrypted).toBe(true);
    expect(typeof locked.encryptedPayload).toBe('string');
    expect(locked.title).toBeUndefined();
    expect(locked.content).toBeUndefined();
    expect(locked.blocks).toBeUndefined();
    // Non-sensitive metadata survives untouched.
    expect(locked.id).toBe('2');
    expect(locked.color).toBe('yellow');
    expect(locked.emoji).toBe('🔒');
    // The raw sensitive text must never appear anywhere in the serialized note.
    expect(JSON.stringify(locked)).not.toContain('sensitive text');
  });
});

describe('decryptNotesFromBackup round trip', () => {
  test('recovers the original content on the same device (same SecureStore key)', async () => {
    const original = { id: '3', isLocked: true, title: 'Diary', content: 'private thoughts', blocks: [], checklistItems: [] };
    const [encrypted] = await encryptNotesForBackup([original]);
    const [decrypted] = await decryptNotesFromBackup([encrypted]);

    expect(decrypted.title).toBe('Diary');
    expect(decrypted.content).toBe('private thoughts');
    expect(decrypted.isLocked).toBe(true);
    expect(decrypted.encrypted).toBeUndefined();
    expect(decrypted.decryptFailed).toBeUndefined();
  });

  test('passes already-plain notes through unchanged (no `encrypted` flag)', async () => {
    const notes = [{ id: '4', isLocked: false, title: 'Plain', content: 'hello' }];
    expect(await decryptNotesFromBackup(notes)).toEqual(notes);
  });

  test('marks a note as decryptFailed instead of throwing when the on-device key is missing (restore on a different device)', async () => {
    const original = { id: '5', isLocked: true, title: 'Diary', content: 'private thoughts', blocks: [], checklistItems: [] };
    const [encrypted] = await encryptNotesForBackup([original]);

    // Simulate a fresh device/reinstall: the key that encrypted this note
    // never existed in this SecureStore.
    mockSecureStoreData = {};

    const [result] = await decryptNotesFromBackup([encrypted]);
    expect(result.isLocked).toBe(true);
    expect(result.decryptFailed).toBe(true);
    expect(result.title).toBe('');
    expect(result.content).toBe('');
    expect(result.encrypted).toBeUndefined();
    expect(result.encryptedPayload).toBeUndefined();
  });

  test('marks a note as decryptFailed on a corrupted payload instead of throwing', async () => {
    const corrupted = { id: '6', isLocked: true, encrypted: true, encryptedPayload: 'not-a-real-payload' };
    const [result] = await decryptNotesFromBackup([corrupted]);
    expect(result.isLocked).toBe(true);
    expect(result.decryptFailed).toBe(true);
  });
});
