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
});
