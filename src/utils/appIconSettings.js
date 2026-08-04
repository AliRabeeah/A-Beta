// Wrapper around @sefatunckanat/expo-dynamic-app-icon so the rest of the
// app never touches the native module directly. Falls back to no-ops if
// the module isn't available yet (e.g. running in Expo Go before a dev
// client rebuild that includes the plugin's native code).
import { Platform } from 'react-native';

let nativeModule = null;
try {
  // eslint-disable-next-line global-require
  nativeModule = require('@sefatunckanat/expo-dynamic-app-icon');
} catch (e) {
  nativeModule = null;
}

// `null` always represents the app's original/default icon.
export const APP_ICON_OPTIONS = [
  { id: null, nameKey: 'appIconDefault', thumbnail: require('../../assets/icon.png') },
  { id: 'navy', nameKey: 'appIconNavy', thumbnail: require('../../assets/app-icons/navy.png') },
  { id: 'onyx', nameKey: 'appIconOnyx', thumbnail: require('../../assets/app-icons/onyx.png') },
  { id: 'espresso', nameKey: 'appIconEspresso', thumbnail: require('../../assets/app-icons/espresso.png') },
  { id: 'sage', nameKey: 'appIconSage', thumbnail: require('../../assets/app-icons/sage.png') },
  { id: 'cream', nameKey: 'appIconCream', thumbnail: require('../../assets/app-icons/cream.png') },
  { id: 'amber', nameKey: 'appIconAmber', thumbnail: require('../../assets/app-icons/amber.png') },
  { id: 'infinity', nameKey: 'appIconInfinity', thumbnail: require('../../assets/app-icons/infinity.png') },
];

export const isAppIconSwitchingAvailable = () => Platform.OS === 'android' && !!nativeModule;

export const getCurrentAppIcon = () => {
  if (!nativeModule) return null;
  try {
    const current = nativeModule.getAppIcon();
    return current && current !== 'DEFAULT' ? current : null;
  } catch (e) {
    return null;
  }
};

// Android only applies the change once the app is backgrounded, so the
// caller should tell the user to background/reopen the app if needed.
export const setCurrentAppIcon = async (iconId) => {
  if (!nativeModule) return false;
  try {
    await nativeModule.setAppIcon(iconId ?? null);
    return true;
  } catch (e) {
    return false;
  }
};
