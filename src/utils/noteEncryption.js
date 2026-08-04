import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import CryptoJS from 'crypto-js';

/**
 * Encrypts the content of locked notes before they're ever written to a
 * backup file or uploaded to GitHub, so a backup (local file, or the repo
 * it's pushed to) never contains a locked note's title/content in plain
 * text — closing the gap where the in-app "lock" was previously cosmetic
 * only at the storage layer.
 *
 * Design:
 *  - A random 256-bit AES key is generated once (via expo-crypto's CSPRNG,
 *    not Math.random) and kept ONLY in SecureStore (Android Keystore / iOS
 *    Keychain) on this device — it is never included in any backup itself.
 *  - Each locked note is encrypted individually with AES-256-CBC and a
 *    fresh random IV per note (IV is not secret, it's stored alongside the
 *    ciphertext, which is standard practice).
 *  - Because the key never leaves the device, a backup can only be fully
 *    restored (locked notes included) on the SAME device install. On a
 *    different device/reinstall, locked notes come back still marked
 *    isLocked with empty content and decryptFailed: true instead of
 *    silently losing the lock flag or throwing — see decryptNotesFromBackup.
 */

const KEY_STORE_KEY = 'a_note_backup_key_v1';
const SENSITIVE_FIELDS = ['title', 'content', 'blocks', 'checklistItems'];

function bytesToHex(bytes) {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function getOrCreateBackupKey() {
  let keyHex = await SecureStore.getItemAsync(KEY_STORE_KEY).catch(() => null);
  if (!keyHex) {
    const randomBytes = await Crypto.getRandomBytesAsync(32); // 256-bit key
    keyHex = bytesToHex(randomBytes);
    await SecureStore.setItemAsync(KEY_STORE_KEY, keyHex);
  }
  return keyHex;
}

async function encryptString(plainText, keyHex) {
  const ivBytes = await Crypto.getRandomBytesAsync(16);
  const ivHex = bytesToHex(ivBytes);
  const key = CryptoJS.enc.Hex.parse(keyHex);
  const iv = CryptoJS.enc.Hex.parse(ivHex);
  const encrypted = CryptoJS.AES.encrypt(plainText, key, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });
  // Stored as "ivHex:ciphertextBase64" — the IV travels with the
  // ciphertext (normal practice; it doesn't need to stay secret).
  return `${ivHex}:${encrypted.ciphertext.toString(CryptoJS.enc.Base64)}`;
}

function decryptString(payload, keyHex) {
  const [ivHex, cipherBase64] = String(payload).split(':');
  if (!ivHex || !cipherBase64) throw new Error('Malformed encrypted note payload');
  const key = CryptoJS.enc.Hex.parse(keyHex);
  const iv = CryptoJS.enc.Hex.parse(ivHex);
  const cipherParams = CryptoJS.lib.CipherParams.create({
    ciphertext: CryptoJS.enc.Base64.parse(cipherBase64),
  });
  const decrypted = CryptoJS.AES.decrypt(cipherParams, key, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });
  const text = decrypted.toString(CryptoJS.enc.Utf8);
  if (!text) throw new Error('Decryption produced empty output (wrong key?)');
  return text;
}

/**
 * Returns a new notes array where every note with isLocked === true has
 * its title/content/blocks/checklistItems replaced by a single encrypted
 * blob. Notes that aren't locked pass through unchanged. Safe to call with
 * an empty/undefined array.
 */
export async function encryptNotesForBackup(notes) {
  const list = notes || [];
  if (!list.some((n) => n?.isLocked)) return list;

  const keyHex = await getOrCreateBackupKey();

  return Promise.all(
    list.map(async (note) => {
      if (!note?.isLocked) return note;

      const sensitive = {};
      for (const field of SENSITIVE_FIELDS) sensitive[field] = note[field] ?? null;

      const encryptedPayload = await encryptString(JSON.stringify(sensitive), keyHex);

      const safeCopy = { ...note };
      for (const field of SENSITIVE_FIELDS) delete safeCopy[field];

      return { ...safeCopy, encrypted: true, encryptedPayload };
    })
  );
}

/**
 * Reverses encryptNotesForBackup for notes coming back from a restored
 * backup file. Notes without `encrypted: true` pass through unchanged
 * (covers older, pre-encryption backups too). If the on-device key can't
 * decrypt a note (different device/reinstall, or corrupted payload), the
 * note is kept locked with empty content and `decryptFailed: true` rather
 * than throwing or silently discarding the lock.
 */
export async function decryptNotesFromBackup(notes) {
  const list = notes || [];
  if (!list.some((n) => n?.encrypted)) return list;

  const keyHex = await SecureStore.getItemAsync(KEY_STORE_KEY).catch(() => null);

  return list.map((note) => {
    if (!note?.encrypted) return note;

    const { encrypted, encryptedPayload, ...rest } = note;

    if (!keyHex) {
      return { ...rest, isLocked: true, decryptFailed: true, title: '', content: '', blocks: [], checklistItems: [] };
    }

    try {
      const sensitive = JSON.parse(decryptString(encryptedPayload, keyHex));
      return { ...rest, ...sensitive, isLocked: true };
    } catch (e) {
      return { ...rest, isLocked: true, decryptFailed: true, title: '', content: '', blocks: [], checklistItems: [] };
    }
  });
}
