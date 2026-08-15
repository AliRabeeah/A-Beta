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
 * PBKDF2 (210k iterations, SHA-256) derives a 512-bit key from the
 * password plus a random per-backup salt; the 512 bits are split into a
 * 256-bit AES key and a separate 256-bit HMAC key (domain-separated via
 * one KDF call instead of two), so the same password produces a
 * different key every time a backup is made, brute-forcing the password
 * can't reuse work across backups, and the ciphertext is authenticated
 * (Encrypt-then-MAC) so a corrupted or tampered backup file is rejected
 * with a clear error instead of silently restoring garbage.
 *
 * Version 1 backups (AES-CBC, no MAC, 100k iterations) remain restorable
 * — decryptPayloadWithPassword branches on envelope.version — but every
 * new backup is written as version 2.
 */

const PBKDF2_ITERATIONS_V1 = 100_000; // legacy, restore-only
const PBKDF2_ITERATIONS = 210_000;
const ENCRYPTED_BACKUP_VERSION = 2;

function bytesToHex(bytes) {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function constantTimeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

// Legacy v1: single 256-bit key, CBC only, no MAC.
async function deriveKeyV1(password, saltHex) {
  const salt = CryptoJS.enc.Hex.parse(saltHex);
  return CryptoJS.PBKDF2(password, salt, {
    keySize: 256 / 32,
    iterations: PBKDF2_ITERATIONS_V1,
    hasher: CryptoJS.algo.SHA256,
  });
}

// v2: one 512-bit PBKDF2 output, split into an AES key and an HMAC key.
async function deriveKeysV2(password, saltHex) {
  const salt = CryptoJS.enc.Hex.parse(saltHex);
  const combined = CryptoJS.PBKDF2(password, salt, {
    keySize: 512 / 32,
    iterations: PBKDF2_ITERATIONS,
    hasher: CryptoJS.algo.SHA256,
  });
  const combinedHex = combined.toString(CryptoJS.enc.Hex);
  const encKey = CryptoJS.enc.Hex.parse(combinedHex.slice(0, 64));
  const macKey = CryptoJS.enc.Hex.parse(combinedHex.slice(64, 128));
  return { encKey, macKey };
}

/**
 * Wraps a backup payload (the object buildBackupPayload() returns) into a
 * password-encrypted envelope. The envelope's own top-level fields
 * (app/encrypted/version/exportedAt/recoveryBundle) stay in plain text —
 * only the actual data is encrypted — so a corrupted/wrong-password file
 * can still be recognized as "an A backup that needs a password" instead
 * of looking like garbage, and so a fresh install with only this file and
 * a recovery key (no local storage at all) can recover the password and
 * the note/journal encryption keys straight from the file itself — see
 * backupPasswordRecovery.js. recoveryBundle is optional: pass whatever
 * getRecoveryBundle() returns (null if no recovery key has been set up),
 * and it's embedded as-is, already wrapped/encrypted internally with the
 * recovery key — this function never sees the raw recovery key.
 */
export async function encryptPayloadWithPassword(payload, password, recoveryBundle = null) {
  if (!password) throw new Error('encryptPayloadWithPassword requires a non-empty password');

  const saltBytes = await Crypto.getRandomBytesAsync(16);
  const saltHex = bytesToHex(saltBytes);
  const ivBytes = await Crypto.getRandomBytesAsync(16);
  const ivHex = bytesToHex(ivBytes);

  const { encKey, macKey } = await deriveKeysV2(password, saltHex);
  const iv = CryptoJS.enc.Hex.parse(ivHex);

  const plainText = JSON.stringify(payload);
  const encrypted = CryptoJS.AES.encrypt(plainText, encKey, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });
  const ciphertextBase64 = encrypted.ciphertext.toString(CryptoJS.enc.Base64);
  const tagHex = CryptoJS.HmacSHA256(`${ivHex}:${ciphertextBase64}`, macKey).toString(CryptoJS.enc.Hex);

  return {
    app: 'A',
    encrypted: true,
    version: ENCRYPTED_BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    cipher: 'aes-256-cbc-hmac-sha256-pbkdf2',
    iterations: PBKDF2_ITERATIONS,
    salt: saltHex,
    iv: ivHex,
    ciphertext: ciphertextBase64,
    tag: tagHex,
    recoveryBundle: recoveryBundle || null,
  };
}

/**
 * Reverses encryptPayloadWithPassword. Throws a clearly-labeled error on a
 * wrong password (rather than returning garbage/corrupted JSON) so the UI
 * can show "wrong password" instead of a confusing parse error. Also
 * rejects a tampered/corrupted version-2 file via the MAC check before
 * ever attempting to decrypt or parse it.
 */
export async function decryptPayloadWithPassword(envelope, password) {
  if (!envelope || envelope.encrypted !== true) {
    throw new Error('Not an encrypted backup envelope');
  }
  if (!password) throw new Error('decryptPayloadWithPassword requires a non-empty password');

  const wrongPasswordError = () => {
    const err = new Error('Incorrect backup password');
    err.code = 'WRONG_PASSWORD';
    return err;
  };

  let text;

  if (envelope.version === 2) {
    const { encKey, macKey } = await deriveKeysV2(password, envelope.salt);
    const expectedTag = CryptoJS.HmacSHA256(`${envelope.iv}:${envelope.ciphertext}`, macKey).toString(CryptoJS.enc.Hex);
    if (!envelope.tag || !constantTimeEqual(envelope.tag, expectedTag)) {
      // A wrong password derives a different MAC key, so this also covers
      // "wrong password" for version-2 backups, in addition to real
      // tampering/corruption.
      throw wrongPasswordError();
    }
    const iv = CryptoJS.enc.Hex.parse(envelope.iv);
    const cipherParams = CryptoJS.lib.CipherParams.create({
      ciphertext: CryptoJS.enc.Base64.parse(envelope.ciphertext),
    });
    try {
      const decrypted = CryptoJS.AES.decrypt(cipherParams, encKey, {
        iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      });
      text = decrypted.toString(CryptoJS.enc.Utf8);
    } catch (e) {
      text = '';
    }
  } else {
    // Legacy version-1 backup: no MAC, single derived key, fewer
    // iterations. Still restorable so old exports aren't stranded.
    const key = await deriveKeyV1(password, envelope.salt);
    const iv = CryptoJS.enc.Hex.parse(envelope.iv);
    const cipherParams = CryptoJS.lib.CipherParams.create({
      ciphertext: CryptoJS.enc.Base64.parse(envelope.ciphertext),
    });
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
  }

  if (!text) throw wrongPasswordError();

  try {
    return JSON.parse(text);
  } catch (e) {
    throw wrongPasswordError();
  }
}
