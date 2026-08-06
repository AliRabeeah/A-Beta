import { useEffect, useRef } from 'react';
import { InteractionManager } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { useHabits } from '../context/HabitContext';
import { useTasks } from '../context/TaskContext';
import { useChallenges } from '../context/ChallengeContext';
import { useFavorites } from '../context/FavoriteContext';
import { useNotes } from '../context/NoteContext';
import { usePlanning } from '../context/PlanningContext';
import { useWishlist } from '../context/WishlistContext';
import { useTabBar } from '../context/TabBarContext';
import { useSpeedDial } from '../context/SpeedDialContext';
import { buildBackupPayload } from './backup';
import { getBackupPassword, getRecoveryEnvelope } from './backupPassword';
import { encryptPayloadWithPassword } from './backupEncryption';
import { shouldRunAutoBackupToday, uploadBackupToGithub, getGithubConfig } from './githubBackup';
import { getSettingsSectionOrder } from './settingsSectionOrder';
import { getWidgetOpacity, getFocusHabitId, getHeatmapHabitId } from './widgetSettings';
import { getCurrentAppIcon } from './appIconSettings';

/**
 * Renders nothing. On mount (i.e. every time the app is opened), checks
 * whether a GitHub backup already ran today; if not — and GitHub backup is
 * configured — silently uploads one. Runs at most once per calendar day,
 * and never blocks or shows UI (failures are logged + stored, not alerted).
 */
export default function AutoGithubBackup() {
  const { accent, preference } = useTheme();
  const { language } = useLanguage();
  const { habits, loaded: habitsLoaded } = useHabits();
  const { tasks, loaded: tasksLoaded } = useTasks();
  const { challenges, badges, loaded: challengesLoaded } = useChallenges();
  const { favorites, loaded: favoritesLoaded } = useFavorites();
  const { notes, loaded: notesLoaded } = useNotes();
  const { planningItems, loaded: planningLoaded } = usePlanning();
  const { items: wishlist, customTags: wishlistTags, loaded: wishlistLoaded } = useWishlist();
  const { tabs: tabBarConfig } = useTabBar();
  const { items: speedDialConfig } = useSpeedDial();
  const ranRef = useRef(false);
  const timeoutRef = useRef(null);
  const interactionHandleRef = useRef(null);

  // Snapshot of the latest data, kept fresh on every render via a ref so
  // the deferred backup (which can fire a couple of seconds after this
  // effect runs, see below) always uploads current data — not whatever
  // happened to be in scope back when the timer was first scheduled.
  const latestRef = useRef(null);
  latestRef.current = {
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
    preference,
    language,
    tabBarConfig,
    speedDialConfig,
  };

  // Cancel any pending scheduled backup on real unmount only — this is a
  // separate effect (empty deps) specifically so it does NOT also fire
  // every time the big data-dependency effect below re-runs, which would
  // otherwise cancel the deferred backup practically every time any piece
  // of app data changes in the first few seconds after launch.
  useEffect(() => {
    return () => {
      if (interactionHandleRef.current) interactionHandleRef.current.cancel?.();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (ranRef.current) return;
    if (!habitsLoaded || !tasksLoaded || !challengesLoaded || !favoritesLoaded || !notesLoaded || !planningLoaded || !wishlistLoaded) return; // wait until local data is actually loaded

    ranRef.current = true;

    // IMPORTANT: this whole routine, when a backup password is set, ends
    // up running a very CPU-heavy synchronous operation (PBKDF2 with a
    // six-figure iteration count, then AES-encrypting the full payload) —
    // pure-JS crypto, so it runs on the JS thread and fully blocks it for
    // several seconds while it works. Firing that the instant the app's
    // data finishes loading — which is also the instant SplashGate wants
    // to hide the native splash screen and the instant the first screen
    // (Today) mounts — was landing that multi-second block right on top
    // of the splash-hide animation frames or the first screen's initial
    // touches. That's what showed up as "the app is frozen" on splash or
    // right after opening: not a real hang, just the JS thread being 100%
    // busy with encryption at the worst possible moment.
    //
    // Fix: wait until any pending interactions/animations (including the
    // splash-hide and the initial screen transition) have finished, THEN
    // wait a further couple of seconds so this never lands on the first
    // moments after launch, when the person is most likely to be tapping
    // around. The backup itself is not time-critical — it only needs to
    // run once per calendar day — so a few extra seconds of delay costs
    // nothing.
    interactionHandleRef.current = InteractionManager.runAfterInteractions(() => {
      timeoutRef.current = setTimeout(() => {
        (async () => {
          const config = await getGithubConfig();
          if (!config) return; // not configured -> nothing to do

          const due = await shouldRunAutoBackupToday();
          if (!due) return;

          const data = latestRef.current;
          const [storedSectionOrder, widgetOpacity, focusHabitId, heatmapHabitId] = await Promise.all([
            getSettingsSectionOrder(),
            getWidgetOpacity(),
            getFocusHabitId(),
            getHeatmapHabitId(),
          ]);

          let payload = await buildBackupPayload({
            habits: data.habits,
            tasks: data.tasks,
            challenges: data.challenges,
            badges: data.badges,
            favorites: data.favorites,
            notes: data.notes,
            planningItems: data.planningItems,
            wishlist: data.wishlist,
            wishlistTags: data.wishlistTags,
            accent: data.accent,
            mode: data.preference,
            language: data.language,
            tabBarConfig: data.tabBarConfig,
            speedDialConfig: data.speedDialConfig,
            settingsSectionOrder: storedSectionOrder || undefined,
            widgetSettings: { opacity: widgetOpacity, focusHabitId: focusHabitId || null, heatmapHabitId: heatmapHabitId || null },
            appIcon: getCurrentAppIcon(),
          });

          // If a whole-backup password is configured, everything (not just
          // locked notes) gets encrypted before it ever leaves the device.
          const backupPassword = await getBackupPassword();
          if (backupPassword) {
            const recoveryEnvelope = await getRecoveryEnvelope();
            payload = await encryptPayloadWithPassword(payload, backupPassword, recoveryEnvelope);
          }

          await uploadBackupToGithub(payload);
        })();
      }, 2500);
    });
  }, [
    habitsLoaded,
    tasksLoaded,
    challengesLoaded,
    favoritesLoaded,
    notesLoaded,
    planningLoaded,
    wishlistLoaded,
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
    preference,
    language,
    tabBarConfig,
    speedDialConfig,
  ]);

  return null;
}
