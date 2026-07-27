import * as FileSystem from 'expo-file-system';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

// The GitHub token + repo settings are secrets -> SecureStore (Keychain / Keystore).
const CONFIG_KEY = 'a_github_backup_config_v1';
// Non-sensitive bookkeeping (last run date/result) -> plain AsyncStorage.
const STATUS_KEY = 'a_github_backup_status_v1';

const TMP_FILE = FileSystem.cacheDirectory + 'a-github-backup-tmp.json';

/**
 * config shape: { token, owner, repo, branch, folder }
 */
export async function saveGithubConfig(config) {
  await SecureStore.setItemAsync(CONFIG_KEY, JSON.stringify(config));
}

export async function getGithubConfig() {
  const raw = await SecureStore.getItemAsync(CONFIG_KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function clearGithubConfig() {
  await SecureStore.deleteItemAsync(CONFIG_KEY);
}

export async function getLastBackupStatus() {
  const raw = await AsyncStorage.getItem(STATUS_KEY);
  return raw ? JSON.parse(raw) : null;
}

async function setLastBackupStatus(status) {
  await AsyncStorage.setItem(STATUS_KEY, JSON.stringify(status));
}

function pad(n) {
  return String(n).length < 2 ? '0' + n : String(n);
}

function timestampForFilename(d) {
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`
  );
}

function dateKey(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Returns true if we have NOT already run a successful auto-backup today.
 */
export async function shouldRunAutoBackupToday() {
  const status = await getLastBackupStatus();
  if (!status || status.ok !== true) return true;
  return status.lastSuccessDateKey !== dateKey(new Date());
}

/**
 * Encodes a UTF-8 JSON string to base64 safely (handles Arabic / any unicode)
 * by round-tripping through a temp file, since RN has no reliable global
 * btoa() for non-latin1 text.
 */
async function utf8JsonToBase64(jsonString) {
  await FileSystem.writeAsStringAsync(TMP_FILE, jsonString, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  const base64 = await FileSystem.readAsStringAsync(TMP_FILE, {
    encoding: FileSystem.EncodingType.Base64,
  });
  FileSystem.deleteAsync(TMP_FILE, { idempotent: true }).catch(() => {});
  return base64;
}

/**
 * Uploads the given payload object as a new JSON file in the configured
 * GitHub repo, using the Contents API (creates a new commit).
 * Returns { ok, message, path, url } — never throws; failures come back as { ok: false, message }.
 */
export async function uploadBackupToGithub(payload) {
  const config = await getGithubConfig();
  if (!config || !config.token || !config.owner || !config.repo) {
    return { ok: false, message: 'GitHub backup is not configured yet.' };
  }

  const branch = config.branch || 'main';
  const folder = (config.folder || 'backups').replace(/^\/+|\/+$/g, '');
  const now = new Date();
  const path = `${folder}/backup-${timestampForFilename(now)}.json`;

  try {
    const jsonString = JSON.stringify(payload, null, 2);
    const contentBase64 = await utf8JsonToBase64(jsonString);

    const response = await fetch(
      `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${path}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${config.token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `A auto-backup ${dateKey(now)}`,
          content: contentBase64,
          branch,
        }),
      }
    );

    if (response.ok) {
      const result = { ok: true, path, lastSuccessDateKey: dateKey(now), at: now.toISOString() };
      await setLastBackupStatus(result);
      console.log(`[A GitHub Backup] SUCCESS: uploaded ${path} to ${config.owner}/${config.repo}@${branch}`);
      return { ok: true, message: `Backup uploaded: ${path}`, path };
    }

    const errBody = await response.json().catch(() => ({}));
    const message = `GitHub API error ${response.status}: ${errBody.message || 'unknown error'}`;
    await setLastBackupStatus({ ok: false, message, at: now.toISOString() });
    console.log(`[A GitHub Backup] FAILED: ${message}`);
    return { ok: false, message };
  } catch (e) {
    const message = `Network/unexpected error: ${e.message || e}`;
    await setLastBackupStatus({ ok: false, message, at: now.toISOString() });
    console.log(`[A GitHub Backup] FAILED: ${message}`);
    return { ok: false, message };
  }
}
