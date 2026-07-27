import React, { useMemo, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { useChallenges } from '../context/ChallengeContext';
import ChallengeCard from '../components/ChallengeCard';
import SideDrawer from '../components/SideDrawer';

export default function ChallengesScreen({ navigation }) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const {
    challenges,
    archiveChallenge,
    deleteChallenge,
    checkInChallenge,
  } = useChallenges();
  const insets = useSafeAreaInsets();

  const [drawerVisible, setDrawerVisible] = useState(false);

  // Separate active and archived challenges
  const activeChallenges = useMemo(
    () => challenges.filter((c) => !c.archived && c.status === 'active'),
    [challenges]
  );

  const completedChallenges = useMemo(
    () => challenges.filter((c) => !c.archived && c.status === 'completed'),
    [challenges]
  );

  const handleDeleteChallenge = (challenge) => {
    Alert.alert(
      t('deleteConfirmTitle'),
      `${t('deleteConfirmBody')} "${challenge.name}"?`,
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: () => deleteChallenge(challenge.id),
        },
      ]
    );
  };

  const handleCheckIn = (challengeId) => {
    checkInChallenge(challengeId);
  };

  const handleAddChallenge = () => {
    navigation.navigate('StartChallenge');
  };

  const renderEmptyState = () => (
    <View style={styles.empty}>
      <Text style={{ fontSize: 48, marginBottom: 12 }}>🎯</Text>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>
        {t('noChallengesTitle')}
      </Text>
      <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
        {t('noChallengesSubtitle')}
      </Text>
      <TouchableOpacity
        onPress={handleAddChallenge}
        style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
      >
        <Text style={[styles.emptyBtnText, { color: colors.onPrimary }]}>
          {t('startFirstChallenge')}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 12 }]}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => setDrawerVisible(true)} style={styles.menuBtn}>
            <Ionicons name="menu" size={26} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>{t('challenges')}</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('TrophyCase')} style={styles.trophyBtn}>
          <Ionicons name="trophy" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {activeChallenges.length === 0 && completedChallenges.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={[
            { type: 'section', title: 'Active Challenges', items: activeChallenges },
            { type: 'section', title: 'Completed Challenges', items: completedChallenges },
          ].filter((section) => section.items.length > 0)}
          keyExtractor={(item, index) => `${item.type}_${index}`}
          contentContainerStyle={{ paddingBottom: 100 }}
          renderItem={({ item }) => {
            if (item.type === 'section') {
              return (
                <View>
                  <Text
                    style={[
                      styles.sectionTitle,
                      { color: colors.textSecondary, marginTop: item.title === 'Active Challenges' ? 0 : 20 },
                    ]}
                  >
                    {item.title}
                  </Text>
                  {item.items.map((challenge, idx) => (
                    <ChallengeCard
                      key={challenge.id}
                      challenge={challenge}
                      index={idx}
                      onCheckIn={() => handleCheckIn(challenge.id)}
                      onPress={() => navigation.navigate('ChallengeDetail', { challengeId: challenge.id })}
                      onArchive={() => archiveChallenge(challenge.id)}
                      onDelete={() => handleDeleteChallenge(challenge)}
                      onEdit={() => navigation.navigate('StartChallenge', { challengeId: challenge.id })}
                      onMore={() => navigation.navigate('ChallengeDetail', { challengeId: challenge.id })}
                    />
                  ))}
                </View>
              );
            }
            return null;
          }}
        />
      )}

      <TouchableOpacity
        onPress={handleAddChallenge}
        style={[styles.fab, { backgroundColor: colors.primary }]}
      >
        <Ionicons name="add" size={28} color={colors.onPrimary} />
      </TouchableOpacity>

      <SideDrawer visible={drawerVisible} onClose={() => setDrawerVisible(false)} navigation={navigation} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuBtn: { padding: 4 },
  title: { fontSize: 26, fontWeight: '800' },
  trophyBtn: { padding: 4 },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    marginBottom: 20,
    textAlign: 'center',
  },
  emptyBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
  },
  emptyBtnText: {
    fontWeight: '600',
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 12,
    marginTop: 16,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
});
