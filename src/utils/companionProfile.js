import AsyncStorage from './secureStorage'; // encrypted at rest -- see secureStorage.js

const NAME_KEY = 'a_companion_name_v1';
export const DEFAULT_COMPANION_NAME = 'لولو';

export async function getCompanionName() {
  const stored = await AsyncStorage.getItem(NAME_KEY);
  return stored || DEFAULT_COMPANION_NAME;
}

export async function setCompanionName(name) {
  const trimmed = (name || '').trim().slice(0, 20);
  await AsyncStorage.setItem(NAME_KEY, trimmed || DEFAULT_COMPANION_NAME);
  return trimmed || DEFAULT_COMPANION_NAME;
}
