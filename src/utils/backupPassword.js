import * as SecureStore from 'expo-secure-store';
import {
  generateRecoveryKey,
  buildRecoveryBundle,
  unwrapRecoveryBundle,
  saveRecoveryBundle,
  getRecoveryBundle,
  clearRecoveryBundle,
} from './backupPasswordRecovery';
import { getOrCreateNoteKeyHex, restoreNoteKeyFromRecovery } from './noteEncryption';
import { getOrCreateJournalKeyHex, restoreJournalKeyFromRecovery } from './journalEncryption';

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

async function setBackupPassword(password) {
  if (!password) throw new Error('setBackupPassword requires a non-empty password');
  await SecureStore.setItemAsync(PASSWORD_KEY, password);
}

export async function clearBackupPassword() {
  await SecureStore.deleteItemAsync(PASSWORD_KEY).catch(() => {});
  await clearRecoveryBundle();
}

export { getRecoveryBundle };

/**
 * Sets the backup password AND (re)generates a recovery key covering it —
 * plus the on-device note/journal encryption keys, so a fresh
 * install restoring with this recovery key gets locked notes and journal
 * entries back too, not just the rest of the backup. Ensures those two
 * keys exist (creating them if this device has never locked anything yet)
 * so they're covered by the bundle even before the person locks their
 * first note.
 *
 * Every time the password is set or changed, a fresh recovery key is
 * issued (the old one, if any, stops working, matching how Signal
 * reissues its recovery key on a PIN change). Returns the plaintext
 * recovery key so the caller can show it to the person exactly once.
 */
export async function setBackupPasswordWithRecovery(password) {
  await setBackupPassword(password);
  const recoveryKey = await generateRecoveryKey();
  const [noteKeyHex, journalKeyHex] = await Promise.all([getOrCreateNoteKeyHex(), getOrCreateJournalKeyHex()]);
  const bundle = await buildRecoveryBundle({ password, noteKeyHex, journalKeyHex }, recoveryKey);
  await saveRecoveryBundle(bundle);
  return recoveryKey;
}

/**
 * Re-issues a fresh recovery key for the CURRENT backup password, without
 * changing the password itself — for "I lost my recovery key" in
 * Settings. The old recovery key (if any) stops working, same as above.
 */
export async function regenerateRecoveryKey() {
  const password = await getBackupPassword();
  if (!password) throw new Error('regenerateRecoveryKey requires a backup password to already be set');
  return setBackupPasswordWithRecovery(password);
}

/**
 * Recovers everything a recovery key can unlock: the backup password
 * itself, plus the note/journal encryption keys if the bundle has them.
 * `bundleFromFile`, when provided, is the recoveryBundle embedded in an
 * actual backup file being restored — this is what makes recovery work on
 * a completely fresh install with no local SecureStore data at all;
 * without it, only the locally-saved bundle (same-device recovery) is
 * tried. Returns the recovered password on success (also re-saving it
 * locally, so future auto-backups keep working without re-entering
 * anything), or null if the recovery key is wrong or there's no bundle to
 * try at all.
 */
export async function recoverFromRecoveryKey(recoveryKey, bundleFromFile = null) {
  const bundle = bundleFromFile || (await getRecoveryBundle());
  if (!bundle) return null;

  const { password, noteKeyHex, journalKeyHex } = unwrapRecoveryBundle(bundle, recoveryKey);
  if (!password) return null; // wrong recovery key, or a malformed/legacy bundle with nothing usable

  await setBackupPassword(password);
  await restoreNoteKeyFromRecovery(noteKeyHex);
  await restoreJournalKeyFromRecovery(journalKeyHex);
  // Re-anchor locally — important when bundleFromFile was used (fresh
  // install), so this device now has its own local copy for next time.
  await saveRecoveryBundle(bundle);

  return password;
}
