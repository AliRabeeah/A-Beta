import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView, Linking, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { useHabits } from '../context/HabitContext';
import { useTasks } from '../context/TaskContext';
import { useChallenges } from '../context/ChallengeContext';
import { useFavorites } from '../context/FavoriteContext';
import { useNotes } from '../context/NoteContext';
import { usePlanning } from '../context/PlanningContext';
import { ensurePermission, getPermissionStatus } from '../utils/notifications';
import { buildBackupPayload, exportBackupToFile, importBackupFromFile } from '../utils/backup';
import { saveGithubConfig, getGithubConfig, uploadBackupToGithub, getLastBackupStatus } from '../utils/githubBackup';
import { getWidgetOpacity, setWidgetOpacity, getFocusHabitId, setFocusHabitId, getHeatmapHabitId, setHeatmapHabitId } from '../utils/widgetSettings';
import { refreshTodayWidget } from '../utils/widgetSync';

export default function SettingsScreen({ navigation }) {
  const { colors, preference, setMode, accent, setAccent, presets } = useTheme();
  const { t, language, setLanguage } = useLanguage();
  const { habits, replaceAllHabits } = useHabits();
  const { tasks, replaceAllTasks } = useTasks();
  const { challenges, badges, replaceAllChallenges, replaceAllBadges } = useChallenges();
  const { favorites, replaceAllFavorites } = useFavorites();
  const { notes, replaceAllNotes } = useNotes();
  const { planningItems, replaceAllPlanningItems } = usePlanning();
  const insets = useSafeAreaInsets();

  const [busy, setBusy] = useState(null); // 'export' | 'import' | null
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
  const [ghLastStatus, setGhLastStatus] = useState(null);
  const [ghSectionOpen, setGhSectionOpen] = useState(false);

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
      Alert.alert(t('githubBackupSaved'));
    } finally {
      setGhSaving(false);
    }
  };

  const handleTestGithubBackup = async () => {
    setGhTesting(true);
    try {
      const payload = buildBackupPayload({ habits, tasks, challenges, badges, favorites, notes, planningItems, accent, mode: preference, language });
      const result = await uploadBackupToGithub(payload);
      setGhLastStatus(await getLastBackupStatus());
      Alert.alert(result.ok ? t('githubBackupTestSuccess') : t('githubBackupTestFailed'), result.message);
    } finally {
      setGhTesting(false);
    }
  };

  const activeHabits = habits.filter((h) => !h.archived);

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

  const handleExport = async () => {
    setBusy('export');
    try {
      const payload = buildBackupPayload({ habits, tasks, challenges, badges, favorites, notes, planningItems, accent, mode: preference, language });
      await exportBackupToFile(payload);
    } catch (e) {
      Alert.alert(t('backupFailed'));
    } finally {
      setBusy(null);
    }
  };

  const handleImport = async () => {
    setBusy('import');
    try {
      const data = await importBackupFromFile();
      if (!data) { setBusy(null); return; } // user cancelled
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
              if (data.notes) await replaceAllNotes(data.notes);
              if (data.planningItems) await replaceAllPlanningItems(data.planningItems);
              if (data.accent) await setAccent(data.accent);
              if (data.mode) await setMode(data.mode);
              if (data.language) await setLanguage(data.language);
              Alert.alert(t('importSuccess'));
            } catch (e) {
              Alert.alert(t('importFailed'));
            } finally {
              setBusy(null);
            }
          },
        },
      ]);
    } catch (e) {
      Alert.alert(t('importFailed'));
      setBusy(null);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: insets.top + 20, paddingBottom: 40 }}
    >
      <Text style={[styles.title, { color: colors.text }]}>{t('settingsTitle')}</Text>

      <Text style={[styles.section, { color: colors.textSecondary }]}>{t('languageSection')}</Text>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {LANGS.map((l) => (
          <TouchableOpacity key={l.v} onPress={() => setLanguage(l.v)} style={styles.row}>
            <Text style={{ color: colors.text, fontSize: 15 }}>{l.l}</Text>
            {language === l.v && <Ionicons name="checkmark" size={20} color={colors.primary} />}
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[styles.section, { color: colors.textSecondary }]}>{t('appearance')}</Text>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
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

      <Text style={[styles.section, { color: colors.textSecondary }]}>{t('accentColorSection')}</Text>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, padding: 14 }]}>
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
        </View>
      </View>

      <Text style={[styles.section, { color: colors.textSecondary }]}>{t('notifications')}</Text>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
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

      <Text style={[styles.section, { color: colors.textSecondary }]}>{t('widgetSection')}</Text>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, padding: 14 }]}>
        <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 10 }}>{t('widgetOpacityHint')}</Text>
        <View style={styles.swatchRow}>
          {OPACITY_OPTIONS.map((val) => (
            <TouchableOpacity
              key={val}
              onPress={() => handleOpacityChange(val)}
              style={[
                styles.pill,
                { backgroundColor: widgetOpacity === val ? colors.primary : colors.surfaceElevated, borderColor: colors.border },
              ]}
            >
              <Text style={{ color: widgetOpacity === val ? colors.onPrimary : colors.text, fontWeight: '600', fontSize: 13 }}>
                {val}%
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border, marginVertical: 14 }]} />

        <TouchableOpacity onPress={() => setPickerOpen(pickerOpen === 'focus' ? null : 'focus')} style={styles.row}>
          <Text style={{ color: colors.text, fontSize: 15 }}>{t('focusHabitWidget')}</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
            {activeHabits.find((h) => h.id === focusHabitId)?.name || t('none')}
          </Text>
        </TouchableOpacity>
        {pickerOpen === 'focus' && (
          <View style={styles.pickerList}>
            {activeHabits.map((h) => (
              <TouchableOpacity key={h.id} onPress={() => handlePickFocusHabit(h.id)} style={styles.pickerRow}>
                <Text style={{ color: focusHabitId === h.id ? colors.primary : colors.text, fontSize: 14 }}>{h.icon} {h.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <TouchableOpacity onPress={() => setPickerOpen(pickerOpen === 'heatmap' ? null : 'heatmap')} style={[styles.row, { marginTop: 8 }]}>
          <Text style={{ color: colors.text, fontSize: 15 }}>{t('heatmapWidgetHabit')}</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
            {activeHabits.find((h) => h.id === heatmapHabitId)?.name || t('none')}
          </Text>
        </TouchableOpacity>
        {pickerOpen === 'heatmap' && (
          <View style={styles.pickerList}>
            {activeHabits.map((h) => (
              <TouchableOpacity key={h.id} onPress={() => handlePickHeatmapHabit(h.id)} style={styles.pickerRow}>
                <Text style={{ color: heatmapHabitId === h.id ? colors.primary : colors.text, fontSize: 14 }}>{h.icon} {h.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <Text style={[styles.section, { color: colors.textSecondary }]}>{t('backupSection')}</Text>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <TouchableOpacity onPress={handleExport} style={styles.row} disabled={!!busy}>
          <Text style={{ color: colors.text, fontSize: 15 }}>{t('exportBackup')}</Text>
          {busy === 'export' ? <ActivityIndicator color={colors.primary} /> : <Ionicons name="download-outline" size={18} color={colors.textSecondary} />}
        </TouchableOpacity>
        <TouchableOpacity onPress={handleImport} style={styles.row} disabled={!!busy}>
          <Text style={{ color: colors.text, fontSize: 15 }}>{t('importBackup')}</Text>
          {busy === 'import' ? <ActivityIndicator color={colors.primary} /> : <Ionicons name="folder-open-outline" size={18} color={colors.textSecondary} />}
        </TouchableOpacity>
      </View>

      <Text style={[styles.section, { color: colors.textSecondary }]}>{t('githubBackupSection')}</Text>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <TouchableOpacity onPress={() => setGhSectionOpen((v) => !v)} style={styles.row}>
          <Text style={{ color: colors.text, fontSize: 15 }}>{t('githubBackupToggle')}</Text>
          <Ionicons name={ghSectionOpen ? 'chevron-down' : 'chevron-forward'} size={18} color={colors.textSecondary} />
        </TouchableOpacity>

        {ghSectionOpen && (
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

      <Text style={[styles.section, { color: colors.textSecondary }]}>{t('quoteSection')}</Text>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.navigate('QuoteSettings')} style={styles.row}>
          <Text style={{ color: colors.text, fontSize: 15 }}>{t('quoteSettingsEntry')}</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <Text style={[styles.section, { color: colors.textSecondary }]}>{t('aboutSection')}</Text>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.navigate('About')} style={styles.row}>
          <Text style={{ color: colors.text, fontSize: 15 }}>{t('aboutApp')}</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20 },
  title: { fontSize: 30, fontWeight: '800', marginBottom: 12 },
  section: { fontSize: 12, fontWeight: '700', marginTop: 20, marginBottom: 8, letterSpacing: 0.5 },
  card: { borderWidth: 1, borderRadius: 14, overflow: 'hidden' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  rowLeft: { flexDirection: 'row', alignItems: 'center' },
  swatchRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  swatch: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  pill: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20, borderWidth: 1 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14 },
  divider: { height: 1 },
  pickerList: { maxHeight: 220 },
  pickerRow: { paddingVertical: 10 },
});
