import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';

const BACKUP_FILE_NAME = 'a-backup.json';
export const BACKUP_VERSION = 1;

export function buildBackupPayload({
  habits,
  tasks,
  challenges,
  badges,
  favorites,
  notes,
  planningItems,
  wishlist,
  wishlistTags,
  accent,
  mode,
  language,
}) {
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
      notes: notes || [],
      planningItems: planningItems || [],
      wishlist: wishlist || [],
      wishlistTags: wishlistTags || [],
      accent,
      mode,
      language,
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
  if (!parsed?.data?.habits || !Array.isArray(parsed.data.habits)) {
    throw new Error('Invalid backup file format');
  }
  return parsed.data;
}
