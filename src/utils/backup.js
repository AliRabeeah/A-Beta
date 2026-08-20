import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { encryptNotesForBackup } from './noteEncryption';
import { encryptJournalForBackup } from './journalEncryption';

const BACKUP_FILE_NAME = 'a-backup.json';
// v1 -> v2: added tabBarConfig, speedDialConfig, settingsSectionOrder, and
// widgetSettings/appIcon, so a restore recreates the exact layout (tab bar
// order, FAB speed-dial order, Settings section order, home-screen widget
// picks) the person had, not just their data. Old (v1) backup files are
// still importable — the extra fields are simply absent/undefined on them,
// and every restore step below is a no-op when its field is missing.
// v2 -> v3: added moods (the daily mood + note log), which had its own
// storage key and was being silently left out of every backup. Same
// backward-compatible pattern: absent on older files, skipped on restore.
export const BACKUP_VERSION = 3;

export async function buildBackupPayload({
  habits,
  tasks,
  challenges,
  badges,
  favorites,
  notes,
  planningItems,
  tableItems,
  journalEntries,
  moods,
  wishlist,
  wishlistTags,
  accent,
  mode,
  language,
  tabBarConfig,
  speedDialConfig,
  settingsSectionOrder,
  widgetSettings,
  appIcon,
}) {
  // Locked notes are encrypted here — the single point every export path
  // (manual file export, GitHub auto-backup) funnels through — so their
  // title/content never exists in plain text in the resulting payload.
  const safeNotes = await encryptNotesForBackup(notes || []);
  // Every journal entry is locked by design, so every entry is encrypted
  // here unconditionally (unlike notes, which only encrypt the ones
  // marked isLocked).
  const safeJournal = await encryptJournalForBackup(journalEntries || {});

  return {
    app: 'A',
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      habits,
      tasks: tasks || [],
      challenges: challenges || [],
      badges: badges || [],
      favorites: favorites || [],
      notes: safeNotes,
      planningItems: planningItems || [],
      tableItems: tableItems || [],
      journalEntries: safeJournal,
      moods: moods || {},
      wishlist: wishlist || [],
      wishlistTags: wishlistTags || [],
      accent,
      mode,
      language,
      // Layout/order & settings — see note above.
      tabBarConfig: tabBarConfig || undefined,
      speedDialConfig: speedDialConfig || undefined,
      settingsSectionOrder: settingsSectionOrder || undefined,
      widgetSettings: widgetSettings || undefined,
      appIcon: appIcon === undefined ? undefined : appIcon,
    },
  };
}

/**
 * Writes the backup JSON to a local file and opens the native share sheet
 * so the user can save it to Drive/Files/email/etc.
 */
export async function exportBackupToFile(payload) {
  const fileUri = FileSystem.cacheDirectory + BACKUP_FILE_NAME;
  await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(payload, null, 2), {
    encoding: FileSystem.EncodingType.UTF8,
  });

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(fileUri, {
      mimeType: 'application/json',
      dialogTitle: 'Save A backup',
      UTI: 'public.json',
    });
  }
  return fileUri;
}

/**
 * Opens a document picker for the user to select a .json backup file,
 * reads and parses it. Returns the parsed payload's `data` object, or
 * throws if the file is invalid.
 */
export async function importBackupFromFile() {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/plain', '*/*'],
    copyToCacheDirectory: true,
  });

  if (result.canceled) return null;

  const asset = result.assets?.[0];
  if (!asset?.uri) throw new Error('No file selected');

  const content = await FileSystem.readAsStringAsync(asset.uri, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  const parsed = JSON.parse(content);

  // Whole-backup password-encrypted envelope (see backupEncryption.js) —
  // there's no `.data` to validate yet, it needs a password first.
  if (parsed?.encrypted === true) {
    return { encrypted: true, envelope: parsed };
  }

  if (!parsed?.data?.habits || !Array.isArray(parsed.data.habits)) {
    throw new Error('Invalid backup file format');
  }
  return { encrypted: false, data: parsed.data };
}
