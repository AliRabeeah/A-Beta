import CryptoJS from 'crypto-js';
import * as Crypto from 'expo-crypto';

/**
 * Encrypts the ENTIRE backup payload (habits, tasks, challenges, favorites,
 * notes, planning, wishlist, settings — everything) with a password the
 * person chooses, on top of the existing per-locked-note device-key
 * encryption in noteEncryption.js. The two are independent layers:
 *  - noteEncryption.js: protects locked notes specifically, using an
 *    on-device-only key — works automatically, no password needed, but
 *    can only be decrypted back on the SAME device install.
 *  - This module: protects the WHOLE backup file with a password the
 *    person sets and remembers, so it's portable (can be restored on a
 *    different device/phone with the same password) and so the backup
 *    file/GitHub repo is unreadable to anyone without that password, even
 *    for the non-note data (habits, tasks, etc) that was previously
 *    always in plain text.
 *
 * PBKDF2 (150k iterations, SHA-256) derives the AES key from the password
 * plus a random per-backup salt, so the same password produces a
 * different key every time a backup is made, and brute-forcing the
 * password can't reuse work across backups.
 */

const PBKDF2_ITERATIONS = 100_000;
const ENCRYPTED_BACKUP_VERSION = 1;

function bytesToHex(bytes) {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function deriveKey(password, saltHex) {
  const salt = CryptoJS.enc.Hex.parse(saltHex);
  return CryptoJS.PBKDF2(password, salt, {
    keySize: 256 / 32,
    iterations: PBKDF2_ITERATIONS,
    hasher: CryptoJS.algo.SHA256,
  });
}

/**
 * Wraps a backup payload (the object buildBackupPayload() returns) into a
 * password-encrypted envelope. The envelope's own top-level fields
 * (app/encrypted/version/exportedAt) stay in plain text — only the actual
 * data is encrypted — so a corrupted/wrong-password file can still be
 * recognized as "an A backup that needs a password" instead of looking
 * like garbage.
 */
export async function encryptPayloadWithPassword(payload, password) {
  if (!password) throw new Error('encryptPayloadWithPassword requires a non-empty password');

  const saltBytes = await Crypto.getRandomBytesAsync(16);
  const saltHex = bytesToHex(saltBytes);
  const ivBytes = await Crypto.getRandomBytesAsync(16);
  const ivHex = bytesToHex(ivBytes);

  const key = await deriveKey(password, saltHex);
  const iv = CryptoJS.enc.Hex.parse(ivHex);

  const plainText = JSON.stringify(payload);
  const encrypted = CryptoJS.AES.encrypt(plainText, key, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });

  return {
    app: 'A',
    encrypted: true,
    version: ENCRYPTED_BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    cipher: 'aes-256-cbc-pbkdf2',
    iterations: PBKDF2_ITERATIONS,
    salt: saltHex,
    iv: ivHex,
    ciphertext: encrypted.ciphertext.toString(CryptoJS.enc.Base64),
  };
}

/**
 * Reverses encryptPayloadWithPassword. Throws a clearly-labeled error on a
 * wrong password (rather than returning garbage/corrupted JSON) so the UI
 * can show "wrong password" instead of a confusing parse error.
 */
export async function decryptPayloadWithPassword(envelope, password) {
  if (!envelope || envelope.encrypted !== true) {
    throw new Error('Not an encrypted backup envelope');
  }
  if (!password) throw new Error('decryptPayloadWithPassword requires a non-empty password');

  const key = await deriveKey(password, envelope.salt);
  const iv = CryptoJS.enc.Hex.parse(envelope.iv);
  const cipherParams = CryptoJS.lib.CipherParams.create({
    ciphertext: CryptoJS.enc.Base64.parse(envelope.ciphertext),
  });

  let text;
  try {
    const decrypted = CryptoJS.AES.decrypt(cipherParams, key, {
      iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });
    text = decrypted.toString(CryptoJS.enc.Utf8);
  } catch (e) {
    text = '';
  }

  if (!text) {
    const err = new Error('Incorrect backup password');
    err.code = 'WRONG_PASSWORD';
    throw err;
  }

  try {
    return JSON.parse(text);
  } catch (e) {
    const err = new Error('Incorrect backup password');
    err.code = 'WRONG_PASSWORD';
    throw err;
  }
}
