import * as SecureStore from 'expo-secure-store';

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
}
