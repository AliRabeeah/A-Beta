import CryptoJS from 'crypto-js';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

/**
 * Signal-style "recovery key" for the whole-backup password, but entirely
 * local — there's no server here to escrow anything against, so the key
 * itself has to carry all the security weight instead of a rate-limited
 * server endpoint.
 *
 * How it works:
 *  - A random 128-bit recovery key is generated once (shown to the person
 *    ONE time — like Signal's account recovery key, or a hardware wallet
 *    seed). We never store the plaintext key anywhere.
 *  - The backup password gets "wrapped" (AES-encrypted) with a key derived
 *    from the recovery key, producing an envelope that's safe to store in
 *    plaintext, because it's useless without the recovery key.
 *  - That wrapped envelope is stored locally AND embedded in every backup
 *    file (see backupEncryption.js), so it travels with the backup. On a
 *    brand-new device/install with only a GitHub backup and the recovery
 *    key, the backup password can be recovered straight from the backup
 *    file itself — no local storage needed at all.
 *  - Losing BOTH the backup password and the recovery key means the
 *    backup truly cannot be decrypted. That's inherent to any real
 *    end-to-end encryption — there's no third option that doesn't put a
 *    backdoor in the encryption.
 *
 * The recovery key is high-entropy and random (unlike the password, which
 * a person chooses and could be weak), so a plain SHA-256 of it is a safe
 * AES key on its own — no PBKDF2 slowdown needed, since there's nothing
 * practical to brute-force offline.
 */

const RECOVERY_ENVELOPE_KEY = 'a_backup_password_recovery_v1';
const RECOVERY_VERSION = 1;

function bytesToHex(bytes) {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Strips formatting (dashes/spaces) and normalizes case for comparison/derivation. */
function normalizeRecoveryKey(input) {
  return (input || '').replace(/[^0-9A-Fa-f]/g, '').toUpperCase();
}

function deriveWrapKey(recoveryKey) {
  return CryptoJS.SHA256(normalizeRecoveryKey(recoveryKey));
}

/** Generates a new recovery key, formatted like "A1B2-C3D4-E5F6-..." (32 hex chars, 8 groups of 4). */
export async function generateRecoveryKey() {
  const bytes = await Crypto.getRandomBytesAsync(16); // 128 bits
  const hex = bytesToHex(bytes).toUpperCase();
  return hex.match(/.{1,4}/g).join('-');
}

/** Wraps the backup password with a key derived from the recovery key. */
export async function wrapBackupPassword(password, recoveryKey) {
  const key = deriveWrapKey(recoveryKey);
  const ivBytes = await Crypto.getRandomBytesAsync(16);
  const ivHex = bytesToHex(ivBytes);
  const iv = CryptoJS.enc.Hex.parse(ivHex);

  const encrypted = CryptoJS.AES.encrypt(password, key, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });

  return {
    v: RECOVERY_VERSION,
    iv: ivHex,
    ciphertext: encrypted.ciphertext.toString(CryptoJS.enc.Base64),
  };
}

/**
 * Reverses wrapBackupPassword. Never throws — returns null on a wrong or
 * malformed recovery key so the UI can show a plain "incorrect key"
 * message instead of a crash.
 */
export function unwrapBackupPassword(envelope, recoveryKey) {
  if (!envelope || !envelope.iv || !envelope.ciphertext) return null;
  try {
    const key = deriveWrapKey(recoveryKey);
    const iv = CryptoJS.enc.Hex.parse(envelope.iv);
    const cipherParams = CryptoJS.lib.CipherParams.create({
      ciphertext: CryptoJS.enc.Base64.parse(envelope.ciphertext),
    });
    const decrypted = CryptoJS.AES.decrypt(cipherParams, key, {
      iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });
    const text = decrypted.toString(CryptoJS.enc.Utf8);
    return text || null;
  } catch (e) {
    return null;
  }
}

export async function saveRecoveryEnvelope(envelope) {
  await SecureStore.setItemAsync(RECOVERY_ENVELOPE_KEY, JSON.stringify(envelope));
}

export async function getRecoveryEnvelope() {
  const raw = await SecureStore.getItemAsync(RECOVERY_ENVELOPE_KEY).catch(() => null);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

export async function clearRecoveryEnvelope() {
  await SecureStore.deleteItemAsync(RECOVERY_ENVELOPE_KEY).catch(() => {});
}
