import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView, Linking, TextInput, Switch, LayoutAnimation, Platform, UIManager } from 'react-native';
import AsyncStorage from '../utils/secureStorage'; // encrypted at rest -- see secureStorage.js

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Smooth expand/collapse used by every foldable settings section.
const animateLayout = () => LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
import { Ionicons } from '@expo/vector-icons';
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { withAlpha } from '../theme/tokens';
import { useLanguage } from '../i18n/LanguageContext';
import { useHabits } from '../context/HabitContext';
import { useTasks } from '../context/TaskContext';
import { useChallenges } from '../context/ChallengeContext';
import { useFavorites } from '../context/FavoriteContext';
import { useWishlist } from '../context/WishlistContext';
import { useNotes } from '../context/NoteContext';
import { usePlanning } from '../context/PlanningContext';
import { useTabBar, MIN_TABS, MAX_TABS } from '../context/TabBarContext';
import { useSpeedDial, MIN_SHORTCUTS, MAX_SHORTCUTS } from '../context/SpeedDialContext';
import { useAppLock, AUTO_LOCK_OPTIONS } from '../context/AppLockContext';
import { isBiometricAvailable } from '../utils/biometricAuth';
import {
  ensurePermission,
  getPermissionStatus,
  ensureDayClosingReminder,
  cancelDayClosingReminder,
  ensureWeeklyReviewReminder,
  cancelWeeklyReviewReminder,
} from '../utils/notifications';
import {
  getDayClosingReminderEnabled,
  setDayClosingReminderEnabled,
  getDayClosingReminderTime,
  setDayClosingReminderTime,
} from '../utils/dayClosingSettings';
import {
  getWeeklyReviewEnabled,
  setWeeklyReviewEnabled,
  getWeeklyReviewTime,
  setWeeklyReviewTime,
  getWeeklyReviewWeekday,
  setWeeklyReviewWeekday,
} from '../utils/weeklyReviewSettings';
import { buildBackupPayload, exportBackupToFile, importBackupFromFile } from '../utils/backup';
import { decryptNotesFromBackup } from '../utils/noteEncryption';
import { getBackupPassword, hasBackupPassword, setBackupPassword, clearBackupPassword } from '../utils/backupPassword';
import { encryptPayloadWithPassword, decryptPayloadWithPassword } from '../utils/backupEncryption';
import { saveGithubConfig, getGithubConfig, uploadBackupToGithub, getLastBackupStatus, downloadLatestBackupFromGithub } from '../utils/githubBackup';
import { SETTINGS_SECTION_ORDER_KEY, DEFAULT_SETTINGS_SECTION_ORDER, setSettingsSectionOrder } from '../utils/settingsSectionOrder';
import { getWidgetOpacity, setWidgetOpacity, getFocusHabitId, setFocusHabitId, getHeatmapHabitId, setHeatmapHabitId } from '../utils/widgetSettings';
import { refreshTodayWidget } from '../utils/widgetSync';
import { APP_ICON_OPTIONS, isAppIconSwitchingAvailable, getCurrentAppIcon, setCurrentAppIcon } from '../utils/appIconSettings';

const SWITCH_ON_COLOR = '#0A84FF';
const SWITCH_OFF_THUMB = '#f4f3f4';

// Every top-level Settings card, in its default order. An explicit "Edit
// order" toggle switches to a compact list you can long-press and drag to
// reorder (react-native-draggable-flatlist — same mechanism already used
// on the Today screen and the side drawer). The chosen order is persisted
// here so it survives app restarts.
const isValidHexColor = (value) => /^[0-9a-fA-F]{6}$/.test(value) || /^[0-9a-fA-F]{3}$/.test(value);
const normalizeHexColor = (value) => {
  const v = value.length === 3 ? value.split('').map((c) => c + c).join('') : value;
  return `#${v.toUpperCase()}`;
};

// Icon + label per section, used only by the compact "Edit order" list —
// kept separate from each section's full render() so that list stays tiny
// and has nothing to do with the (possibly long, expandable) card content.
const SETTINGS_SECTION_META = {
  language: { icon: 'language-outline', labelKey: 'languageSection' },
  appearance: { icon: 'contrast-outline', labelKey: 'appearance' },
  accent: { icon: 'color-palette-outline', labelKey: 'accentColorSection' },
  appIcon: { icon: 'apps-outline', labelKey: 'appIconSection' },
  tabBar: { icon: 'grid-outline', labelKey: 'tabBarCustomizeEntry' },
  speedDial: { icon: 'flash-outline', labelKey: 'speedDialCustomizeEntry' },
  appLock: { icon: 'lock-closed-outline', labelKey: 'appLockSection' },
  notifications: { icon: 'notifications-outline', labelKey: 'notifications' },
  widget: { icon: 'options-outline', labelKey: 'widgetSection' },
  backup: { icon: 'cloud-upload-outline', labelKey: 'backupSection' },
  trash: { icon: 'trash-outline', labelKey: 'trashEntry' },
  github: { icon: 'logo-github', labelKey: 'githubBackupToggle' },
  moodHistory: { icon: 'happy-outline', labelKey: 'viewMoodHistory' },
  dayClosing: { icon: 'moon-outline', labelKey: 'dayClosingReminderSection' },
  weeklyReview: { icon: 'calendar-outline', labelKey: 'weeklyReviewReminderSection' },
  quoteSettings: { icon: 'chatbox-ellipses-outline', labelKey: 'quoteSettingsEntry' },
  about: { icon: 'information-circle-outline', labelKey: 'aboutApp' },
};

