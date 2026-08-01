import React, { useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as NavigationBar from 'expo-navigation-bar';
import * as Notifications from 'expo-notifications';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { LanguageProvider, useLanguage } from './src/i18n/LanguageContext';
import { HabitProvider, useHabits } from './src/context/HabitContext';
import { PlanningProvider } from './src/context/PlanningContext';
import { TaskProvider } from './src/context/TaskContext';
import { ChallengeProvider } from './src/context/ChallengeContext';
import { NoteProvider } from './src/context/NoteContext';
import { FavoriteProvider } from './src/context/FavoriteContext';
import { WishlistProvider } from './src/context/WishlistContext';
import { TabBarProvider } from './src/context/TabBarContext';
import { SpeedDialProvider } from './src/context/SpeedDialContext';
import { AppLockProvider, useAppLock } from './src/context/AppLockContext';
import { MoodProvider } from './src/context/MoodContext';
import { TrashProvider, purgeExpiredTrash } from './src/context/TrashContext';
import RootNavigator, { navigationRef, navigate } from './src/navigation';
import AutoGithubBackup from './src/utils/AutoGithubBackup';
import AutoQuoteScheduler from './src/utils/AutoQuoteScheduler';
import { ensureHabitNotificationCategory, scheduleHabitSnooze } from './src/utils/notifications';
import * as QuickActions from 'expo-quick-actions';
import { setupAppShortcuts, handleQuickAction } from './src/utils/quickActions';
import LockScreen from './src/screens/LockScreen';
import UndoSnackbarHost from './src/components/UndoSnackbarHost';

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

  useEffect(() => {
    // One-off cleanup of trash items older than 30 days on every cold start.
    purgeExpiredTrash();
  }, []);

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
