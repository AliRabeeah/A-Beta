import AsyncStorage from './secureStorage'; // encrypted at rest -- see secureStorage.js

const VIEW_MODE_KEY = 'a_notes_view_mode'; // 'grid' | 'list'

export const DEFAULT_NOTES_VIEW_MODE = 'grid';

export async function getNotesViewMode() {
  const raw = await AsyncStorage.getItem(VIEW_MODE_KEY);
  return raw === 'list' ? 'list' : DEFAULT_NOTES_VIEW_MODE;
}

export async function setNotesViewMode(mode) {
  await AsyncStorage.setItem(VIEW_MODE_KEY, mode === 'list' ? 'list' : 'grid');
}
