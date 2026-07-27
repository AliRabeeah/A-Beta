import { useEffect, useRef } from 'react';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { useHabits } from '../context/HabitContext';
import { useTasks } from '../context/TaskContext';
import { useChallenges } from '../context/ChallengeContext';
import { useFavorites } from '../context/FavoriteContext';
import { useNotes } from '../context/NoteContext';
import { usePlanning } from '../context/PlanningContext';
import { buildBackupPayload } from './backup';
import { shouldRunAutoBackupToday, uploadBackupToGithub, getGithubConfig } from './githubBackup';

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
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    if (!habitsLoaded || !tasksLoaded || !challengesLoaded || !favoritesLoaded || !notesLoaded || !planningLoaded) return; // wait until local data is actually loaded

    ranRef.current = true;

    (async () => {
      const config = await getGithubConfig();
      if (!config) return; // not configured -> nothing to do

      const due = await shouldRunAutoBackupToday();
      if (!due) return;

      const payload = buildBackupPayload({
        habits,
        tasks,
        challenges,
        badges,
        favorites,
        notes,
        planningItems,
        accent,
        mode: preference,
        language,
      });
      await uploadBackupToGithub(payload);
    })();
  }, [
    habitsLoaded,
    tasksLoaded,
    challengesLoaded,
    favoritesLoaded,
    notesLoaded,
    planningLoaded,
    habits,
    tasks,
    challenges,
    badges,
    favorites,
    notes,
    planningItems,
    accent,
    preference,
    language,
  ]);

  return null;
}