export default function SettingsScreen({ navigation }) {
  const { colors, preference, setMode, accent, setAccent, presets } = useTheme();
  const { t, language, setLanguage, isRTL } = useLanguage();
  const { habits, replaceAllHabits } = useHabits();
  const { tasks, replaceAllTasks } = useTasks();
  const { challenges, badges, replaceAllChallenges, replaceAllBadges } = useChallenges();
  const { favorites, replaceAllFavorites } = useFavorites();
  const { items: wishlist, customTags: wishlistTags, replaceAllWishlist } = useWishlist();
  const { notes, replaceAllNotes } = useNotes();
  const { planningItems, replaceAllPlanningItems } = usePlanning();
  const { tabs: activeTabIds, toggleTab, reorderTabs, replaceTabs, pool: tabPool } = useTabBar();
  const {
    items: activeSpeedDialIds,
    toggleItem: toggleSpeedDialItem,
    reorderItems: reorderSpeedDialItems,
    replaceItems: replaceSpeedDialItems,
    pool: speedDialPool,
  } = useSpeedDial();
  const {
    enabled: lockEnabled,
    method: lockMethod,
    autoLockMinutes,
    hasPin,
    setEnabled: setLockEnabled,
    setMethod: setLockMethod,
    setAutoLockMinutes,
    setPin,
  } = useAppLock();
  const insets = useSafeAreaInsets();

  const [busy, setBusy] = useState(null); // 'export' | 'import' | null
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [pinModalMode, setPinModalMode] = useState(null); // null | 'set'
  const [pinDraft, setPinDraft] = useState('');
  const [pinConfirmDraft, setPinConfirmDraft] = useState('');

  // Whole-backup password (encrypts EVERYTHING in a backup, not just
  // locked notes) — see backupPassword.js / backupEncryption.js.
  const [backupPasswordSet, setBackupPasswordSet] = useState(false);
  const [bpModalMode, setBpModalMode] = useState(null); // null | 'set' | 'import'
  const [bpDraft, setBpDraft] = useState('');
  const [bpConfirmDraft, setBpConfirmDraft] = useState('');
  const [pendingImportEnvelope, setPendingImportEnvelope] = useState(null);


  const [dayClosingReminderOn, setDayClosingReminderOn] = useState(false);
  const [dayClosingTime, setDayClosingTimeState] = useState(() => {
    const d = new Date();
    d.setHours(21, 0, 0, 0);
    return d;
  });
  const [showDayClosingPicker, setShowDayClosingPicker] = useState(false);

  const [weeklyReviewOn, setWeeklyReviewOn] = useState(false);
  const [weeklyReviewTime, setWeeklyReviewTimeState] = useState(() => {
    const d = new Date();
    d.setHours(19, 0, 0, 0);
    return d;
  });
  const [weeklyReviewWeekday, setWeeklyReviewWeekdayState] = useState(1); // 1 = Sunday
  const [showWeeklyReviewPicker, setShowWeeklyReviewPicker] = useState(false);

  useEffect(() => {
    isBiometricAvailable().then(setBiometricAvailable);
    hasBackupPassword().then(setBackupPasswordSet);
    getDayClosingReminderEnabled().then(setDayClosingReminderOn);
    getDayClosingReminderTime().then((time) => {
      if (time) {
        const [h, m] = time.split(':').map(Number);
        const d = new Date();
        d.setHours(h, m, 0, 0);
        setDayClosingTimeState(d);
      }
    });
    getWeeklyReviewEnabled().then(setWeeklyReviewOn);
    getWeeklyReviewWeekday().then(setWeeklyReviewWeekdayState);
    getWeeklyReviewTime().then((time) => {
      if (time) {
        const [h, m] = time.split(':').map(Number);
        const d = new Date();
        d.setHours(h, m, 0, 0);
        setWeeklyReviewTimeState(d);
      }
    });
  }, []);

  const handleToggleAppLock = async (value) => {
    if (value && lockMethod === 'pin' && !hasPin) {
      setPinModalMode('set');
    }
    await setLockEnabled(value);
  };

  const handleSavePin = async () => {
    if (pinDraft.trim().length < 4) {
      Alert.alert(t('errorLabel'), t('pinTooShortError'));
      return;
    }
    if (pinDraft !== pinConfirmDraft) {
      Alert.alert(t('errorLabel'), t('appLockPinMismatch'));
      return;
    }
    await setPin(pinDraft.trim());
    setPinModalMode(null);
    setPinDraft('');
    setPinConfirmDraft('');
  };

  const handleSaveBackupPassword = async () => {
    if (bpDraft.length < 6) {
      Alert.alert(t('errorLabel'), t('backupPasswordTooShort'));
      return;
    }
    if (bpDraft !== bpConfirmDraft) {
      Alert.alert(t('errorLabel'), t('backupPasswordMismatch'));
      return;
    }
    await setBackupPassword(bpDraft);
    setBackupPasswordSet(true);
    setBpModalMode(null);
    setBpDraft('');
    setBpConfirmDraft('');
    Alert.alert(t('backupPasswordSavedTitle'), t('backupPasswordSavedBody'));
  };

  const handleRemoveBackupPassword = () => {
    Alert.alert(t('backupPasswordRemoveConfirmTitle'), t('backupPasswordRemoveConfirmBody'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'),
        style: 'destructive',
        onPress: async () => {
          await clearBackupPassword();
          setBackupPasswordSet(false);
        },
      },
    ]);
  };

  const handleToggleDayClosingReminder = async (value) => {
    setDayClosingReminderOn(value);
    await setDayClosingReminderEnabled(value);
    const timeStr = `${String(dayClosingTime.getHours()).padStart(2, '0')}:${String(dayClosingTime.getMinutes()).padStart(2, '0')}`;
    if (value) await ensureDayClosingReminder(timeStr);
    else await cancelDayClosingReminder();
  };

  const handleDayClosingTimeChange = async (event, selected) => {
    setShowDayClosingPicker(false);
    if (!selected) return;
    setDayClosingTimeState(selected);
    const timeStr = `${String(selected.getHours()).padStart(2, '0')}:${String(selected.getMinutes()).padStart(2, '0')}`;
    await setDayClosingReminderTime(timeStr);
    if (dayClosingReminderOn) await ensureDayClosingReminder(timeStr);
  };

  const handleToggleWeeklyReview = async (value) => {
    setWeeklyReviewOn(value);
    await setWeeklyReviewEnabled(value);
    const timeStr = `${String(weeklyReviewTime.getHours()).padStart(2, '0')}:${String(weeklyReviewTime.getMinutes()).padStart(2, '0')}`;
    if (value) await ensureWeeklyReviewReminder(weeklyReviewWeekday, timeStr);
    else await cancelWeeklyReviewReminder();
  };

  const handleWeeklyReviewTimeChange = async (event, selected) => {
    setShowWeeklyReviewPicker(false);
    if (!selected) return;
    setWeeklyReviewTimeState(selected);
    const timeStr = `${String(selected.getHours()).padStart(2, '0')}:${String(selected.getMinutes()).padStart(2, '0')}`;
    await setWeeklyReviewTime(timeStr);
    if (weeklyReviewOn) await ensureWeeklyReviewReminder(weeklyReviewWeekday, timeStr);
  };

  const handleWeeklyReviewWeekdayChange = async (weekday) => {
    setWeeklyReviewWeekdayState(weekday);
    await setWeeklyReviewWeekday(weekday);
    if (weeklyReviewOn) {
      const timeStr = `${String(weeklyReviewTime.getHours()).padStart(2, '0')}:${String(weeklyReviewTime.getMinutes()).padStart(2, '0')}`;
      await ensureWeeklyReviewReminder(weekday, timeStr);
    }
  };

  const [widgetOpacity, setWidgetOpacityState] = useState(100);
  const [permissionStatus, setPermissionStatus] = useState('undetermined');
  const [focusHabitId, setFocusHabitIdState] = useState(null);
  const [heatmapHabitId, setHeatmapHabitIdState] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(null); // 'focus' | 'heatmap' | null

  const [ghToken, setGhToken] = useState('');
  const [ghOwner, setGhOwner] = useState('');
  const [ghRepo, setGhRepo] = useState('');
  const [ghBranch, setGhBranch] = useState('main');
  const [ghFolder, setGhFolder] = useState('backups');
  const [ghSaving, setGhSaving] = useState(false);
  const [ghTesting, setGhTesting] = useState(false);
  const [ghRestoring, setGhRestoring] = useState(false);
  const [ghLastStatus, setGhLastStatus] = useState(null);
  const [ghConfigured, setGhConfigured] = useState(false);
  // Accordion: only one foldable section is expanded at a time, so the
  // page doesn't turn into a long wall of open panels.
  const [openSection, setOpenSectionState] = useState(null);
  const [selectedAppIcon, setSelectedAppIcon] = useState(() => getCurrentAppIcon());
  const [customColorOpen, setCustomColorOpen] = useState(false);
  const [customColorDraft, setCustomColorDraft] = useState('');
  const isCustomAccent = !presets.some((p) => p.value === accent);
  const setOpenSection = (id) => {
    animateLayout();
    setOpenSectionState((prev) => (prev === id ? null : id));
  };

  useEffect(() => {
    getWidgetOpacity().then(setWidgetOpacityState);
    getPermissionStatus().then(setPermissionStatus);
    getFocusHabitId().then(setFocusHabitIdState);
    getHeatmapHabitId().then(setHeatmapHabitIdState);
    getGithubConfig().then((cfg) => {
      if (cfg) {
        setGhToken(cfg.token || '');
        setGhOwner(cfg.owner || '');
        setGhRepo(cfg.repo || '');
        setGhBranch(cfg.branch || 'main');
        setGhFolder(cfg.folder || 'backups');
        setGhConfigured(true);
      }
    });
    getLastBackupStatus().then(setGhLastStatus);
  }, []);

  const handleSaveGithubConfig = async () => {
    if (!ghToken.trim() || !ghOwner.trim() || !ghRepo.trim()) {
      Alert.alert(t('githubBackupMissingFields'));
      return;
    }
    setGhSaving(true);
    try {
      await saveGithubConfig({
        token: ghToken.trim(),
        owner: ghOwner.trim(),
        repo: ghRepo.trim(),
        branch: (ghBranch || 'main').trim(),
        folder: (ghFolder || 'backups').trim(),
      });
      setGhConfigured(true);
      Alert.alert(t('githubBackupSaved'));
    } finally {
      setGhSaving(false);
    }
  };

  const handleTestGithubBackup = async () => {
    setGhTesting(true);
    try {
      const layout = await gatherLayoutForBackup();
      let payload = await buildBackupPayload({ habits, tasks, challenges, badges, favorites, notes, planningItems, wishlist, wishlistTags, accent, mode: preference, language, ...layout });
      const password = await getBackupPassword();
      if (password) payload = await encryptPayloadWithPassword(payload, password);
      const result = await uploadBackupToGithub(payload);
      setGhLastStatus(await getLastBackupStatus());
      Alert.alert(result.ok ? t('githubBackupTestSuccess') : t('githubBackupTestFailed'), result.message);
    } finally {
      setGhTesting(false);
    }
  };

  /**
   * Fetches the most recent backup directly from the configured GitHub
   * repo/folder (no file picker needed) and feeds it into the exact same
   * confirm + apply flow as importing a local file — including the
   * password prompt when the backup was uploaded encrypted.
   */
  const handleRestoreFromGithub = async () => {
    setGhRestoring(true);
    try {
      const result = await downloadLatestBackupFromGithub();
      if (!result.ok) {
        Alert.alert(t('githubRestoreFailed'), result.message);
        return;
      }

      const payload = result.payload;

      if (payload?.encrypted === true) {
        // Same password-prompt path handleImport uses for an encrypted
        // local file — handleSubmitImportPassword below calls
        // confirmAndApplyImport() once the password checks out.
        setPendingImportEnvelope(payload);
        setBpModalMode('import');
        return;
      }

      if (!payload?.data?.habits || !Array.isArray(payload.data.habits)) {
        Alert.alert(t('githubRestoreFailed'), t('importFailed'));
        return;
      }

      confirmAndApplyImport(payload.data);
    } catch (e) {
      Alert.alert(t('githubRestoreFailed'));
    } finally {
      setGhRestoring(false);
    }
  };

  const activeHabits = habits.filter((h) => !h.archived);

  // Small always-visible signal of backup freshness, so an overdue or
  // never-configured backup isn't hidden behind the collapsed accordion.
  const backupHealth = useMemo(() => {
    if (!ghConfigured) return { color: colors.textSecondary, label: t('backupHealthNotSet') };
    if (!ghLastStatus || ghLastStatus.ok !== true) return { color: colors.danger, label: t('backupHealthNever') };
    const daysAgo = Math.max(0, Math.floor((Date.now() - new Date(ghLastStatus.at).getTime()) / 86400000));
    if (daysAgo === 0) return { color: '#00E676', label: t('backupHealthToday') };
    if (daysAgo <= 2) return { color: '#FFD60A', label: t('backupHealthDaysAgo', daysAgo) };
    return { color: colors.danger, label: t('backupHealthDaysAgo', daysAgo) };
  }, [ghConfigured, ghLastStatus, colors.textSecondary, colors.danger, t]);

  const handlePickFocusHabit = async (habitId) => {
    setFocusHabitIdState(habitId);
    await setFocusHabitId(habitId);
    setPickerOpen(null);
    refreshTodayWidget(habits);
  };

  const handlePickHeatmapHabit = async (habitId) => {
    setHeatmapHabitIdState(habitId);
    await setHeatmapHabitId(habitId);
    setPickerOpen(null);
    refreshTodayWidget(habits);
  };

  const handleEnableReminders = async () => {
    const granted = await ensurePermission();
    setPermissionStatus(granted ? 'granted' : 'denied');
    if (!granted) {
      Alert.alert(t('notificationsBlockedTitle'), t('notificationsBlockedBody'), [
        { text: t('cancel'), style: 'cancel' },
        { text: t('batterySettings'), onPress: () => Linking.openSettings() },
      ]);
    }
  };

  const OPACITY_OPTIONS = [100, 75, 50, 25];

  const handleOpacityChange = async (value) => {
    setWidgetOpacityState(value);
    await setWidgetOpacity(value);
    refreshTodayWidget(habits);
  };

  const MODES = [
    { v: 'dark', l: t('dark'), icon: 'moon' },
    { v: 'light', l: t('light'), icon: 'sunny' },
    { v: 'system', l: t('system'), icon: 'phone-portrait' },
  ];

  const LANGS = [
    { v: 'en', l: t('english') },
    { v: 'ar', l: t('arabic') },
  ];

  // Shared by manual export, the GitHub "Backup now" test button, and the
  // (once-a-day) auto-backup, so every backup — wherever it's triggered
  // from — captures the same full picture: not just the data lists but
  // the tab bar order, speed-dial order, Settings' own section order, and
  // the home-screen widget/app-icon picks, so a restore recreates the
  // layout exactly, not just the content.
  const gatherLayoutForBackup = useCallback(async () => {
    const [storedSectionOrder, opacity, focusId, heatmapId] = await Promise.all([
      AsyncStorage.getItem(SETTINGS_SECTION_ORDER_KEY),
      getWidgetOpacity(),
      getFocusHabitId(),
      getHeatmapHabitId(),
    ]);
    let settingsSectionOrderForBackup;
    try {
      settingsSectionOrderForBackup = storedSectionOrder ? JSON.parse(storedSectionOrder) : undefined;
    } catch (e) {
      settingsSectionOrderForBackup = undefined;
    }
    return {
      tabBarConfig: activeTabIds,
      speedDialConfig: activeSpeedDialIds,
      settingsSectionOrder: settingsSectionOrderForBackup,
      widgetSettings: { opacity, focusHabitId: focusId || null, heatmapHabitId: heatmapId || null },
      appIcon: getCurrentAppIcon(),
    };
  }, [activeTabIds, activeSpeedDialIds]);

  const handleExport = async () => {
    setBusy('export');
    try {
      const layout = await gatherLayoutForBackup();
      let payload = await buildBackupPayload({ habits, tasks, challenges, badges, favorites, notes, planningItems, wishlist, wishlistTags, accent, mode: preference, language, ...layout });
      const password = await getBackupPassword();
      if (password) payload = await encryptPayloadWithPassword(payload, password);
      await exportBackupToFile(payload);
    } catch (e) {
      Alert.alert(t('backupFailed'));
    } finally {
      setBusy(null);
    }
  };

  /** Shared by both the plain-backup and password-decrypted-backup import paths. */
  const confirmAndApplyImport = (data) => {
    Alert.alert(t('confirmImportTitle'), t('confirmImportBody'), [
      { text: t('cancel'), style: 'cancel', onPress: () => setBusy(null) },
      {
        text: t('replace'),
        style: 'destructive',
        onPress: async () => {
          try {
            await replaceAllHabits(data.habits);
            if (data.tasks) await replaceAllTasks(data.tasks);
            if (data.challenges) await replaceAllChallenges(data.challenges);
            if (data.badges) await replaceAllBadges(data.badges);
            if (data.favorites) await replaceAllFavorites(data.favorites);
            if (data.notes) await replaceAllNotes(await decryptNotesFromBackup(data.notes));
            if (data.planningItems) await replaceAllPlanningItems(data.planningItems);
            if (data.wishlist) await replaceAllWishlist(data.wishlist, data.wishlistTags);
            if (data.accent) await setAccent(data.accent);
            if (data.mode) await setMode(data.mode);
            if (data.language) await setLanguage(data.language);
            // Layout/order & settings — absent on older (pre-v2) backup
            // files, so every one of these is skipped harmlessly if the
            // field isn't present rather than clearing the current setup.
            if (data.tabBarConfig) await replaceTabs(data.tabBarConfig);
            if (data.speedDialConfig) await replaceSpeedDialItems(data.speedDialConfig);
            if (Array.isArray(data.settingsSectionOrder) && data.settingsSectionOrder.length) {
              const known = data.settingsSectionOrder.filter((id) => DEFAULT_SETTINGS_SECTION_ORDER.includes(id));
              const missing = DEFAULT_SETTINGS_SECTION_ORDER.filter((id) => !known.includes(id));
              const restoredOrder = [...known, ...missing];
              setSectionOrder(restoredOrder);
              await setSettingsSectionOrder(restoredOrder);
            }
            if (data.widgetSettings) {
              const { opacity, focusHabitId: fId, heatmapHabitId: hId } = data.widgetSettings;
              if (opacity != null) {
                setWidgetOpacityState(opacity);
                await setWidgetOpacity(opacity);
              }
              if (fId !== undefined) {
                setFocusHabitIdState(fId);
                await setFocusHabitId(fId);
              }
              if (hId !== undefined) {
                setHeatmapHabitIdState(hId);
                await setHeatmapHabitId(hId);
              }
              refreshTodayWidget(data.habits || habits);
            }
            if (data.appIcon !== undefined && isAppIconSwitchingAvailable()) {
              const ok = await setCurrentAppIcon(data.appIcon);
              if (ok) setSelectedAppIcon(data.appIcon);
            }
            Alert.alert(t('importSuccess'));
          } catch (e) {
            Alert.alert(t('importFailed'));
          } finally {
            setBusy(null);
          }
        },
      },
    ]);
  };

  const handleImport = async () => {
    setBusy('import');
    try {
      const result = await importBackupFromFile();
      if (!result) { setBusy(null); return; } // user cancelled

      if (result.encrypted) {
        // Whole-backup password-encrypted file — prompt for the password
        // before there's anything to confirm/replace.
        setPendingImportEnvelope(result.envelope);
        setBpModalMode('import');
        setBusy(null);
        return;
      }

      confirmAndApplyImport(result.data);
    } catch (e) {
      Alert.alert(t('importFailed'));
      setBusy(null);
    }
  };

  const handleSubmitImportPassword = async () => {
    try {
      const payload = await decryptPayloadWithPassword(pendingImportEnvelope, bpDraft);
      setBpModalMode(null);
      setBpDraft('');
      setPendingImportEnvelope(null);
      setBusy('import');
      confirmAndApplyImport(payload.data);
    } catch (e) {
      Alert.alert(t('errorLabel'), t('backupWrongPassword'));
    }
  };

  const [sectionOrder, setSectionOrder] = useState(DEFAULT_SETTINGS_SECTION_ORDER);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(SETTINGS_SECTION_ORDER_KEY).then((raw) => {
      if (cancelled) return;
      let stored = [];
      try {
        stored = raw ? JSON.parse(raw) : [];
      } catch (e) {
        stored = [];
      }
      // Keep only ids that still exist, then append any new ones (e.g. a
      // section added in a future update) at the end, so nothing added
      // later silently goes missing from the page.
      const known = stored.filter((id) => DEFAULT_SETTINGS_SECTION_ORDER.includes(id));
      const missing = DEFAULT_SETTINGS_SECTION_ORDER.filter((id) => !known.includes(id));
      if (known.length) setSectionOrder([...known, ...missing]);
    });
    return () => { cancelled = true; };
  }, []);

  const persistSectionOrder = useCallback((next) => {
    setSectionOrder(next);
    AsyncStorage.setItem(SETTINGS_SECTION_ORDER_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  // "Edit order" mode: shows a compact list you long-press and drag to
  // reorder, instead of the full cards, entered/exited via the header toggle.
  const [reorderMode, setReorderMode] = useState(false);

  const handleSectionDragEnd = useCallback(
    ({ data }) => {
      Haptics.selectionAsync();
      persistSectionOrder(data);
    },
    [persistSectionOrder]
  );

  const SETTINGS_SECTIONS = [
    {
      id: 'language',
      render: (drag, isActive) => (
              <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, isActive && { opacity: 0.6 }]}>
                <TouchableOpacity onPress={() => setOpenSection('language')} onLongPress={drag} delayLongPress={200} disabled={isActive} style={styles.row} activeOpacity={0.7}>
                  <View style={styles.rowLeft}>
                    <Ionicons name="language-outline" size={18} color={colors.textSecondary} style={{ marginRight: 10 }} />
                    <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>{t('languageSection')}</Text>
                  </View>
                  <Ionicons name={openSection === 'language' ? 'chevron-down' : 'chevron-forward'} size={18} color={colors.textSecondary} />
                </TouchableOpacity>
        
                {openSection === 'language' && (
                  <View style={{ paddingTop: 0 }}>
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />
                    {LANGS.map((l) => (
                      <TouchableOpacity key={l.v} onPress={() => setLanguage(l.v)} style={styles.row}>
                        <Text style={{ color: colors.text, fontSize: 15 }}>{l.l}</Text>
                        {language === l.v && <Ionicons name="checkmark" size={20} color={colors.primary} />}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
      ),
    },
    {
      id: 'appearance',
      render: (drag, isActive) => (
              <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, isActive && { opacity: 0.6 }]}>
                <TouchableOpacity onPress={() => setOpenSection('appearance')} onLongPress={drag} delayLongPress={200} disabled={isActive} style={styles.row} activeOpacity={0.7}>
                  <View style={styles.rowLeft}>
                    <Ionicons name="contrast-outline" size={18} color={colors.textSecondary} style={{ marginRight: 10 }} />
                    <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>{t('appearance')}</Text>
                  </View>
                  <Ionicons name={openSection === 'appearance' ? 'chevron-down' : 'chevron-forward'} size={18} color={colors.textSecondary} />
                </TouchableOpacity>
        
                {openSection === 'appearance' && (
                  <View style={{ paddingTop: 0 }}>
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />
                    {MODES.map((m) => (
                      <TouchableOpacity key={m.v} onPress={() => setMode(m.v)} style={styles.row}>
                        <View style={styles.rowLeft}>
                          <Ionicons name={m.icon} size={20} color={colors.text} />
                          <Text style={{ color: colors.text, marginLeft: 12, fontSize: 15 }}>{m.l}</Text>
                        </View>
                        {preference === m.v && <Ionicons name="checkmark" size={20} color={colors.primary} />}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
      ),
    },
    {
      id: 'accent',
      render: (drag, isActive) => (
              <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, isActive && { opacity: 0.6 }]}>
                <TouchableOpacity onPress={() => setOpenSection('accent')} onLongPress={drag} delayLongPress={200} disabled={isActive} style={styles.row} activeOpacity={0.7}>
                  <View style={styles.rowLeft}>
                    <Ionicons name="color-palette-outline" size={18} color={colors.textSecondary} style={{ marginRight: 10 }} />
                    <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>{t('accentColorSection')}</Text>
                  </View>
                  <Ionicons name={openSection === 'accent' ? 'chevron-down' : 'chevron-forward'} size={18} color={colors.textSecondary} />
                </TouchableOpacity>
        
                {openSection === 'accent' && (
                  <View style={{ padding: 14, paddingTop: 0 }}>
                    <View style={[styles.divider, { backgroundColor: colors.border, marginBottom: 14 }]} />
                    <View style={styles.swatchRow}>
                      {presets.map((p) => (
                        <TouchableOpacity
                          key={p.id}
                          onPress={() => setAccent(p.value)}
                          style={[styles.swatch, { backgroundColor: p.value, borderWidth: accent === p.value ? 3 : 0, borderColor: colors.text }]}
                        >
                          {accent === p.value && <Ionicons name="checkmark" size={18} color={colors.onPrimary} />}
                        </TouchableOpacity>
                      ))}
                      <TouchableOpacity
                        onPress={() => {
                          setCustomColorDraft(isCustomAccent ? accent.replace('#', '') : '');
                          setCustomColorOpen((v) => !v);
                        }}
                        style={[
                          styles.swatch,
                          {
                            backgroundColor: isCustomAccent ? accent : colors.background,
                            borderWidth: isCustomAccent ? 3 : 1,
                            borderColor: isCustomAccent ? colors.text : colors.border,
                          },
                        ]}
                      >
                        {isCustomAccent ? (
                          <Ionicons name="checkmark" size={18} color={colors.onPrimary} />
                        ) : (
                          <Ionicons name="add" size={18} color={colors.textSecondary} />
                        )}
                      </TouchableOpacity>
                    </View>

                    {customColorOpen && (
                      <View style={{ marginTop: 14 }}>
                        <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 8 }}>{t('customColorHint')}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                          <View
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: 8,
                              backgroundColor: isValidHexColor(customColorDraft) ? normalizeHexColor(customColorDraft) : colors.background,
                              borderWidth: 1,
                              borderColor: colors.border,
                            }}
                          />
                          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 10 }}>
                            <Text style={{ color: colors.textSecondary, fontSize: 15, marginRight: 2 }}>#</Text>
                            <TextInput
                              value={customColorDraft}
                              onChangeText={(txt) => setCustomColorDraft(txt.replace(/[^0-9a-fA-F]/g, '').slice(0, 6))}
                              placeholder="FF8A00"
                              placeholderTextColor={colors.textSecondary}
                              autoCapitalize="characters"
                              autoCorrect={false}
                              style={{ flex: 1, color: colors.text, fontSize: 15, paddingVertical: 10 }}
                            />
                          </View>
                          <TouchableOpacity
                            onPress={() => {
                              if (!isValidHexColor(customColorDraft)) {
                                Alert.alert(t('customColorInvalidTitle'), t('customColorInvalidMessage'));
                                return;
                              }
                              setAccent(normalizeHexColor(customColorDraft));
                              Haptics.selectionAsync();
                              setCustomColorOpen(false);
                            }}
                            style={{ backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 11 }}
                          >
                            <Text style={{ color: colors.onPrimary, fontSize: 14, fontWeight: '600' }}>{t('customColorApply')}</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </View>
                )}
              </View>
      ),
    },
    {
      id: 'appIcon',
      render: (drag, isActive) => (
              <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, isActive && { opacity: 0.6 }]}>
                <TouchableOpacity onPress={() => setOpenSection('appIcon')} onLongPress={drag} delayLongPress={200} disabled={isActive} style={styles.row} activeOpacity={0.7}>
                  <View style={styles.rowLeft}>
                    <Ionicons name="apps-outline" size={18} color={colors.textSecondary} style={{ marginRight: 10 }} />
                    <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>{t('appIconSection')}</Text>
                  </View>
                  <Ionicons name={openSection === 'appIcon' ? 'chevron-down' : 'chevron-forward'} size={18} color={colors.textSecondary} />
                </TouchableOpacity>

                {openSection === 'appIcon' && (
                  <View style={{ padding: 14, paddingTop: 0 }}>
                    <View style={[styles.divider, { backgroundColor: colors.border, marginBottom: 12 }]} />
                    <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 14 }}>
                      {isAppIconSwitchingAvailable() ? t('appIconHint') : t('appIconUnavailableHint')}
                    </Text>
                    <View style={styles.iconGrid}>
                      {APP_ICON_OPTIONS.map((opt) => {
                        const isSelected = selectedAppIcon === opt.id;
                        return (
                          <TouchableOpacity
                            key={opt.id ?? 'default'}
                            style={styles.iconOption}
                            activeOpacity={0.7}
                            disabled={!isAppIconSwitchingAvailable()}
                            onPress={async () => {
                              const ok = await setCurrentAppIcon(opt.id);
                              if (ok) {
                                setSelectedAppIcon(opt.id);
                                Haptics.selectionAsync();
                              }
                            }}
                          >
                            <View
                              style={[
                                styles.iconThumbWrap,
                                { borderColor: isSelected ? colors.primary : colors.border, borderWidth: isSelected ? 3 : 1 },
                              ]}
                            >
                              <Image source={opt.thumbnail} style={styles.iconThumb} />
                              {isSelected && (
                                <View style={[styles.iconCheck, { backgroundColor: colors.primary }]}>
                                  <Ionicons name="checkmark" size={12} color={colors.onPrimary} />
                                </View>
                              )}
                            </View>
                            <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 4 }} numberOfLines={1}>
                              {t(opt.nameKey)}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}
              </View>
      ),
    },
    {
      id: 'tabBar',
      render: (drag, isActive) => (
              <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, isActive && { opacity: 0.6 }]}>
                <TouchableOpacity onPress={() => setOpenSection('tabBar')} onLongPress={drag} delayLongPress={200} disabled={isActive} style={styles.row} activeOpacity={0.7}>
                  <View style={styles.rowLeft}>
                    <Ionicons name="grid-outline" size={18} color={colors.textSecondary} style={{ marginRight: 10 }} />
                    <View>
                      <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>{t('tabBarCustomizeEntry')}</Text>
                      <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>
                        {activeTabIds.length}/{MAX_TABS} {t('tabBarCustomizeActiveSuffix')}
                      </Text>
                    </View>
                  </View>
                  <Ionicons name={openSection === 'tabBar' ? 'chevron-down' : 'chevron-forward'} size={18} color={colors.textSecondary} />
                </TouchableOpacity>
        
                {openSection === 'tabBar' && (
                  <View style={{ padding: 14, paddingTop: 0 }}>
                    <View style={[styles.divider, { backgroundColor: colors.border, marginBottom: 12 }]} />
                    <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 12 }}>{t('tabBarCustomizeHint')}</Text>
        
                    <Text style={styles.tabBarGroupLabel}>{t('tabBarActiveGroupLabel')}</Text>
                    <DraggableFlatList
                      data={activeTabIds}
                      keyExtractor={(id) => id}
                      scrollEnabled={false}
                      activationDistance={0}
                      onDragEnd={({ data }) => reorderTabs(data)}
                      renderItem={({ item: id, drag, isActive }) => {
                        const screen = tabPool.find((s) => s.id === id);
                        if (!screen) return null;
                        return (
                          <ScaleDecorator>
                            <TouchableOpacity
                              onLongPress={drag}
                              disabled={isActive}
                              delayLongPress={150}
                              activeOpacity={0.8}
                              style={[styles.tabBarRow, isActive && { opacity: 0.6 }]}
                            >
                              <Ionicons name={screen.icon} size={18} color={colors.primary} />
                              <Text style={{ color: colors.text, fontSize: 14, flex: 1, marginLeft: 10 }}>
                                {t(`tabScreen_${screen.id}`)}
                              </Text>
                              <Switch
                                value
                                onValueChange={async () => {
                                  const result = await toggleTab(screen.id);
                                  if (!result.ok) {
                                    Alert.alert(result.reason === 'min' ? t('tabBarMinReached') : t('tabBarMaxReached'));
                                  }
                                }}
                                trackColor={{ true: colors.primary, false: colors.border }}
                                thumbColor={SWITCH_ON_COLOR}
                              />
                              <Ionicons name="reorder-three-outline" size={20} color={colors.textSecondary} style={{ marginLeft: 10 }} />
                            </TouchableOpacity>
                          </ScaleDecorator>
                        );
                      }}
                    />
        
                    {tabPool.some((screen) => !activeTabIds.includes(screen.id)) && (
                      <>
                        <Text style={[styles.tabBarGroupLabel, { marginTop: 14 }]}>{t('tabBarInactiveGroupLabel')}</Text>
                        {tabPool
                          .filter((screen) => !activeTabIds.includes(screen.id))
                          .map((screen) => (
                            <View key={screen.id} style={styles.tabBarRow}>
                              <Ionicons name={screen.icon} size={18} color={colors.textSecondary} style={{ marginLeft: 28 }} />
                              <Text style={{ color: colors.text, fontSize: 14, flex: 1, marginLeft: 10 }}>
                                {t(`tabScreen_${screen.id}`)}
                              </Text>
                              <Switch
                                value={false}
                                onValueChange={async () => {
                                  const result = await toggleTab(screen.id);
                                  if (!result.ok) {
                                    Alert.alert(result.reason === 'min' ? t('tabBarMinReached') : t('tabBarMaxReached'));
                                  }
                                }}
                                trackColor={{ true: colors.primary, false: colors.border }}
                                thumbColor={SWITCH_OFF_THUMB}
                              />
                            </View>
                          ))}
                      </>
                    )}
                  </View>
                )}
              </View>
      ),
    },
    {
      id: 'speedDial',
      render: (drag, isActive) => (
              <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, isActive && { opacity: 0.6 }]}>
                <TouchableOpacity onPress={() => setOpenSection('speedDial')} onLongPress={drag} delayLongPress={200} disabled={isActive} style={styles.row} activeOpacity={0.7}>
                  <View style={styles.rowLeft}>
                    <Ionicons name="flash-outline" size={18} color={colors.textSecondary} style={{ marginRight: 10 }} />
                    <View>
                      <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>{t('speedDialCustomizeEntry')}</Text>
                      <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>
                        {activeSpeedDialIds.length}/{MAX_SHORTCUTS} {t('speedDialCustomizeActiveSuffix')}
                      </Text>
                    </View>
                  </View>
                  <Ionicons name={openSection === 'speedDial' ? 'chevron-down' : 'chevron-forward'} size={18} color={colors.textSecondary} />
                </TouchableOpacity>
        
                {openSection === 'speedDial' && (
                  <View style={{ padding: 14, paddingTop: 0 }}>
                    <View style={[styles.divider, { backgroundColor: colors.border, marginBottom: 12 }]} />
                    <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 12 }}>{t('speedDialCustomizeHint')}</Text>
        
                    <Text style={styles.tabBarGroupLabel}>{t('tabBarActiveGroupLabel')}</Text>
                    <DraggableFlatList
                      data={activeSpeedDialIds}
                      keyExtractor={(id) => id}
                      scrollEnabled={false}
                      activationDistance={0}
                      onDragEnd={({ data }) => reorderSpeedDialItems(data)}
                      renderItem={({ item: id, drag, isActive }) => {
                        const screen = speedDialPool.find((s) => s.id === id);
                        if (!screen) return null;
                        return (
                          <ScaleDecorator>
                            <TouchableOpacity
                              onLongPress={drag}
                              disabled={isActive}
                              delayLongPress={150}
                              activeOpacity={0.8}
                              style={[styles.tabBarRow, isActive && { opacity: 0.6 }]}
                            >
                              <Ionicons name={screen.icon} size={18} color={colors.primary} />
                              <Text style={{ color: colors.text, fontSize: 14, flex: 1, marginLeft: 10 }}>
                                {t(`tabScreen_${screen.id}`)}
                              </Text>
                              <Switch
                                value
                                onValueChange={async () => {
                                  const result = await toggleSpeedDialItem(screen.id);
                                  if (!result.ok) {
                                    Alert.alert(result.reason === 'min' ? t('speedDialMinReached') : t('speedDialMaxReached'));
                                  }
                                }}
                                trackColor={{ true: colors.primary, false: colors.border }}
                                thumbColor={SWITCH_ON_COLOR}
                              />
                              <Ionicons name="reorder-three-outline" size={20} color={colors.textSecondary} style={{ marginLeft: 10 }} />
                            </TouchableOpacity>
                          </ScaleDecorator>
                        );
                      }}
                    />
        
                    {speedDialPool.some((screen) => !activeSpeedDialIds.includes(screen.id)) && (
                      <>
                        <Text style={[styles.tabBarGroupLabel, { marginTop: 14 }]}>{t('tabBarInactiveGroupLabel')}</Text>
                        {speedDialPool
                          .filter((screen) => !activeSpeedDialIds.includes(screen.id))
                          .map((screen) => (
                            <View key={screen.id} style={styles.tabBarRow}>
                              <Ionicons name={screen.icon} size={18} color={colors.textSecondary} style={{ marginLeft: 28 }} />
                              <Text style={{ color: colors.text, fontSize: 14, flex: 1, marginLeft: 10 }}>
                                {t(`tabScreen_${screen.id}`)}
                              </Text>
                              <Switch
                                value={false}
                                onValueChange={async () => {
                                  const result = await toggleSpeedDialItem(screen.id);
                                  if (!result.ok) {
                                    Alert.alert(result.reason === 'min' ? t('speedDialMinReached') : t('speedDialMaxReached'));
                                  }
                                }}
                                trackColor={{ true: colors.primary, false: colors.border }}
                                thumbColor={SWITCH_OFF_THUMB}
                              />
                            </View>
                          ))}
                      </>
                    )}
                  </View>
                )}
              </View>
      ),
    },
    {
      id: 'appLock',
      render: (drag, isActive) => (
        <>
              <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, isActive && { opacity: 0.6 }]}>
                <TouchableOpacity onPress={() => setOpenSection('appLock')} onLongPress={drag} delayLongPress={200} disabled={isActive} style={styles.row} activeOpacity={0.7}>
                  <View style={styles.rowLeft}>
                    <Ionicons name="lock-closed-outline" size={18} color={colors.textSecondary} style={{ marginRight: 10 }} />
                    <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>{t('appLockSection')}</Text>
                  </View>
                  <Ionicons name={openSection === 'appLock' ? 'chevron-down' : 'chevron-forward'} size={18} color={colors.textSecondary} />
                </TouchableOpacity>
        
                {openSection === 'appLock' && (
                  <View style={{ paddingTop: 0 }}>
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />
                    <View style={styles.row}>
                      <Text style={{ color: colors.text, fontSize: 15 }}>{t('appLockEnable')}</Text>
                      <Switch
                        value={lockEnabled}
                        onValueChange={handleToggleAppLock}
                        trackColor={{ true: colors.primary, false: colors.border }}
                        thumbColor={lockEnabled ? SWITCH_ON_COLOR : SWITCH_OFF_THUMB}
                      />
                    </View>
        
                    {lockEnabled && (
                      <View style={{ padding: 14, paddingTop: 0 }}>
                        <Text style={[styles.sublabel, { color: colors.textSecondary, marginTop: 6 }]}>{t('appLockMethodLabel')}</Text>
                        <View style={styles.rowWrapSettings}>
                          {biometricAvailable && (
                            <TouchableOpacity
                              onPress={() => setLockMethod('biometric')}
                              style={[styles.pill, { backgroundColor: lockMethod === 'biometric' ? colors.primary : colors.surfaceElevated, borderColor: colors.border }]}
                            >
                              <Text style={{ color: lockMethod === 'biometric' ? colors.onPrimary : colors.text, fontWeight: '600', fontSize: 13 }}>
                                {t('appLockMethodBiometric')}
                              </Text>
                            </TouchableOpacity>
                          )}
                          <TouchableOpacity
                            onPress={() => setLockMethod('pin')}
                            style={[styles.pill, { backgroundColor: lockMethod === 'pin' ? colors.primary : colors.surfaceElevated, borderColor: colors.border }]}
                          >
                            <Text style={{ color: lockMethod === 'pin' ? colors.onPrimary : colors.text, fontWeight: '600', fontSize: 13 }}>
                              {t('appLockMethodPin')}
                            </Text>
                          </TouchableOpacity>
                        </View>
        
                        {lockMethod === 'pin' && (
                          <TouchableOpacity onPress={() => setPinModalMode('set')} style={{ marginTop: 12 }}>
                            <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 13 }}>
                              {hasPin ? t('appLockChangePin') : t('appLockSetPin')}
                            </Text>
                          </TouchableOpacity>
                        )}
        
                        <Text style={[styles.sublabel, { color: colors.textSecondary, marginTop: 16 }]}>{t('appLockAutoLockLabel')}</Text>
                        <View style={styles.rowWrapSettings}>
                          {AUTO_LOCK_OPTIONS.map((opt) => (
                            <TouchableOpacity
                              key={opt.id}
                              onPress={() => setAutoLockMinutes(opt.id)}
                              style={[styles.pill, { backgroundColor: autoLockMinutes === opt.id ? colors.primary : colors.surfaceElevated, borderColor: colors.border }]}
                            >
                              <Text style={{ color: autoLockMinutes === opt.id ? colors.onPrimary : colors.text, fontWeight: '600', fontSize: 12 }}>
                                {t(opt.labelKey)}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    )}
                  </View>
                )}
              </View>
              {pinModalMode === 'set' && (
                <View style={[styles.card, { backgroundColor: colors.surfaceElevated, borderColor: colors.primary, padding: 14, marginTop: 10 }]}>
                  <Text style={[styles.sublabel, { color: colors.text }]}>{t('appLockSetPin')}</Text>
                  <TextInput
                    value={pinDraft}
                    onChangeText={setPinDraft}
                    placeholder={t('pinInputPlaceholder')}
                    placeholderTextColor={colors.textSecondary}
                    secureTextEntry
                    keyboardType="number-pad"
                    style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface, marginTop: 8 }]}
                  />
                  <TextInput
                    value={pinConfirmDraft}
                    onChangeText={setPinConfirmDraft}
                    placeholder={t('appLockConfirmPin')}
                    placeholderTextColor={colors.textSecondary}
                    secureTextEntry
                    keyboardType="number-pad"
                    style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface, marginTop: 8 }]}
                  />
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                    <TouchableOpacity onPress={() => { setPinModalMode(null); setPinDraft(''); setPinConfirmDraft(''); }} style={[styles.pill, { flex: 1, alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <Text style={{ color: colors.text, fontWeight: '700', fontSize: 13 }}>{t('cancel')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleSavePin} style={[styles.pill, { flex: 1, alignItems: 'center', backgroundColor: colors.primary, borderColor: colors.primary }]}>
                      <Text style={{ color: colors.onPrimary, fontWeight: '700', fontSize: 13 }}>{t('save')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
        </>
      ),
    },
    {
      id: 'notifications',
      render: (drag, isActive) => (
              <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, isActive && { opacity: 0.6 }]}>
                <TouchableOpacity onPress={() => setOpenSection('notifications')} onLongPress={drag} delayLongPress={200} disabled={isActive} style={styles.row} activeOpacity={0.7}>
                  <View style={styles.rowLeft}>
                    <Ionicons name="notifications-outline" size={18} color={colors.textSecondary} style={{ marginRight: 10 }} />
                    <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>{t('notifications')}</Text>
                  </View>
                  <Ionicons name={openSection === 'notifications' ? 'chevron-down' : 'chevron-forward'} size={18} color={colors.textSecondary} />
                </TouchableOpacity>
        
                {openSection === 'notifications' && (
                  <View style={{ paddingTop: 0 }}>
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />
                    <TouchableOpacity onPress={handleEnableReminders} style={styles.row}>
                      <Text style={{ color: colors.text, fontSize: 15 }}>{t('enableReminders')}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{ color: permissionStatus === 'granted' ? colors.primary : colors.textSecondary, fontSize: 13, fontWeight: '600' }}>
                          {permissionStatus === 'granted' ? t('statusEnabled') : t('statusDisabled')}
                        </Text>
                        <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                      </View>
                    </TouchableOpacity>
                    <View style={[styles.row, { flexDirection: 'column', alignItems: 'flex-start' }]}>
                      <TouchableOpacity onPress={() => Linking.openSettings()} style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                        <Text style={{ color: colors.text, fontSize: 15 }}>{t('batterySettings')}</Text>
                        <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                      </TouchableOpacity>
                      <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 8, lineHeight: 17 }}>{t('batterySettingsHint')}</Text>
                    </View>
                  </View>
                )}
              </View>
      ),
    },
    {
      id: 'widget',
      render: (drag, isActive) => (
              <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, isActive && { opacity: 0.6 }]}>
                <TouchableOpacity onPress={() => navigation.navigate('WidgetsSettings')} onLongPress={drag} delayLongPress={200} disabled={isActive} style={styles.row}>
                  <View style={styles.rowLeft}>
                    <Ionicons name="options-outline" size={18} color={colors.textSecondary} style={{ marginRight: 10 }} />
                    <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>{t('widgetSection')}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
      ),
    },
    {
      id: 'backup',
      render: (drag, isActive) => (
              <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, isActive && { opacity: 0.6 }]}>
                <TouchableOpacity onPress={() => setOpenSection('backup')} onLongPress={drag} delayLongPress={200} disabled={isActive} style={styles.row} activeOpacity={0.7}>
                  <View style={styles.rowLeft}>
                    <Ionicons name="cloud-upload-outline" size={18} color={colors.textSecondary} style={{ marginRight: 10 }} />
                    <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>{t('backupSection')}</Text>
                  </View>
                  <Ionicons name={openSection === 'backup' ? 'chevron-down' : 'chevron-forward'} size={18} color={colors.textSecondary} />
                </TouchableOpacity>
        
                {openSection === 'backup' && (
                  <View style={{ paddingTop: 0 }}>
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />

                    <View style={styles.row}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.text, fontSize: 15 }}>{t('backupPasswordSection')}</Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>
                          {backupPasswordSet ? t('backupPasswordSet') : t('backupPasswordNotSet')}
                        </Text>
                      </View>
                      {backupPasswordSet ? (
                        <View style={{ flexDirection: 'row', gap: 14 }}>
                          <TouchableOpacity onPress={() => setBpModalMode('set')} hitSlop={8}>
                            <Ionicons name="create-outline" size={19} color={colors.textSecondary} />
                          </TouchableOpacity>
                          <TouchableOpacity onPress={handleRemoveBackupPassword} hitSlop={8}>
                            <Ionicons name="trash-outline" size={19} color={colors.danger} />
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <TouchableOpacity onPress={() => setBpModalMode('set')}>
                          <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>{t('backupPasswordSetAction')}</Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    {bpModalMode === 'set' && (
                      <View style={[styles.card, { backgroundColor: colors.surfaceElevated, borderColor: colors.primary, padding: 14, marginTop: 6, marginBottom: 6 }]}>
                        <Text style={[styles.sublabel, { color: colors.text }]}>{t('backupPasswordSection')}</Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 4, marginBottom: 8, lineHeight: 17 }}>
                          {t('backupPasswordWarning')}
                        </Text>
                        <TextInput
                          value={bpDraft}
                          onChangeText={setBpDraft}
                          placeholder={t('backupPasswordInputPlaceholder')}
                          placeholderTextColor={colors.textSecondary}
                          secureTextEntry
                          autoCapitalize="none"
                          style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface, marginTop: 4 }]}
                        />
                        <TextInput
                          value={bpConfirmDraft}
                          onChangeText={setBpConfirmDraft}
                          placeholder={t('backupPasswordConfirmPlaceholder')}
                          placeholderTextColor={colors.textSecondary}
                          secureTextEntry
                          autoCapitalize="none"
                          style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface, marginTop: 8 }]}
                        />
                        <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                          <TouchableOpacity onPress={() => { setBpModalMode(null); setBpDraft(''); setBpConfirmDraft(''); }} style={[styles.pill, { flex: 1, alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border }]}>
                            <Text style={{ color: colors.text, fontWeight: '700', fontSize: 13 }}>{t('cancel')}</Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={handleSaveBackupPassword} style={[styles.pill, { flex: 1, alignItems: 'center', backgroundColor: colors.primary, borderColor: colors.primary }]}>
                            <Text style={{ color: colors.onPrimary, fontWeight: '700', fontSize: 13 }}>{t('save')}</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}

                    {bpModalMode === 'import' && (
                      <View style={[styles.card, { backgroundColor: colors.surfaceElevated, borderColor: colors.primary, padding: 14, marginTop: 6, marginBottom: 6 }]}>
                        <Text style={[styles.sublabel, { color: colors.text }]}>{t('backupPasswordEnterForImport')}</Text>
                        <TextInput
                          value={bpDraft}
                          onChangeText={setBpDraft}
                          placeholder={t('backupPasswordInputPlaceholder')}
                          placeholderTextColor={colors.textSecondary}
                          secureTextEntry
                          autoCapitalize="none"
                          autoFocus
                          style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface, marginTop: 8 }]}
                        />
                        <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                          <TouchableOpacity
                            onPress={() => { setBpModalMode(null); setBpDraft(''); setPendingImportEnvelope(null); }}
                            style={[styles.pill, { flex: 1, alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border }]}
                          >
                            <Text style={{ color: colors.text, fontWeight: '700', fontSize: 13 }}>{t('cancel')}</Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={handleSubmitImportPassword} style={[styles.pill, { flex: 1, alignItems: 'center', backgroundColor: colors.primary, borderColor: colors.primary }]}>
                            <Text style={{ color: colors.onPrimary, fontWeight: '700', fontSize: 13 }}>{t('backupPasswordSubmitAction')}</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}

                    <TouchableOpacity onPress={handleExport} style={styles.row} disabled={!!busy}>
                      <Text style={{ color: colors.text, fontSize: 15 }}>{t('exportBackup')}</Text>
                      {busy === 'export' ? <ActivityIndicator color={colors.primary} /> : <Ionicons name="download-outline" size={18} color={colors.textSecondary} />}
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleImport} style={styles.row} disabled={!!busy}>
                      <Text style={{ color: colors.text, fontSize: 15 }}>{t('importBackup')}</Text>
                      {busy === 'import' ? <ActivityIndicator color={colors.primary} /> : <Ionicons name="folder-open-outline" size={18} color={colors.textSecondary} />}
                    </TouchableOpacity>
                  </View>
                )}
              </View>
      ),
    },
    {
      id: 'trash',
      render: (drag, isActive) => (
              <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, isActive && { opacity: 0.6 }]}>
                <TouchableOpacity onPress={() => navigation.navigate('Trash')} onLongPress={drag} delayLongPress={200} disabled={isActive} style={styles.row}>
                  <View style={styles.rowLeft}>
                    <Ionicons name="trash-outline" size={18} color={colors.textSecondary} style={{ marginRight: 10 }} />
                    <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>{t('trashEntry')}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
      ),
    },
    {
      id: 'github',
      render: (drag, isActive) => (
              <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, isActive && { opacity: 0.6 }]}>
                <TouchableOpacity onPress={() => setOpenSection('github')} onLongPress={drag} delayLongPress={200} disabled={isActive} style={styles.row}>
                  <View style={styles.rowLeft}>
                    <Ionicons name="logo-github" size={18} color={colors.textSecondary} style={{ marginRight: 10 }} />
                    <View>
                      <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>{t('githubBackupToggle')}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: backupHealth.color }} />
                        <Text style={{ color: colors.textSecondary, fontSize: 11.5 }} numberOfLines={1}>{backupHealth.label}</Text>
                      </View>
                    </View>
                  </View>
                  <Ionicons name={openSection === 'github' ? 'chevron-down' : 'chevron-forward'} size={18} color={colors.textSecondary} />
                </TouchableOpacity>
        
                {openSection === 'github' && (
                  <View style={{ padding: 14, paddingTop: 0 }}>
                    <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 12, lineHeight: 17 }}>
                      {t('githubBackupHint')}
                    </Text>
        
                    <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 4 }}>{t('githubToken')}</Text>
                    <TextInput
                      value={ghToken}
                      onChangeText={setGhToken}
                      placeholder="ghp_xxxxxxxxxxxx"
                      placeholderTextColor={colors.textSecondary}
                      secureTextEntry
                      autoCapitalize="none"
                      autoCorrect={false}
                      style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surfaceElevated }]}
                    />
        
                    <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 4, marginTop: 10 }}>{t('githubOwnerRepo')}</Text>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TextInput
                        value={ghOwner}
                        onChangeText={setGhOwner}
                        placeholder="username"
                        placeholderTextColor={colors.textSecondary}
                        autoCapitalize="none"
                        autoCorrect={false}
                        style={[styles.input, { flex: 1, color: colors.text, borderColor: colors.border, backgroundColor: colors.surfaceElevated }]}
                      />
                      <TextInput
                        value={ghRepo}
                        onChangeText={setGhRepo}
                        placeholder="my-a-backups"
                        placeholderTextColor={colors.textSecondary}
                        autoCapitalize="none"
                        autoCorrect={false}
                        style={[styles.input, { flex: 1, color: colors.text, borderColor: colors.border, backgroundColor: colors.surfaceElevated }]}
                      />
                    </View>
        
                    <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 4, marginTop: 10 }}>{t('githubBranchFolder')}</Text>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TextInput
                        value={ghBranch}
                        onChangeText={setGhBranch}
                        placeholder="main"
                        placeholderTextColor={colors.textSecondary}
                        autoCapitalize="none"
                        autoCorrect={false}
                        style={[styles.input, { flex: 1, color: colors.text, borderColor: colors.border, backgroundColor: colors.surfaceElevated }]}
                      />
                      <TextInput
                        value={ghFolder}
                        onChangeText={setGhFolder}
                        placeholder="backups"
                        placeholderTextColor={colors.textSecondary}
                        autoCapitalize="none"
                        autoCorrect={false}
                        style={[styles.input, { flex: 1, color: colors.text, borderColor: colors.border, backgroundColor: colors.surfaceElevated }]}
                      />
                    </View>
        
                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                      <TouchableOpacity
                        onPress={handleSaveGithubConfig}
                        disabled={ghSaving}
                        style={[styles.pill, { flex: 1, alignItems: 'center', backgroundColor: colors.primary, borderColor: colors.primary }]}
                      >
                        {ghSaving ? <ActivityIndicator color={colors.onPrimary} /> : (
                          <Text style={{ color: colors.onPrimary, fontWeight: '700', fontSize: 13 }}>{t('githubSaveSettings')}</Text>
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={handleTestGithubBackup}
                        disabled={ghTesting}
                        style={[styles.pill, { flex: 1, alignItems: 'center', backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
                      >
                        {ghTesting ? <ActivityIndicator color={colors.primary} /> : (
                          <Text style={{ color: colors.text, fontWeight: '700', fontSize: 13 }}>{t('githubBackupNow')}</Text>
                        )}
                      </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                      onPress={() =>
                        Alert.alert(t('confirmImportTitle'), t('githubRestoreConfirmBody'), [
                          { text: t('cancel'), style: 'cancel' },
                          { text: t('githubRestoreNow'), style: 'destructive', onPress: handleRestoreFromGithub },
                        ])
                      }
                      disabled={ghRestoring || !ghConfigured}
                      style={[
                        styles.pill,
                        {
                          marginTop: 10,
                          alignItems: 'center',
                          backgroundColor: colors.surfaceElevated,
                          borderColor: colors.border,
                          opacity: !ghConfigured ? 0.5 : 1,
                        },
                      ]}
                    >
                      {ghRestoring ? <ActivityIndicator color={colors.primary} /> : (
                        <Text style={{ color: colors.text, fontWeight: '700', fontSize: 13 }}>{t('githubRestoreNow')}</Text>
                      )}
                    </TouchableOpacity>
                    <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 6, lineHeight: 15 }}>
                      {t('githubRestoreHint')}
                    </Text>
        
                    {ghLastStatus && (
                      <Text style={{ color: ghLastStatus.ok ? colors.primary : '#FF6B6B', fontSize: 12, marginTop: 10 }}>
                        {ghLastStatus.ok
                          ? `${t('githubLastBackupOk')} ${new Date(ghLastStatus.at).toLocaleString()}`
                          : `${t('githubLastBackupFailed')} ${ghLastStatus.message || ''}`}
                      </Text>
                    )}
                  </View>
                )}
              </View>
      ),
    },
    {
      id: 'moodHistory',
      render: (drag, isActive) => (
              <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, isActive && { opacity: 0.6 }]}>
                <TouchableOpacity onPress={() => navigation.navigate('MoodHistory')} onLongPress={drag} delayLongPress={200} disabled={isActive} style={styles.row}>
                  <View style={styles.rowLeft}>
                    <Ionicons name="happy-outline" size={18} color={colors.textSecondary} style={{ marginRight: 10 }} />
                    <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>{t('viewMoodHistory')}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
      ),
    },
    {
      id: 'dayClosing',
      render: (drag, isActive) => (
              <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, isActive && { opacity: 0.6 }]}>
                <TouchableOpacity onPress={() => setOpenSection('dayClosing')} onLongPress={drag} delayLongPress={200} disabled={isActive} style={styles.row} activeOpacity={0.7}>
                  <View style={styles.rowLeft}>
                    <Ionicons name="moon-outline" size={18} color={colors.textSecondary} style={{ marginRight: 10 }} />
                    <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>{t('dayClosingReminderSection')}</Text>
                  </View>
                  <Ionicons name={openSection === 'dayClosing' ? 'chevron-down' : 'chevron-forward'} size={18} color={colors.textSecondary} />
                </TouchableOpacity>
        
                {openSection === 'dayClosing' && (
                  <View style={{ paddingTop: 0 }}>
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />
                    <View style={styles.row}>
                      <Text style={{ color: colors.text, fontSize: 15 }}>{t('dayClosingReminderToggle')}</Text>
                      <Switch
                        value={dayClosingReminderOn}
                        onValueChange={handleToggleDayClosingReminder}
                        trackColor={{ true: colors.primary, false: colors.border }}
                        thumbColor={dayClosingReminderOn ? SWITCH_ON_COLOR : SWITCH_OFF_THUMB}
                      />
                    </View>
                    {dayClosingReminderOn && (
                      <TouchableOpacity onPress={() => setShowDayClosingPicker(true)} style={[styles.row, { paddingTop: 0 }]}>
                        <Text style={{ color: colors.text, fontSize: 15 }}>{t('dayClosingReminderTimeLabel')}</Text>
                        <Text style={{ color: colors.primary, fontWeight: '700' }}>
                          {dayClosingTime.toLocaleTimeString(language === 'ar' ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </TouchableOpacity>
                    )}
                    {showDayClosingPicker && (
                      <DateTimePicker value={dayClosingTime} mode="time" is24Hour={false} onChange={handleDayClosingTimeChange} />
                    )}
                    <TouchableOpacity onPress={() => navigation.navigate('DayClosing')} style={[styles.row, { paddingTop: dayClosingReminderOn ? 0 : undefined }]}>
                      <Text style={{ color: colors.primary, fontSize: 15, fontWeight: '700' }}>{t('dayClosingEntry')}</Text>
                      <Ionicons name="moon-outline" size={18} color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
      ),
    },
    {
      id: 'weeklyReview',
      render: (drag, isActive) => (
              <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, isActive && { opacity: 0.6 }]}>
                <TouchableOpacity onPress={() => setOpenSection('weeklyReview')} onLongPress={drag} delayLongPress={200} disabled={isActive} style={styles.row} activeOpacity={0.7}>
                  <View style={styles.rowLeft}>
                    <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} style={{ marginRight: 10 }} />
                    <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>{t('weeklyReviewReminderSection')}</Text>
                  </View>
                  <Ionicons name={openSection === 'weeklyReview' ? 'chevron-down' : 'chevron-forward'} size={18} color={colors.textSecondary} />
                </TouchableOpacity>

                {openSection === 'weeklyReview' && (
                  <View style={{ paddingTop: 0 }}>
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />
                    <View style={styles.row}>
                      <Text style={{ color: colors.text, fontSize: 15 }}>{t('weeklyReviewReminderToggle')}</Text>
                      <Switch
                        value={weeklyReviewOn}
                        onValueChange={handleToggleWeeklyReview}
                        trackColor={{ true: colors.primary, false: colors.border }}
                        thumbColor={weeklyReviewOn ? SWITCH_ON_COLOR : SWITCH_OFF_THUMB}
                      />
                    </View>
                    {weeklyReviewOn && (
                      <>
                        <View style={[styles.row, { paddingTop: 0 }]}>
                          <Text style={{ color: colors.text, fontSize: 15 }}>{t('weeklyReviewReminderWeekdayLabel')}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12 }}>
                          {t('weekdayShort').map((label, i) => {
                            const weekdayValue = i + 1; // 1 = Sunday ... 7 = Saturday
                            const selected = weeklyReviewWeekday === weekdayValue;
                            return (
                              <TouchableOpacity
                                key={i}
                                onPress={() => handleWeeklyReviewWeekdayChange(weekdayValue)}
                                style={{
                                  width: 34,
                                  height: 34,
                                  borderRadius: 17,
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  backgroundColor: selected ? colors.primary : 'transparent',
                                  borderWidth: selected ? 0 : StyleSheet.hairlineWidth,
                                  borderColor: colors.border,
                                }}
                              >
                                <Text style={{ color: selected ? colors.onPrimary : colors.text, fontSize: 12.5, fontWeight: '600' }}>{label}</Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                        <TouchableOpacity onPress={() => setShowWeeklyReviewPicker(true)} style={[styles.row, { paddingTop: 0 }]}>
                          <Text style={{ color: colors.text, fontSize: 15 }}>{t('weeklyReviewReminderTimeLabel')}</Text>
                          <Text style={{ color: colors.primary, fontWeight: '700' }}>
                            {weeklyReviewTime.toLocaleTimeString(language === 'ar' ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                          </Text>
                        </TouchableOpacity>
                      </>
                    )}
                    {showWeeklyReviewPicker && (
                      <DateTimePicker value={weeklyReviewTime} mode="time" is24Hour={false} onChange={handleWeeklyReviewTimeChange} />
                    )}
                    <TouchableOpacity onPress={() => navigation.navigate('WeeklyReview')} style={[styles.row, { paddingTop: weeklyReviewOn ? 0 : undefined }]}>
                      <Text style={{ color: colors.primary, fontSize: 15, fontWeight: '700' }}>{t('weeklyReviewEntry')}</Text>
                      <Ionicons name="calendar-outline" size={18} color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
      ),
    },
    {
      id: 'quoteSettings',
      render: (drag, isActive) => (
              <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, isActive && { opacity: 0.6 }]}>
                <TouchableOpacity onPress={() => navigation.navigate('QuoteSettings')} onLongPress={drag} delayLongPress={200} disabled={isActive} style={styles.row}>
                  <View style={styles.rowLeft}>
                    <Ionicons name="chatbox-ellipses-outline" size={18} color={colors.textSecondary} style={{ marginRight: 10 }} />
                    <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>{t('quoteSettingsEntry')}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
      ),
    },
    {
      id: 'about',
      render: (drag, isActive) => (
              <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, isActive && { opacity: 0.6 }]}>
                <TouchableOpacity onPress={() => navigation.navigate('About')} onLongPress={drag} delayLongPress={200} disabled={isActive} style={styles.row}>
                  <View style={styles.rowLeft}>
                    <Ionicons name="information-circle-outline" size={18} color={colors.textSecondary} style={{ marginRight: 10 }} />
                    <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>{t('aboutApp')}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
      ),
    },
  ];

  const renderSectionRow = useCallback(
    ({ item: id, drag, isActive }) => {
      const meta = SETTINGS_SECTION_META[id];
      if (!meta) return null;
      return (
        <ScaleDecorator>
          <TouchableOpacity
            onLongPress={drag}
            disabled={isActive}
            delayLongPress={150}
            activeOpacity={0.8}
            style={[
              styles.reorderRow,
              isRTL && { flexDirection: 'row-reverse' },
              { backgroundColor: colors.surface, borderColor: colors.border },
              isActive && { opacity: 0.7 },
            ]}
          >
            <Ionicons name={meta.icon} size={17} color={colors.textSecondary} style={isRTL ? { marginLeft: 10 } : { marginRight: 10 }} />
            <Text style={{ color: colors.text, fontSize: 14.5, flex: 1 }} numberOfLines={1}>
              {t(meta.labelKey)}
            </Text>
            <Ionicons name="reorder-three-outline" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        </ScaleDecorator>
      );
    },
    [colors, isRTL, t]
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 20 }]}>
      <View style={[styles.titleRow, isRTL && { flexDirection: 'row-reverse' }]}>
        <Text style={[styles.title, { color: colors.text }]}>{t('settingsTitle')}</Text>
        <TouchableOpacity
          onPress={() => setReorderMode((v) => !v)}
          style={[styles.reorderToggle, { borderColor: colors.border, backgroundColor: reorderMode ? colors.primary : colors.surface }]}
        >
          <Ionicons name={reorderMode ? 'checkmark' : 'swap-vertical-outline'} size={15} color={reorderMode ? colors.onPrimary : colors.textSecondary} />
          <Text style={{ color: reorderMode ? colors.onPrimary : colors.textSecondary, fontSize: 12.5, fontWeight: '700' }}>
            {reorderMode ? t('reorderDone') : t('reorderSections')}
          </Text>
        </TouchableOpacity>
      </View>

      {reorderMode ? (
        // Its own scrollable (DraggableFlatList), separate from the
        // ScrollView below — nesting a draggable list inside a ScrollView
        // fights over the same gesture, so the two modes get separate
        // scroll containers instead of sharing one.
        <>
          <Text style={[styles.reorderHint, { color: colors.textSecondary }]}>{t('reorderSectionsHint')}</Text>
          <DraggableFlatList
            data={sectionOrder}
            keyExtractor={(id) => id}
            renderItem={renderSectionRow}
            onDragEnd={handleSectionDragEnd}
            activationDistance={0}
            containerStyle={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: 40 }}
          />
        </>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          {sectionOrder.map((id) => {
            const section = SETTINGS_SECTIONS.find((sec) => sec.id === id);
            if (!section) return null;
            return <React.Fragment key={id}>{section.render(undefined, false)}</React.Fragment>;
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  title: { fontSize: 30, fontWeight: '800' },
  reorderToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  reorderHint: { fontSize: 12.5, lineHeight: 18, marginBottom: 14 },
  reorderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
    gap: 4,
  },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', marginTop: 22, marginBottom: 9 },
  section: { fontSize: 12, fontWeight: '700', letterSpacing: 0.6 },
  card: { borderWidth: 1, borderRadius: 14, overflow: 'hidden', marginTop: 20 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  rowLeft: { flexDirection: 'row', alignItems: 'center' },
  swatchRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  swatch: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  iconOption: { width: 64, alignItems: 'center' },
  iconThumbWrap: { width: 56, height: 56, borderRadius: 14, overflow: 'visible', alignItems: 'center', justifyContent: 'center' },
  iconThumb: { width: 52, height: 52, borderRadius: 12 },
  iconCheck: { position: 'absolute', bottom: -4, right: -4, width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  pill: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20, borderWidth: 1 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14 },
  divider: { height: 1 },
  sublabel: { fontSize: 13, fontWeight: '700' },
  pickerList: { maxHeight: 220 },
  pickerRow: { paddingVertical: 10 },
  tabBarRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  tabBarGroupLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', color: '#8E8E93', marginBottom: 2 },
  rowWrapSettings: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
