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

const { encryptPayloadWithPassword, decryptPayloadWithPassword } = require('./backupEncryption');

const samplePayload = {
  app: 'A',
  version: 1,
  exportedAt: '2026-01-01T00:00:00.000Z',
  data: {
    habits: [{ id: 1, title: 'Read' }],
    tasks: [{ id: 2, title: 'Buy milk' }],
    notes: [{ id: 3, title: 'Diary', content: 'private thoughts' }],
  },
};

describe('encryptPayloadWithPassword / decryptPayloadWithPassword', () => {
  test('round trip recovers the exact original payload with the correct password', async () => {
    const envelope = await encryptPayloadWithPassword(samplePayload, 'correct horse battery staple');
    expect(envelope.encrypted).toBe(true);
    expect(envelope.app).toBe('A');

    const recovered = await decryptPayloadWithPassword(envelope, 'correct horse battery staple');
    expect(recovered).toEqual(samplePayload);
  });

  test('the envelope never contains the plain-text payload anywhere', async () => {
    const envelope = await encryptPayloadWithPassword(samplePayload, 'my-password');
    const serialized = JSON.stringify(envelope);
    expect(serialized).not.toContain('private thoughts');
    expect(serialized).not.toContain('Buy milk');
  });

  test('rejects a wrong password with a clearly-labeled error instead of returning garbage', async () => {
    const envelope = await encryptPayloadWithPassword(samplePayload, 'right-password');
    await expect(decryptPayloadWithPassword(envelope, 'wrong-password')).rejects.toMatchObject({
      code: 'WRONG_PASSWORD',
    });
  });

  test('two encryptions of the same payload with the same password produce different ciphertext (random salt/IV)', async () => {
    const a = await encryptPayloadWithPassword(samplePayload, 'same-password');
    const b = await encryptPayloadWithPassword(samplePayload, 'same-password');
    expect(a.ciphertext).not.toBe(b.ciphertext);
    expect(a.salt).not.toBe(b.salt);
  });

  test('throws when asked to encrypt with an empty password', async () => {
    await expect(encryptPayloadWithPassword(samplePayload, '')).rejects.toThrow();
  });

  test('rejects a tampered ciphertext even with the correct password (MAC check)', async () => {
    const envelope = await encryptPayloadWithPassword(samplePayload, 'right-password');
    const tampered = { ...envelope, ciphertext: envelope.ciphertext.slice(0, -4) + 'abcd' };
    await expect(decryptPayloadWithPassword(tampered, 'right-password')).rejects.toMatchObject({
      code: 'WRONG_PASSWORD',
    });
  });

  test('new backups are written as version 2 with a MAC tag', async () => {
    const envelope = await encryptPayloadWithPassword(samplePayload, 'right-password');
    expect(envelope.version).toBe(2);
    expect(typeof envelope.tag).toBe('string');
    expect(envelope.tag.length).toBeGreaterThan(0);
  });

  test('still restores a legacy version-1 backup (no MAC, single key)', async () => {
    // Hand-built the way version-1 envelopes used to look, to make sure old
    // exported backups aren't stranded after the upgrade.
    const CryptoJS = require('crypto-js');
    const salt = CryptoJS.enc.Hex.parse('00112233445566778899aabbccddeeff');
    const iv = CryptoJS.enc.Hex.parse('102030405060708090a0b0c0d0e0f001');
    const key = CryptoJS.PBKDF2('legacy-password', salt, { keySize: 256 / 32, iterations: 100000, hasher: CryptoJS.algo.SHA256 });
    const encrypted = CryptoJS.AES.encrypt(JSON.stringify(samplePayload), key, { iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 });
    const legacyEnvelope = {
      app: 'A',
      encrypted: true,
      version: 1,
      cipher: 'aes-256-cbc-pbkdf2',
      iterations: 100000,
      salt: '00112233445566778899aabbccddeeff',
      iv: '102030405060708090a0b0c0d0e0f001'.slice(0, 32),
      ciphertext: encrypted.ciphertext.toString(CryptoJS.enc.Base64),
    };
    const recovered = await decryptPayloadWithPassword(legacyEnvelope, 'legacy-password');
    expect(recovered).toEqual(samplePayload);
  });
});
