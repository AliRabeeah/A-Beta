import React, { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { LanguageProvider } from './src/i18n/LanguageContext';
import { HabitProvider } from './src/context/HabitContext';
import { PlanningProvider } from './src/context/PlanningContext';
import { TaskProvider } from './src/context/TaskContext';
import { ChallengeProvider } from './src/context/ChallengeContext';
import { NoteProvider } from './src/context/NoteContext';
import { FavoriteProvider } from './src/context/FavoriteContext';
import { TabBarProvider } from './src/context/TabBarContext';
import { AppLockProvider, useAppLock } from './src/context/AppLockContext';
import { MoodProvider } from './src/context/MoodContext';
import { TrashProvider, purgeExpiredTrash } from './src/context/TrashContext';
import RootNavigator, { navigationRef, navigate } from './src/navigation';
import AutoGithubBackup from './src/utils/AutoGithubBackup';
import AutoQuoteScheduler from './src/utils/AutoQuoteScheduler';
import LockScreen from './src/screens/LockScreen';
import UndoSnackbarHost from './src/components/UndoSnackbarHost';

function Root() {
  const { mode, colors } = useTheme();
  const { loaded: lockConfigLoaded, enabled: lockEnabled, autoLockMinutes } = useAppLock();

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

  // Route a tapped notification straight to its target screen (currently
  // just the Day Closing reminder).
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const screen = response.notification.request.content.data?.screen;
      if (screen) navigate(screen);
    });
    return () => sub.remove();
  }, []);

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
                <HabitProvider>
                  <PlanningProvider>
                    <TaskProvider>
                      <ChallengeProvider>
                        <NoteProvider>
                          <FavoriteProvider>
                            <MoodProvider>
                              <TrashProvider>
                                <Root />
                              </TrashProvider>
                            </MoodProvider>
                          </FavoriteProvider>
                        </NoteProvider>
                      </ChallengeProvider>
                    </TaskProvider>
                  </PlanningProvider>
                </HabitProvider>
              </TabBarProvider>
            </AppLockProvider>
          </LanguageProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
