import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createNavigationContainerRef } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { useTabBar, TAB_BAR_POOL } from '../context/TabBarContext';

// Lets code outside of any screen component (e.g. the notification-tap
// handler in App.js, for the Day Closing reminder) trigger navigation.
export const navigationRef = createNavigationContainerRef();

export function navigate(name, params) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name, params);
  }
}

import TodayScreen from '../screens/TodayScreen';
import HabitsScreen from '../screens/HabitsScreen';
import TasksScreen from '../screens/TasksScreen';
import StatsScreen from '../screens/StatsScreen';
import TimerScreen from '../screens/TimerScreen';
import SettingsScreen from '../screens/SettingsScreen';
import AddEditHabitScreen from '../screens/AddEditHabitScreen';
import HabitDetailScreen from '../screens/HabitDetailScreen';
import NewTaskScreen from '../screens/NewTaskScreen';
import TaskDetailScreen from '../screens/TaskDetailScreen';
import AboutScreen from '../screens/AboutScreen';
import QuoteSettingsScreen from '../screens/QuoteSettingsScreen';
import ArchiveScreen from '../screens/ArchiveScreen';
import ChallengesScreen from '../screens/ChallengesScreen';
import ChallengeDetailScreen from '../screens/ChallengeDetailScreen';
import TrophyCaseScreen from '../screens/TrophyCaseScreen';
import StartChallengeScreen from '../screens/StartChallengeScreen';
import NotesScreen from '../screens/NotesScreen';
import AddEditNoteScreen from '../screens/AddEditNoteScreen';
import FavoritesScreen from '../screens/FavoritesScreen';
import AddEditFavoriteScreen from '../screens/AddEditFavoriteScreen';
import PlanningScreen from '../screens/PlanningScreen';
import AddEditPlanningScreen from '../screens/AddEditPlanningScreen';
import TrashScreen from '../screens/TrashScreen';
import DayClosingScreen from '../screens/DayClosingScreen';
import MoodHistoryScreen from '../screens/MoodHistoryScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Every screen in the customizable tab-bar pool, mapped to its component.
// Kept separate from the Stack.Screen registrations below (some of these,
// like Stats/Challenges/Favorites/Planning/Timer, are ALSO reachable by
// pushing onto the stack from the drawer/settings when they're not
// currently chosen as a tab).
const TAB_SCREEN_COMPONENTS = {
  Today: TodayScreen,
  Habits: HabitsScreen,
  Tasks: TasksScreen,
  Notes: NotesScreen,
  Settings: SettingsScreen,
  Stats: StatsScreen,
  Challenges: ChallengesScreen,
  Favorites: FavoritesScreen,
  Planning: PlanningScreen,
  Timer: TimerScreen,
};

function Tabs() {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const { tabs, loaded } = useTabBar();

  // Before the stored config loads, fall back to the classic 5-tab layout
  // so there's never a flash of an empty tab bar.
  const activeTabs = loaded && tabs.length > 0 ? tabs : ['Today', 'Habits', 'Tasks', 'Notes', 'Settings'];

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarIcon: ({ color, size }) => {
          const poolEntry = TAB_BAR_POOL.find((s) => s.id === route.name);
          return <Ionicons name={poolEntry?.icon || 'ellipse-outline'} size={size} color={color} />;
        },
        tabBarLabel: t(`tabScreen_${route.name}`),
      })}
    >
      {activeTabs.map((screenId) => (
        <Tab.Screen key={screenId} name={screenId} component={TAB_SCREEN_COMPONENTS[screenId]} />
      ))}
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const { colors } = useTheme();
  const { t } = useLanguage();
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
      <Stack.Screen name="Challenges" component={ChallengesScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="AddEditHabit"
        component={AddEditHabitScreen}
        options={({ route }) => ({ title: route.params?.habitId ? 'Edit Habit' : 'New Habit', presentation: 'modal' })}
      />
      <Stack.Screen name="HabitDetail" component={HabitDetailScreen} options={{ title: '' }} />
      <Stack.Screen
        name="NewTask"
        component={NewTaskScreen}
        options={({ route }) => ({ title: route.params?.taskId ? 'Edit Task' : 'New Task', presentation: 'modal' })}
      />
      <Stack.Screen name="TaskDetail" component={TaskDetailScreen} options={{ title: '' }} />
      <Stack.Screen name="Archive" component={ArchiveScreen} options={{ title: '' }} />
      <Stack.Screen name="Stats" component={StatsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Timer" component={TimerScreen} options={{ headerShown: false }} />
      <Stack.Screen name="About" component={AboutScreen} options={{ title: '' }} />
      <Stack.Screen name="QuoteSettings" component={QuoteSettingsScreen} options={{ title: t('quoteSettingsTitle') }} />
      <Stack.Screen name="ChallengeDetail" component={ChallengeDetailScreen} options={{ headerShown: false }} />
      <Stack.Screen name="TrophyCase" component={TrophyCaseScreen} options={{ headerShown: false }} />
      <Stack.Screen name="StartChallenge" component={StartChallengeScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="AddEditNote"
        component={AddEditNoteScreen}
        options={({ route }) => ({ title: route.params?.noteId ? 'Edit Note' : 'New Note', presentation: 'modal', headerShown: false })}
      />
      <Stack.Screen name="Favorites" component={FavoritesScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="AddEditFavorite"
        component={AddEditFavoriteScreen}
        options={({ route }) => ({ title: route.params?.favoriteId ? 'Edit Favorite' : 'New Favorite', presentation: 'modal' })}
      />
      <Stack.Screen name="Planning" component={PlanningScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="AddEditPlanning"
        component={AddEditPlanningScreen}
        options={({ route }) => ({ title: route.params?.planningId ? 'Edit Plan' : 'New Plan', presentation: 'modal' })}
      />
      <Stack.Screen name="Trash" component={TrashScreen} options={({ route }) => ({ title: '' })} />
      <Stack.Screen
        name="DayClosing"
        component={DayClosingScreen}
        options={{ headerShown: false, presentation: 'fullScreenModal' }}
      />
      <Stack.Screen name="MoodHistory" component={MoodHistoryScreen} options={{ title: '' }} />
    </Stack.Navigator>
  );
}
