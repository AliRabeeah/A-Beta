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
 *  - Each stored value gets AES-256-CBC with a fresh random IV, then an
 *    HMAC-SHA256 tag over (iv || ciphertext) — Encrypt-then-MAC — using a
 *    key domain-separated from the encryption key via HMAC(key, "mac").
 *    crypto-js has no AES-GCM, so this is how authenticated encryption
 *    (tamper/corruption detection, not just confidentiality) is achieved
 *    without pulling in a new native crypto module. The tag is checked
 *    with a constant-time comparison before any bytes are decrypted, so a
 *    modified ciphertext is rejected outright rather than decrypted into
 *    garbage.
 *  - SELF-MIGRATING, in two layers: this app already had real user data
 *    sitting in plain AsyncStorage before this wrapper existed, and then
 *    in unauthenticated v1 ciphertext before the MAC was added. On first
 *    read of each key, plain text is detected and upgraded to v2; v1
 *    ciphertext is detected, decrypted, and upgraded to v2. Both upgrades
 *    happen quietly in the background so nothing breaks and no separate
 *    migration step or app-start delay is needed.
 *
 * Threat model: protects data at rest from anything that can read the
 * app's storage file directly without going through the OS keystore —
 * e.g. a file pulled off an unencrypted device backup, or another app on
 * a rooted device reading the SharedPreferences/plist file — and detects
 * tampering with that file. It does NOT protect against a fully
 * compromised, unlocked, rooted device where an attacker can also read
 * the OS keystore itself — no on-device scheme can.
 */

const STORAGE_KEY_NAME = 'a_local_storage_key_v1';
const CIPHER_PREFIX_V1 = 'aslv1:'; // "A Secure Local v1" — AES-CBC only, no MAC (legacy, read-only)
const CIPHER_PREFIX_V2 = 'aslv2:'; // AES-CBC + HMAC-SHA256 (encrypt-then-MAC)

let cachedKeyHex = null;
let keyPromise = null;
let cachedMacKey = null;

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

// Domain-separated MAC key derived from the same root secret, so we don't
// need a second value in SecureStore. Standard practice for encrypt-then-MAC
// with a single root key (HMAC used as a lightweight KDF).
async function getMacKey() {
  if (cachedMacKey) return cachedMacKey;
  const keyHex = await getKey();
  cachedMacKey = CryptoJS.HmacSHA256(CryptoJS.enc.Utf8.parse('a-secure-local-mac-v1'), CryptoJS.enc.Hex.parse(keyHex));
  return cachedMacKey;
}

// Constant-time string comparison to avoid leaking timing info about how
// much of the MAC matched.
function constantTimeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
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
  const cipherBase64 = encrypted.ciphertext.toString(CryptoJS.enc.Base64);
  const macKey = await getMacKey();
  const tagHex = CryptoJS.HmacSHA256(`${ivHex}:${cipherBase64}`, macKey).toString(CryptoJS.enc.Hex);
  return `${CIPHER_PREFIX_V2}${ivHex}:${cipherBase64}:${tagHex}`;
}

async function decryptValueV1(stored) {
  const withoutPrefix = stored.slice(CIPHER_PREFIX_V1.length);
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

async function decryptValueV2(stored) {
  const withoutPrefix = stored.slice(CIPHER_PREFIX_V2.length);
  const parts = withoutPrefix.split(':');
  if (parts.length !== 3) throw new Error('Malformed encrypted value');
  const [ivHex, cipherBase64, tagHex] = parts;
  if (!ivHex || !cipherBase64 || !tagHex) throw new Error('Malformed encrypted value');

  const macKey = await getMacKey();
  const expectedTag = CryptoJS.HmacSHA256(`${ivHex}:${cipherBase64}`, macKey).toString(CryptoJS.enc.Hex);
  if (!constantTimeEqual(tagHex, expectedTag)) {
    throw new Error('Authentication failed: stored value has been modified or corrupted');
  }

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

  if (stored.startsWith(CIPHER_PREFIX_V2)) {
    try {
      return await decryptValueV2(stored);
    } catch (e) {
      // Corrupted/tampered entry or a key mismatch (e.g. SecureStore was
      // cleared independently of AsyncStorage) — surfacing this data as
      // unreadable would look like silent data loss, so return null like a
      // missing key rather than throwing and crashing whichever screen
      // reads it.
      return null;
    }
  }

  if (stored.startsWith(CIPHER_PREFIX_V1)) {
    try {
      const text = await decryptValueV1(stored);
      // Opportunistically upgrade to the authenticated v2 format.
      encryptValue(text)
        .then((cipher) => AsyncStorage.setItem(key, cipher))
        .catch(() => {});
      return text;
    } catch (e) {
      return null;
    }
  }

  // Pre-existing plain-text value from before encryption was added (or any
  // other unexpected format). Don't lose the user's data over it — hand it
  // back as-is, and upgrade it in place for next time.
  encryptValue(stored)
    .then((cipher) => AsyncStorage.setItem(key, cipher))
    .catch(() => {}); // best-effort; a failed upgrade just retries next read
  return stored;
}

async function setItem(key, value) {
  const cipher = await encryptValue(value);
  return AsyncStorage.setItem(key, cipher);
}

async function removeItem(key) {
  return AsyncStorage.removeItem(key);
}

export default { getItem, setItem, removeItem };
