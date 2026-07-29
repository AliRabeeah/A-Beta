import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';

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

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function Tabs() {
  const { colors } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarIcon: ({ color, size }) => {
          const icons = {
            Today: 'checkmark-circle',
            Habits: 'list',
            Tasks: 'clipboard-outline',
            Stats: 'bar-chart',
            Challenges: 'target',
            Notes: 'document-text-outline',
            Settings: 'settings-sharp',
          };
          return <Ionicons name={icons[route.name]} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Today" component={TodayScreen} />
      <Tab.Screen name="Habits" component={HabitsScreen} />
      <Tab.Screen name="Tasks" component={TasksScreen} />
      <Tab.Screen name="Notes" component={NotesScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
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
    </Stack.Navigator>
  );
}
