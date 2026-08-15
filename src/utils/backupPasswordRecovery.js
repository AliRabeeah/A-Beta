import CryptoJS from 'crypto-js';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

/**
 * Signal-style "recovery key" — but covering the WHOLE local trust
 * chain, not just the backup password. There's no server here to escrow
 * anything against, so the key itself has to carry all the security
 * weight instead of a rate-limited server endpoint.
 *
 * What it covers, and why that scope matters:
 *  - The backup password itself (lets someone restore a backup file on a
 *    brand-new device/install without having memorized the password).
 *  - The on-device-only AES keys for locked notes (noteEncryption.js) and
 *    journal entries (journalEncryption.js). Those keys live ONLY in this
 *    device's SecureStore and are never included in a backup on their
 *    own — which means an app uninstall (wiping SecureStore) previously
 *    made locked notes/journal entries permanently undecryptable on
 *    restore, even with the correct backup password, because the
 *    password alone was never enough to recover them. Wrapping those
 *    keys with the SAME recovery key, and embedding the wrapped bundle in
 *    every backup file, closes that gap: restoring on a fresh install
 *    with just the backup file + the recovery key now recovers
 *    everything, not just the non-locked data.
 *
 * How it works:
 *  - A random 128-bit recovery key is generated once (shown to the person
 *    ONE time — like Signal's account recovery key, or a hardware wallet
 *    seed). We never store the plaintext key anywhere.
 *  - Each secret (password, note key, journal key) is individually
 *    wrapped (AES-encrypted) with a key derived from the recovery key,
 *    producing a bundle that's safe to store in plaintext — including
 *    embedding it directly in backup files — because it's useless
 *    without the recovery key.
 *  - That bundle is stored locally AND embedded in every backup file (see
 *    backupEncryption.js), so it travels with the backup. On a brand-new
 *    device/install with only a GitHub/exported backup and the recovery
 *    key, everything can be recovered straight from the backup file
 *    itself — no local storage needed at all.
 *  - Losing BOTH the backup password and the recovery key means the
 *    backup truly cannot be decrypted, and any locked note/journal entry
 *    whose key isn't otherwise present on the device is permanently gone.
 *    That's inherent to any real end-to-end encryption — there's no third
 *    option that doesn't put a backdoor in the encryption.
 *
 * The recovery key is high-entropy and random (unlike the password, which
 * a person chooses and could be weak), so a plain SHA-256 of it is a safe
 * AES key on its own — no PBKDF2 slowdown needed, since there's nothing
 * practical to brute-force offline.
 */

const RECOVERY_BUNDLE_KEY = 'a_backup_recovery_bundle_v1';
const LEGACY_RECOVERY_ENVELOPE_KEY = 'a_backup_password_recovery_v1'; // v1: password only
const BUNDLE_VERSION = 2;

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

/** Wraps an arbitrary secret string with a key derived from the recovery key. */
async function wrapSecret(secret, recoveryKey) {
  const key = deriveWrapKey(recoveryKey);
  const ivBytes = await Crypto.getRandomBytesAsync(16);
  const ivHex = bytesToHex(ivBytes);
  const iv = CryptoJS.enc.Hex.parse(ivHex);

  const encrypted = CryptoJS.AES.encrypt(secret, key, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });

  return { iv: ivHex, ciphertext: encrypted.ciphertext.toString(CryptoJS.enc.Base64) };
}

/** Reverses wrapSecret. Never throws — returns null on a wrong/malformed key. */
function unwrapSecret(wrapped, recoveryKey) {
  if (!wrapped || !wrapped.iv || !wrapped.ciphertext) return null;
  try {
    const key = deriveWrapKey(recoveryKey);
    const iv = CryptoJS.enc.Hex.parse(wrapped.iv);
    const cipherParams = CryptoJS.lib.CipherParams.create({
      ciphertext: CryptoJS.enc.Base64.parse(wrapped.ciphertext),
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

/**
 * Wraps the backup password plus the note/journal encryption keys (when
 * present — a fresh install with nothing locked yet may not have them)
 * into one bundle, all with the same recovery key.
 */
export async function buildRecoveryBundle({ password, noteKeyHex, journalKeyHex }, recoveryKey) {
  const bundle = { v: BUNDLE_VERSION, password: await wrapSecret(password, recoveryKey) };
  if (noteKeyHex) bundle.noteKey = await wrapSecret(noteKeyHex, recoveryKey);
  if (journalKeyHex) bundle.journalKey = await wrapSecret(journalKeyHex, recoveryKey);
  return bundle;
}

/**
 * Reverses buildRecoveryBundle. Returns { password: null, ... } (every
 * field null) if the recovery key is wrong, so the caller can show a
 * plain "incorrect recovery key" message. A missing noteKey/journalKey in
 * the bundle (nothing was locked yet when it was made) unwraps to null
 * for that field specifically without affecting the others.
 */
export function unwrapRecoveryBundle(bundle, recoveryKey) {
  if (!bundle) return { password: null, noteKeyHex: null, journalKeyHex: null };
  // v1 bundles (pre-dating note/journal key coverage) were just the
  // wrapped password itself, not a {v, password, ...} container.
  if (!bundle.v && bundle.iv && bundle.ciphertext) {
    return { password: unwrapSecret(bundle, recoveryKey), noteKeyHex: null, journalKeyHex: null };
  }
  return {
    password: unwrapSecret(bundle.password, recoveryKey),
    noteKeyHex: bundle.noteKey ? unwrapSecret(bundle.noteKey, recoveryKey) : null,
    journalKeyHex: bundle.journalKey ? unwrapSecret(bundle.journalKey, recoveryKey) : null,
  };
}

export async function saveRecoveryBundle(bundle) {
  await SecureStore.setItemAsync(RECOVERY_BUNDLE_KEY, JSON.stringify(bundle));
}

export async function getRecoveryBundle() {
  const raw = await SecureStore.getItemAsync(RECOVERY_BUNDLE_KEY).catch(() => null);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch (e) {
      // fall through to legacy lookup below
    }
  }
  // Fall back to a v1-only envelope from before note/journal key coverage
  // existed, so a recovery key generated before this update still works.
  const legacyRaw = await SecureStore.getItemAsync(LEGACY_RECOVERY_ENVELOPE_KEY).catch(() => null);
  if (!legacyRaw) return null;
  try {
    return JSON.parse(legacyRaw);
  } catch (e) {
    return null;
  }
}

export async function clearRecoveryBundle() {
  await SecureStore.deleteItemAsync(RECOVERY_BUNDLE_KEY).catch(() => {});
  await SecureStore.deleteItemAsync(LEGACY_RECOVERY_ENVELOPE_KEY).catch(() => {});
}
