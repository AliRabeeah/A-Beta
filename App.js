import React, { useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import * as NavigationBar from 'expo-navigation-bar';
import * as Notifications from 'expo-notifications';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { LanguageProvider, useLanguage } from './src/i18n/LanguageContext';
import { HabitProvider, useHabits } from './src/context/HabitContext';
import { PlanningProvider, usePlanning } from './src/context/PlanningContext';
import { TableProvider } from './src/context/TableContext';
import { JournalProvider } from './src/context/JournalContext';
import { TaskProvider, useTasks } from './src/context/TaskContext';
import { ChallengeProvider, useChallenges } from './src/context/ChallengeContext';
import { NoteProvider, useNotes } from './src/context/NoteContext';
import { FavoriteProvider, useFavorites } from './src/context/FavoriteContext';
import { WishlistProvider, useWishlist } from './src/context/WishlistContext';
import { TabBarProvider, useTabBar } from './src/context/TabBarContext';
import { SpeedDialProvider, useSpeedDial } from './src/context/SpeedDialContext';
import { AppLockProvider, useAppLock } from './src/context/AppLockContext';
import { MoodProvider, useMood } from './src/context/MoodContext';
import { TrashProvider, useTrash } from './src/context/TrashContext';
import RootNavigator, { navigationRef, navigate } from './src/navigation';
import AutoGithubBackup from './src/utils/AutoGithubBackup';
import AutoQuoteScheduler from './src/utils/AutoQuoteScheduler';
import { ensureHabitNotificationCategory, scheduleHabitSnooze } from './src/utils/notifications';
import * as QuickActions from 'expo-quick-actions';
import { setupAppShortcuts, handleQuickAction } from './src/utils/quickActions';
import LockScreen from './src/screens/LockScreen';
import UndoSnackbarHost from './src/components/UndoSnackbarHost';

// Keep the native splash screen (logo on black, from app.json) on screen
// past the default "JS bundle has rendered a first frame" point. We hide it
// ourselves — from SplashGate below — only once every AsyncStorage-backed
// context has finished loading its real data. This replaces any flash of
// empty/default content with a flash of nothing (the splash stays put),
// and it's driven by actual readiness rather than a guessed fixed delay.
SplashScreen.preventAutoHideAsync().catch(() => {});

// NOTE: we tried fade:true here, but a real device log showed it fighting
// with the native module's own draw-blocking mechanism — onPreDraw kept
// returning false (canceling every frame) for ~1.4s, then everything
// snapped in on a single frame. That snap IS the glitch. An immediate,
// un-faded hide avoids that fight, so we disable the fade explicitly.
try {
  SplashScreen.setOptions?.({ fade: false })?.catch?.(() => {});
} catch (e) {}

/**
 * Renders nothing — its only job is to watch every data context's `loaded`
 * flag and hide the native splash screen the instant all of them are true.
 * Kept as its own component (rather than logic inside Root) so its re-renders
 * — which happen on every one of these contexts' updates — never cascade
 * into NavigationContainer or the rest of the tree.
 */
function SplashGate() {
  const { loaded: themeLoaded } = useTheme();
  const { loaded: lockLoaded } = useAppLock();
  const { loaded: habitsLoaded } = useHabits();
  const { loaded: planningLoaded } = usePlanning();
  const { loaded: tasksLoaded } = useTasks();
  const { loaded: challengesLoaded } = useChallenges();
  const { loaded: notesLoaded } = useNotes();
  const { loaded: favoritesLoaded } = useFavorites();
  const { loaded: wishlistLoaded } = useWishlist();
  const { loaded: moodLoaded } = useMood();
  const { loaded: trashLoaded } = useTrash();
  const { loaded: tabBarLoaded } = useTabBar();
  const { loaded: speedDialLoaded } = useSpeedDial();

  const allLoaded =
    themeLoaded &&
    lockLoaded &&
    habitsLoaded &&
    planningLoaded &&
    tasksLoaded &&
    challengesLoaded &&
    notesLoaded &&
    favoritesLoaded &&
    wishlistLoaded &&
    moodLoaded &&
    trashLoaded &&
    tabBarLoaded &&
    speedDialLoaded;

  const hiddenRef = useRef(false);

  useEffect(() => {
    if (allLoaded && !hiddenRef.current) {
      hiddenRef.current = true;
      // Wait two animation frames before hiding: the first lets React commit
      // the newly-mounted screen, the second lets the native side actually
      // paint it. Hiding on the same tick `allLoaded` flips can expose a
      // frame that's mounted but not yet painted — that's the flash/glitch.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          SplashScreen.hideAsync().catch(() => {});
        });
      });
    }
  }, [allLoaded]);

  // Safety net only — the line above is what normally hides the splash,
  // typically well under a second. This just guarantees that if any single
  // context's stored data were ever corrupted in a way that stops its
  // `loaded` flag from ever flipping true, the user still isn't stuck
  // staring at the splash screen forever.
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!hiddenRef.current) {
        hiddenRef.current = true;
        SplashScreen.hideAsync().catch(() => {});
      }
    }, 6000);
    return () => clearTimeout(timeout);
  }, []);

  return null;
}

