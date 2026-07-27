import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { LanguageProvider } from './src/i18n/LanguageContext';
import { HabitProvider } from './src/context/HabitContext';
import { PlanningProvider } from './src/context/PlanningContext';
import { TaskProvider } from './src/context/TaskContext';
import { ChallengeProvider } from './src/context/ChallengeContext';
import { NoteProvider } from './src/context/NoteContext';
import { FavoriteProvider } from './src/context/FavoriteContext';
import RootNavigator from './src/navigation';
import AutoGithubBackup from './src/utils/AutoGithubBackup';
import AutoQuoteScheduler from './src/utils/AutoQuoteScheduler';

function Root() {
  const { mode, colors } = useTheme();
  return (
    <NavigationContainer
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
      <RootNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <LanguageProvider>
            <HabitProvider>
              <PlanningProvider>
                <TaskProvider>
                  <ChallengeProvider>
                    <NoteProvider>
                      <FavoriteProvider>
                        <Root />
                      </FavoriteProvider>
                    </NoteProvider>
                  </ChallengeProvider>
                </TaskProvider>
              </PlanningProvider>
            </HabitProvider>
          </LanguageProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
