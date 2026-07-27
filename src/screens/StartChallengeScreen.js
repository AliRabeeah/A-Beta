import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { useChallenges } from '../context/ChallengeContext';

const COLORS = [
  '#FF8A00', '#00E676', '#0A84FF', '#BF5AF2',
  '#FF453A', '#FFD60A', '#64D2FF', '#FF375F',
];

const ICONS = ['🎯', '🍬', '😴', '🍔', '📱', '📚', '💪', '🧘', '💧', '🏃', '🚀', '⚡'];

export default function StartChallengeScreen({ navigation, route }) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const { addChallenge, updateChallenge, challenges, presets } = useChallenges();
  const insets = useSafeAreaInsets();
  const existingChallenge = challenges.find((challenge) => challenge.id === route.params?.challengeId);
  const isEditing = !!existingChallenge;

  const [mode, setMode] = useState(isEditing ? 'custom' : 'select'); // 'select' | 'preset' | 'custom'
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [showPicker, setShowPicker] = useState(false);

  // Custom challenge form state
  const [name, setName] = useState(existingChallenge?.name || '');
  const [icon, setIcon] = useState('🎯');
  const [color, setColor] = useState(existingChallenge?.color || '#FF8A00');
  const [description, setDescription] = useState(existingChallenge?.description || '');
  const [durationDays, setDurationDays] = useState(String(existingChallenge?.durationDays || 30));
  const [reminders, setReminders] = useState(existingChallenge?.reminders || ['20:00']);
  const [startDate, setStartDate] = useState(existingChallenge ? new Date(existingChallenge.startDate) : new Date());
  const [metricUnit, setMetricUnit] = useState(existingChallenge?.metrics?.unit || '');
  const [metricValue, setMetricValue] = useState(String(existingChallenge?.metrics?.valuePerDay || ''));

  useEffect(() => {
    if (existingChallenge?.icon) setIcon(existingChallenge.icon);
  }, [existingChallenge?.icon]);

  const handleSelectPreset = (preset) => {
    setSelectedPreset(preset);
    setMode('preset');
  };

  const localizedPresetName = (preset) =>
    t(`${preset.id}_name`) !== `${preset.id}_name` ? t(`${preset.id}_name`) : preset.name;
  const localizedPresetDesc = (preset) =>
    t(`${preset.id}_desc`) !== `${preset.id}_desc` ? t(`${preset.id}_desc`) : preset.description;

  const handleStartPreset = async () => {
    if (selectedPreset) {
      const challengeData = {
        name: localizedPresetName(selectedPreset),
        icon: selectedPreset.icon,
        color: '#FF8A00',
        description: localizedPresetDesc(selectedPreset),
        durationDays: selectedPreset.durationDays,
        reminders: selectedPreset.defaultReminders,
        startDate: new Date().toISOString(),
        metrics: selectedPreset.defaultMetrics,
        type: 'preset',
      };
      await addChallenge(challengeData);
      navigation.navigate('Challenges');
    }
  };

  const handleCreateCustom = async () => {
    if (!name.trim()) {
      Alert.alert(t('pleaseEnterChallengeName'));
      return;
    }

    const challengeData = {
      name,
      icon,
      color,
      description,
      durationDays: parseInt(durationDays) || 30,
      reminders,
      startDate: startDate.toISOString(),
      metrics: metricUnit ? { unit: metricUnit, valuePerDay: parseInt(metricValue) || 0 } : null,
      type: 'custom',
    };

    if (isEditing) {
      await updateChallenge(existingChallenge.id, challengeData);
      navigation.goBack();
    } else {
      await addChallenge(challengeData);
      navigation.navigate('Challenges');
    }
  };

  if (mode === 'select') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={28} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>{t('startChallengeTitle')}</Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            {t('chooseChallengeType')}
          </Text>

          <TouchableOpacity
            onPress={() => setMode('preset')}
            style={[styles.optionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <Ionicons name="star" size={32} color={colors.primary} />
            <Text style={[styles.optionTitle, { color: colors.text }]}>
              {t('browsePresets')}
            </Text>
            <Text style={[styles.optionSubtitle, { color: colors.textSecondary }]}>
              {t('browsePresetsSubtitle')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setMode('custom')}
            style={[styles.optionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <Ionicons name="create" size={32} color={colors.primary} />
            <Text style={[styles.optionTitle, { color: colors.text }]}>
              {t('createCustomChallenge')}
            </Text>
            <Text style={[styles.optionSubtitle, { color: colors.textSecondary }]}>
              {t('createCustomChallengeSubtitle')}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  if (mode === 'preset') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => setMode('select')}
            style={styles.backBtn}
          >
            <Ionicons name="chevron-back" size={28} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>{t('presetChallengesTitle')}</Text>
          <View style={{ width: 28 }} />
        </View>

        <FlatList
          data={presets}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.content}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => handleSelectPreset(item)}
              style={[
                styles.presetCard,
                {
                  backgroundColor: selectedPreset?.id === item.id ? colors.primary : colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={styles.presetIcon}>{item.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.presetName,
                    { color: selectedPreset?.id === item.id ? colors.onPrimary : colors.text },
                  ]}
                >
                  {localizedPresetName(item)}
                </Text>
                <Text
                  style={[
                    styles.presetDescription,
                    { color: selectedPreset?.id === item.id ? colors.onPrimary : colors.textSecondary },
                  ]}
                >
                  {localizedPresetDesc(item)}
                </Text>
              </View>
              {selectedPreset?.id === item.id && (
                <Ionicons name="checkmark-circle" size={24} color={colors.onPrimary} />
              )}
            </TouchableOpacity>
          )}
        />

        {selectedPreset && (
          <TouchableOpacity
            onPress={handleStartPreset}
            style={[styles.startBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={[styles.startBtnText, { color: colors.onPrimary }]}>
              {t('startChallengeButton')}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // Custom challenge creation
  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => setMode('select')}
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>{isEditing ? t('editChallengeTitle') : t('createChallengeTitle')}</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>{t('nameLabel')}</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder={t('challengeNamePlaceholder')}
          placeholderTextColor={colors.textSecondary}
          style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
        />

        <Text style={[styles.label, { color: colors.textSecondary, marginTop: 16 }]}>{t('iconLabel')}</Text>
        <View style={styles.iconGrid}>
          {ICONS.map((ic) => (
            <TouchableOpacity
              key={ic}
              onPress={() => setIcon(ic)}
              style={[
                styles.iconChip,
                { backgroundColor: icon === ic ? colors.primary : colors.surface, borderColor: colors.border },
              ]}
            >
              <Text style={styles.iconText}>{ic}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.label, { color: colors.textSecondary, marginTop: 16 }]}>{t('colorLabel')}</Text>
        <View style={styles.colorGrid}>
          {COLORS.map((c) => (
            <TouchableOpacity
              key={c}
              onPress={() => setColor(c)}
              style={[
                styles.colorChip,
                { backgroundColor: c, borderWidth: color === c ? 3 : 0, borderColor: colors.text },
              ]}
            />
          ))}
        </View>

        <Text style={[styles.label, { color: colors.textSecondary, marginTop: 16 }]}>{t('descriptionLabel')}</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder={t('challengeGoalPlaceholder')}
          placeholderTextColor={colors.textSecondary}
          style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface, minHeight: 80 }]}
          multiline
        />

        <Text style={[styles.label, { color: colors.textSecondary, marginTop: 16 }]}>{t('durationDaysLabel')}</Text>
        <TextInput
          value={durationDays}
          onChangeText={setDurationDays}
          keyboardType="numeric"
          placeholder="30"
          placeholderTextColor={colors.textSecondary}
          style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
        />

        <Text style={[styles.label, { color: colors.textSecondary, marginTop: 16 }]}>{t('impactMetricLabel')}</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TextInput
            value={metricUnit}
            onChangeText={setMetricUnit}
            placeholder={t('metricUnitPlaceholder')}
            placeholderTextColor={colors.textSecondary}
            style={[styles.input, { flex: 1, color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
          />
          <TextInput
            value={metricValue}
            onChangeText={setMetricValue}
            keyboardType="numeric"
            placeholder={t('metricValuePlaceholder')}
            placeholderTextColor={colors.textSecondary}
            style={[styles.input, { flex: 1, color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
          />
        </View>

        <TouchableOpacity
          onPress={handleCreateCustom}
          style={[styles.createBtn, { backgroundColor: colors.primary, marginTop: 24 }]}
        >
          <Text style={[styles.createBtnText, { color: colors.onPrimary }]}>
            {isEditing ? t('saveChanges') : t('createChallengeTitle')}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  backBtn: { padding: 4 },
  title: { fontSize: 20, fontWeight: '700', flex: 1, textAlign: 'center' },
  content: { paddingHorizontal: 20, paddingBottom: 100 },
  sectionTitle: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginBottom: 12 },
  optionCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
    marginBottom: 12,
  },
  optionTitle: { fontSize: 16, fontWeight: '700', marginTop: 12 },
  optionSubtitle: { fontSize: 12, marginTop: 4 },
  presetCard: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    alignItems: 'center',
    marginBottom: 10,
    gap: 12,
  },
  presetIcon: { fontSize: 32 },
  presetName: { fontSize: 14, fontWeight: '700' },
  presetDescription: { fontSize: 12, marginTop: 2 },
  label: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginBottom: 8 },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    fontSize: 14,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  iconChip: {
    width: '23%',
    aspectRatio: 1,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: { fontSize: 24 },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorChip: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  startBtn: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  startBtnText: { fontWeight: '700', fontSize: 14 },
  createBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 20,
  },
  createBtnText: { fontWeight: '700', fontSize: 14 },
});
