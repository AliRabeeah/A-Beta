import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import CryptoJS from 'crypto-js';

/**
 * Every journal entry is locked by design (see JournalUnlockGate), so —
 * mirroring noteEncryption.js exactly for locked notes — entries are
 * encrypted before they ever reach a backup file or GitHub auto-backup.
 * The AES key lives only in this device's SecureStore and is never
 * included in the backup itself, so a restored backup can only decrypt
 * entries on the SAME device install; see decryptJournalFromBackup.
 */

const KEY_STORE_KEY = 'a_journal_backup_key_v1'; // separate key from notes, deliberately
const SENSITIVE_FIELDS = ['content', 'promptUsed'];

function bytesToHex(bytes) {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function getOrCreateBackupKey() {
  let keyHex = await SecureStore.getItemAsync(KEY_STORE_KEY).catch(() => null);
  if (!keyHex) {
    const randomBytes = await Crypto.getRandomBytesAsync(32);
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
  const encrypted = CryptoJS.AES.encrypt(plainText, key, { iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 });
  return `${ivHex}:${encrypted.ciphertext.toString(CryptoJS.enc.Base64)}`;
}

function decryptString(payload, keyHex) {
  const [ivHex, cipherBase64] = String(payload).split(':');
  if (!ivHex || !cipherBase64) throw new Error('Malformed encrypted journal payload');
  const key = CryptoJS.enc.Hex.parse(keyHex);
  const iv = CryptoJS.enc.Hex.parse(ivHex);
  const cipherParams = CryptoJS.lib.CipherParams.create({ ciphertext: CryptoJS.enc.Base64.parse(cipherBase64) });
  const decrypted = CryptoJS.AES.decrypt(cipherParams, key, { iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 });
  const text = decrypted.toString(CryptoJS.enc.Utf8);
  if (!text) throw new Error('Decryption produced empty output (wrong key?)');
  return text;
}

/**
 * Encrypts every entry in the { 'YYYY-MM-DD': {content, ...} } map for
 * inclusion in a backup. Safe to call with an empty/undefined map.
 */
export async function encryptJournalForBackup(entries) {
  const map = entries || {};
  const dates = Object.keys(map);
  if (dates.length === 0) return map;

  const keyHex = await getOrCreateBackupKey();
  const out = {};
  for (const date of dates) {
    const entry = map[date];
    const sensitive = {};
    for (const field of SENSITIVE_FIELDS) sensitive[field] = entry[field] ?? null;
    const encryptedPayload = await encryptString(JSON.stringify(sensitive), keyHex);

    const safeCopy = { ...entry };
    for (const field of SENSITIVE_FIELDS) delete safeCopy[field];

    out[date] = { ...safeCopy, encrypted: true, encryptedPayload };
  }
  return out;
}

/**
 * Reverses encryptJournalForBackup. Entries that can't be decrypted (no
 * on-device key — a different device/reinstall — or a corrupted payload)
 * come back with decryptFailed: true and empty content, rather than
 * throwing or silently dropping the entry.
 */
export async function decryptJournalFromBackup(entries) {
  const map = entries || {};
  const dates = Object.keys(map);
  if (dates.length === 0) return map;
  if (!dates.some((d) => map[d]?.encrypted)) return map;

  const keyHex = await SecureStore.getItemAsync(KEY_STORE_KEY).catch(() => null);

  const out = {};
  for (const date of dates) {
    const entry = map[date];
    if (!entry?.encrypted) { out[date] = entry; continue; }

    const { encrypted, encryptedPayload, ...rest } = entry;
    if (!keyHex) {
      out[date] = { ...rest, decryptFailed: true, content: '', promptUsed: null };
      continue;
    }
    try {
      const sensitive = JSON.parse(decryptString(encryptedPayload, keyHex));
      out[date] = { ...rest, ...sensitive };
    } catch (e) {
      out[date] = { ...rest, decryptFailed: true, content: '', promptUsed: null };
    }
  }
  return out;
}
