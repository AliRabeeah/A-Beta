import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import CryptoJS from 'crypto-js';

/**
 * Encrypts EVERY value the app persists locally (habits, tasks, notes,
 * challenges, favorites, planning, wishlist, mood, settings — all of it),
 * not just the previously-special-cased locked notes. This is a drop-in
 * replacement for AsyncStorage: same getItem/setItem/removeItem contract,
 * used as `import AsyncStorage from './secureStorage'` in place of the
 * real package, so every existing context/screen keeps working completely
 * unchanged — only the import line differs.
 *
 * Design:
 *  - A random 256-bit AES key is generated once (expo-crypto CSPRNG, not
 *    Math.random) and lives ONLY in SecureStore (Android Keystore / iOS
 *    Keychain) on this device.
 *  - Each stored value gets AES-256-CBC with a fresh random IV.
 *  - SELF-MIGRATING: this app already had real user data sitting in plain
 *    AsyncStorage before this wrapper existed. On first read of each key,
 *    if the stored value doesn't look like our ciphertext format, it's
 *    treated as pre-existing plain text, returned as-is so nothing breaks,
 *    and quietly re-saved encrypted in the background so it's protected
 *    from then on. No separate migration step or app-start delay needed.
 *
 * Threat model: protects data at rest from anything that can read the
 * app's storage file directly without going through the OS keystore —
 * e.g. a file pulled off an unencrypted device backup, or another app on
 * a rooted device reading the SharedPreferences/plist file. It does NOT
 * protect against a fully compromised, unlocked, rooted device where an
 * attacker can also read the OS keystore itself — no on-device scheme can.
 */

const STORAGE_KEY_NAME = 'a_local_storage_key_v1';
const CIPHER_PREFIX = 'aslv1:'; // "A Secure Local v1" — marks our ciphertext format

let cachedKeyHex = null;
let keyPromise = null;

function bytesToHex(bytes) {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function getKey() {
  if (cachedKeyHex) return cachedKeyHex;
  if (!keyPromise) {
    keyPromise = (async () => {
      let keyHex = await SecureStore.getItemAsync(STORAGE_KEY_NAME).catch(() => null);
      if (!keyHex) {
        const randomBytes = await Crypto.getRandomBytesAsync(32);
        keyHex = bytesToHex(randomBytes);
        await SecureStore.setItemAsync(STORAGE_KEY_NAME, keyHex);
      }
      cachedKeyHex = keyHex;
      return keyHex;
    })();
  }
  return keyPromise;
}

async function encryptValue(plainText) {
  const keyHex = await getKey();
  const ivBytes = await Crypto.getRandomBytesAsync(16);
  const ivHex = bytesToHex(ivBytes);
  const key = CryptoJS.enc.Hex.parse(keyHex);
  const iv = CryptoJS.enc.Hex.parse(ivHex);
  const encrypted = CryptoJS.AES.encrypt(plainText, key, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });
  return `${CIPHER_PREFIX}${ivHex}:${encrypted.ciphertext.toString(CryptoJS.enc.Base64)}`;
}

async function decryptValue(stored) {
  const withoutPrefix = stored.slice(CIPHER_PREFIX.length);
  const [ivHex, cipherBase64] = withoutPrefix.split(':');
  if (!ivHex || !cipherBase64) throw new Error('Malformed encrypted value');
  const keyHex = await getKey();
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
  if (!text) throw new Error('Decryption produced empty output');
  return text;
}

async function getItem(key) {
  const stored = await AsyncStorage.getItem(key);
  if (stored == null) return null;

  if (!stored.startsWith(CIPHER_PREFIX)) {
    // Pre-existing plain-text value from before encryption was added (or
    // any other unexpected format). Don't lose the user's data over it —
    // hand it back as-is, and upgrade it in place for next time.
    encryptValue(stored)
      .then((cipher) => AsyncStorage.setItem(key, cipher))
      .catch(() => {}); // best-effort; a failed upgrade just retries next read
    return stored;
  }

  try {
    return await decryptValue(stored);
  } catch (e) {
    // Corrupted entry or a key mismatch (e.g. SecureStore was cleared
    // independently of AsyncStorage) — surfacing this data as unreadable
    // would look like silent data loss, so return null like a missing key
    // rather than throwing and crashing whichever screen reads it.
    return null;
  }
}

async function setItem(key, value) {
  const cipher = await encryptValue(value);
  return AsyncStorage.setItem(key, cipher);
}

async function removeItem(key) {
  return AsyncStorage.removeItem(key);
}

export default { getItem, setItem, removeItem };
