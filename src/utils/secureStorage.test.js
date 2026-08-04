let mockAsyncStorageData = {};
let mockSecureStoreData = {};

jest.mock(
  '@react-native-async-storage/async-storage',
  () => ({
    getItem: jest.fn((k) => Promise.resolve(k in mockAsyncStorageData ? mockAsyncStorageData[k] : null)),
    setItem: jest.fn((k, v) => {
      mockAsyncStorageData[k] = v;
      return Promise.resolve();
    }),
    removeItem: jest.fn((k) => {
      delete mockAsyncStorageData[k];
      return Promise.resolve();
    }),
  }),
  { virtual: true }
);

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

// Each test gets a fresh module instance so the in-memory key cache
// inside secureStorage.js doesn't leak state between tests.
function loadFreshModule() {
  jest.resetModules();
  return require('./secureStorage').default;
}

beforeEach(() => {
  mockAsyncStorageData = {};
  mockSecureStoreData = {};
  jest.clearAllMocks();
});

describe('round trip', () => {
  test('setItem then getItem returns the original value', async () => {
    const storage = loadFreshModule();
    await storage.setItem('k1', JSON.stringify({ a: 1, b: 'text' }));
    const result = await storage.getItem('k1');
    expect(JSON.parse(result)).toEqual({ a: 1, b: 'text' });
  });

  test('the value on the underlying AsyncStorage is never plain text', async () => {
    const storage = loadFreshModule();
    await storage.setItem('k2', JSON.stringify({ secret: 'do not leak this' }));
    expect(mockAsyncStorageData['k2']).not.toContain('do not leak this');
    expect(mockAsyncStorageData['k2'].startsWith('aslv1:')).toBe(true);
  });

  test('getItem on a never-set key returns null', async () => {
    const storage = loadFreshModule();
    expect(await storage.getItem('missing')).toBeNull();
  });

  test('removeItem deletes the underlying value', async () => {
    const storage = loadFreshModule();
    await storage.setItem('k3', 'value');
    await storage.removeItem('k3');
    expect(await storage.getItem('k3')).toBeNull();
  });

  test('reuses the same device key across multiple values (only one SecureStore write)', async () => {
    const storage = loadFreshModule();
    await storage.setItem('a', '1');
    await storage.setItem('b', '2');
    const SecureStore = require('expo-secure-store');
    expect(SecureStore.setItemAsync).toHaveBeenCalledTimes(1);
  });
});

describe('legacy plain-text migration', () => {
  test('reads pre-existing plain-text data correctly instead of failing', async () => {
    mockAsyncStorageData['legacy'] = JSON.stringify([{ id: 1, title: 'old habit' }]);
    const storage = loadFreshModule();
    const result = await storage.getItem('legacy');
    expect(JSON.parse(result)).toEqual([{ id: 1, title: 'old habit' }]);
  });

  test('silently upgrades legacy plain-text data to encrypted on read', async () => {
    mockAsyncStorageData['legacy2'] = JSON.stringify({ x: 1 });
    const storage = loadFreshModule();
    await storage.getItem('legacy2');
    // Give the fire-and-forget upgrade a tick to complete.
    await new Promise((r) => setImmediate(r));
    expect(mockAsyncStorageData['legacy2'].startsWith('aslv1:')).toBe(true);

    // And it still reads back correctly now that it's encrypted.
    const again = await storage.getItem('legacy2');
    expect(JSON.parse(again)).toEqual({ x: 1 });
  });
});

describe('corrupted / unreadable data', () => {
  test('returns null instead of throwing when the ciphertext is corrupted', async () => {
    mockAsyncStorageData['corrupt'] = 'aslv1:deadbeef:not-valid-base64-ciphertext====';
    const storage = loadFreshModule();
    const result = await storage.getItem('corrupt');
    expect(result).toBeNull();
  });

  test('returns null instead of throwing when the device key is missing (e.g. SecureStore wiped)', async () => {
    const storage = loadFreshModule();
    await storage.setItem('k4', 'value');
    mockSecureStoreData = {}; // simulate the key being gone
    jest.resetModules();
    const freshStorage = require('./secureStorage').default;
    const result = await freshStorage.getItem('k4');
    // A brand-new key gets generated (since none was found), which can't
    // decrypt data written under the old one — must fail safely, not throw.
    expect(result).toBeNull();
  });
});