function Root() {
  const { mode, colors } = useTheme();
  const { t } = useLanguage();
  const { habits, setCompletionStatus } = useHabits();
  const { loaded: lockConfigLoaded, enabled: lockEnabled, autoLockMinutes } = useAppLock();

  // Keep Android's system navigation bar (the bar/pill at the very bottom
  // of the screen) matching the app background, so it blends seamlessly
  // instead of showing up as a mismatched strip under our own tab bar.
  // No-op on iOS (there's no colorable nav bar there) and safely ignored
  // if the OS/launcher doesn't support it (e.g. gesture-nav edge-to-edge).
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    NavigationBar.setBackgroundColorAsync(colors.background).catch(() => {});
    NavigationBar.setButtonStyleAsync(mode === 'dark' ? 'light' : 'dark').catch(() => {});
  }, [mode, colors.background]);

  // Keep the native root view's background in sync with the theme too —
  // not just the nav bar. Without this, the OS-level background behind the
  // very first frame defaults to white, so any tiny gap in the splash → RN
  // handoff shows white instead of the app's actual background.
  useEffect(() => {
    try {
      SystemUI.setBackgroundColorAsync?.(colors.background)?.catch?.(() => {});
    } catch (e) {}
  }, [colors.background]);

  // `null` = not yet decided; `true`/`false` once we know whether to show
  // the lock screen. Starting locked (once config has loaded) whenever the
  // feature is enabled means a cold app start also requires unlocking.
  const [isLocked, setIsLocked] = useState(null);
  const backgroundedAtRef = useRef(null);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    if (!lockConfigLoaded) return;
    // CRITICAL: if the feature is disabled, never show the lock screen,
    // full stop — this check happens before anything else.
    setIsLocked(lockEnabled);
  }, [lockConfigLoaded, lockEnabled]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (!lockEnabled) {
        appState.current = next;
        return;
      }
      if (appState.current.match(/active/) && next.match(/inactive|background/)) {
        backgroundedAtRef.current = Date.now();
      } else if (appState.current.match(/inactive|background/) && next === 'active') {
        const elapsedMinutes = backgroundedAtRef.current ? (Date.now() - backgroundedAtRef.current) / 60000 : Infinity;
        if (autoLockMinutes === -1) {
          // "Only on manual close" - returning from background/inactive
          // (e.g. switching apps) never re-locks; only a full kill+relaunch
          // does, which is already handled by the initial state above.
        } else if (elapsedMinutes >= autoLockMinutes) {
          setIsLocked(true);
        }
      }
      appState.current = next;
    });
    return () => sub.remove();
  }, [lockEnabled, autoLockMinutes]);

  useEffect(() => {
    ensureHabitNotificationCategory(t);
    // Only needs the translated button labels once; re-registering on
    // every language change is unnecessary and Notifications categories
    // don't need to track live language switches for existing content.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setupAppShortcuts(t);
  }, [t]);

  useEffect(() => {
    // App launched directly from a long-pressed home-screen shortcut.
    if (QuickActions.initial) handleQuickAction(QuickActions.initial);
    // App was already running/backgrounded and a shortcut was tapped.
    const sub = QuickActions.addListener(handleQuickAction);
    return () => sub.remove();
  }, []);

  // Route a tapped notification straight to its target screen (currently
  // just the Day Closing reminder), and handle interactive habit-reminder
  // actions ("✓ Done" / "⏰ +1h") without necessarily navigating anywhere.
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(async (response) => {
      const data = response.notification.request.content.data || {};
      const actionId = response.actionIdentifier;

      if (data.type === 'habit-reminder' && data.habitId) {
        if (actionId === 'MARK_DONE') {
          await setCompletionStatus(data.habitId, true, new Date());
          return;
        }
        if (actionId === 'SNOOZE_1H') {
          const habit = habits.find((h) => h.id === data.habitId);
          if (habit) await scheduleHabitSnooze(habit);
          return;
        }
      }

      if (data.screen) navigate(data.screen);
    });
    return () => sub.remove();
  }, [habits, setCompletionStatus]);

  const showLock = lockConfigLoaded && lockEnabled && isLocked;

  return (
    <NavigationContainer
      ref={navigationRef}
      theme={{
        dark: mode === 'dark',
        colors: {
          primary: colors.primary,
          background: colors.background,
          card: colors.surface,
          text: colors.text,
          border: colors.border,
          notification: colors.primary,
        },
      }}
    >
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <SplashGate />
      <AutoGithubBackup />
      <AutoQuoteScheduler />
      {showLock ? <LockScreen onUnlock={() => setIsLocked(false)} /> : <RootNavigator />}
      <UndoSnackbarHost />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <LanguageProvider>
            <AppLockProvider>
              <TabBarProvider>
              <SpeedDialProvider>
                <HabitProvider>
                  <PlanningProvider>
                    <TableProvider>
                    <JournalProvider>
                    <TaskProvider>
                      <ChallengeProvider>
                        <NoteProvider>
                          <FavoriteProvider>
                            <WishlistProvider>
                            <MoodProvider>
                              <TrashProvider>
                                <Root />
                              </TrashProvider>
                            </MoodProvider>
                            </WishlistProvider>
                          </FavoriteProvider>
                        </NoteProvider>
                      </ChallengeProvider>
                    </TaskProvider>
                    </JournalProvider>
                    </TableProvider>
                  </PlanningProvider>
                </HabitProvider>
              </SpeedDialProvider>
              </TabBarProvider>
            </AppLockProvider>
          </LanguageProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
