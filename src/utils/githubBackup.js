import * as FileSystem from 'expo-file-system';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from './secureStorage'; // encrypted at rest -- see secureStorage.js

// The GitHub token + repo settings are secrets -> SecureStore (Keychain / Keystore).
const CONFIG_KEY = 'a_github_backup_config_v1';
// Non-sensitive bookkeeping (last run date/result) -> AsyncStorage (encrypted
// at rest by secureStorage.js, see the import above).
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

/**
 * Lists every backup file present in the configured GitHub folder, newest
 * first. Filenames are `backup-YYYY-MM-DD_HH-MM-SS.json` (see
 * timestampForFilename above), which sorts lexicographically in the same
 * order as chronologically, so no need to parse dates or hit the commits
 * API. Returns { ok, backups } or { ok: false, message }.
 */
export async function listGithubBackups() {
  const config = await getGithubConfig();
  if (!config || !config.token || !config.owner || !config.repo) {
    return { ok: false, message: 'GitHub backup is not configured yet.' };
  }

  const branch = config.branch || 'main';
  const folder = (config.folder || 'backups').replace(/^\/+|\/+$/g, '');

  try {
    const response = await fetch(
      `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${folder}?ref=${encodeURIComponent(branch)}`,
      {
        headers: {
          Authorization: `Bearer ${config.token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      }
    );

    if (response.status === 404) {
      // Folder doesn't exist yet -> no backups have ever been uploaded.
      return { ok: true, backups: [] };
    }

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      return { ok: false, message: `GitHub API error ${response.status}: ${errBody.message || 'unknown error'}` };
    }

    const files = await response.json();
    const backups = (Array.isArray(files) ? files : [])
      .filter((f) => f && f.type === 'file' && /^backup-.*\.json$/.test(f.name))
      .sort((a, b) => (a.name < b.name ? 1 : a.name > b.name ? -1 : 0));

    return { ok: true, backups };
  } catch (e) {
    return { ok: false, message: `Network/unexpected error: ${e.message || e}` };
  }
}

/**
 * Base64 (as returned by the GitHub Contents API, which may contain
 * embedded newlines) -> UTF-8 text, via the same temp-file round-trip
 * utf8JsonToBase64 uses in the other direction (RN has no reliable
 * built-in atob() for non-latin1 content).
 */
async function base64ToUtf8Text(base64) {
  const clean = base64.replace(/\n/g, '');
  await FileSystem.writeAsStringAsync(TMP_FILE, clean, { encoding: FileSystem.EncodingType.Base64 });
  const text = await FileSystem.readAsStringAsync(TMP_FILE, { encoding: FileSystem.EncodingType.UTF8 });
  FileSystem.deleteAsync(TMP_FILE, { idempotent: true }).catch(() => {});
  return text;
}

/**
 * Downloads and parses the most recent backup file from the configured
 * GitHub repo/folder. Returns { ok: true, payload, name, path } — payload
 * is the raw parsed JSON (still password-encrypted if it was uploaded that
 * way; the caller handles decryption same as a locally-imported file).
 * Returns { ok: false, message } on any failure, including "no backups
 * found yet".
 */
export async function downloadLatestBackupFromGithub() {
  const listResult = await listGithubBackups();
  if (!listResult.ok) return listResult;
  if (!listResult.backups.length) {
    return { ok: false, message: 'No backups were found in the configured GitHub folder yet.' };
  }

  const latest = listResult.backups[0];
  const config = await getGithubConfig();
  const branch = config.branch || 'main';

  try {
    const response = await fetch(
      `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${latest.path}?ref=${encodeURIComponent(branch)}`,
      {
        headers: {
          Authorization: `Bearer ${config.token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      }
    );

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      return { ok: false, message: `GitHub API error ${response.status}: ${errBody.message || 'unknown error'}` };
    }

    const fileData = await response.json();
    let jsonString;

    if (fileData.content) {
      // Normal case: file is small enough that the Contents API inlines it.
      jsonString = await base64ToUtf8Text(fileData.content);
    } else if (fileData.download_url) {
      // The Contents API omits `content` for files over ~1MB; fall back to
      // fetching the raw file directly in that case.
      const rawResponse = await fetch(fileData.download_url, {
        headers: { Authorization: `Bearer ${config.token}` },
      });
      if (!rawResponse.ok) {
        return { ok: false, message: `GitHub API error ${rawResponse.status}: could not download backup file.` };
      }
      jsonString = await rawResponse.text();
    } else {
      return { ok: false, message: 'Unexpected response from GitHub while downloading the backup.' };
    }

    const payload = JSON.parse(jsonString);
    return { ok: true, payload, name: latest.name, path: latest.path };
  } catch (e) {
    return { ok: false, message: `Network/unexpected error: ${e.message || e}` };
  }
}
