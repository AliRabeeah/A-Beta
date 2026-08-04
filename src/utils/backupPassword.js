import * as SecureStore from 'expo-secure-store';
import {
  generateRecoveryKey,
  wrapBackupPassword,
  unwrapBackupPassword,
  saveRecoveryEnvelope,
  getRecoveryEnvelope,
  clearRecoveryEnvelope,
} from './backupPasswordRecovery';

/**
 * The whole-backup password is itself a secret -> SecureStore, same as the
 * GitHub token, TMDb key, and App Lock PIN. It's kept on-device so the
 * unattended GitHub auto-backup (see AutoGithubBackup.js) can encrypt
 * every backup without a prompt; manual export/import in Settings uses
 * the same stored password too, with an option to change or remove it.
 */
const PASSWORD_KEY = 'a_backup_password_v1';

export async function getBackupPassword() {
  return SecureStore.getItemAsync(PASSWORD_KEY).catch(() => null);
}

export async function hasBackupPassword() {
  return !!(await getBackupPassword());
}

export async function setBackupPassword(password) {
  if (!password) throw new Error('setBackupPassword requires a non-empty password');
  await SecureStore.setItemAsync(PASSWORD_KEY, password);
}

export async function clearBackupPassword() {
  await SecureStore.deleteItemAsync(PASSWORD_KEY).catch(() => {});
  await clearRecoveryEnvelope();
}

/**
 * Sets the backup password AND (re)generates a recovery key for it, in one
 * step — every time the password is set or changed, a fresh recovery key
 * is issued (the old one, if any, stops working, matching how Signal
 * reissues its recovery key on a PIN change). Returns the plaintext
 * recovery key so the caller can show it to the person exactly once.
 */
export async function setBackupPasswordWithRecovery(password) {
  await setBackupPassword(password);
  const recoveryKey = await generateRecoveryKey();
  const envelope = await wrapBackupPassword(password, recoveryKey);
  await saveRecoveryEnvelope(envelope);
  return recoveryKey;
}

export { getRecoveryEnvelope };

/**
 * Recovers the backup password using a recovery key, against a wrapped
 * envelope — either the one stored locally (same-device recovery) or one
 * pulled from an actual backup file's plaintext header (recovery on a
 * fresh install, using only a GitHub/exported backup + the recovery key).
 * On success, also re-saves the password locally so future auto-backups
 * work again without re-entering anything. Returns the password, or null
 * if the recovery key is wrong.
 */
export async function recoverBackupPassword(recoveryKey, envelope = null) {
  const source = envelope || (await getRecoveryEnvelope());
  if (!source) return null;
  const password = unwrapBackupPassword(source, recoveryKey);
  if (!password) return null;
  await setBackupPassword(password);
  // Re-anchor the local recovery envelope too, in case recovery happened
  // from a backup file's embedded copy on a fresh install.
  await saveRecoveryEnvelope(source);
  return password;
}

