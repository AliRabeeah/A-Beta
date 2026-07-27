import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useTokens, withAlpha } from '../theme/tokens';
import { useLanguage } from '../i18n/LanguageContext';
import { useChallenges } from '../context/ChallengeContext';
import Confetti from '../components/Confetti';

export default function TrophyCaseScreen({ navigation }) {
  const { colors } = useTheme();
  const tokens = useTokens();
  const { t } = useLanguage();
  const { badges, badgeDefinitions, challenges } = useChallenges();
  const insets = useSafeAreaInsets();

  const [selectedBadge, setSelectedBadge] = useState(null);
  const [burstKey, setBurstKey] = useState(0);

  const handleSelectBadge = (item) => {
    setSelectedBadge(item);
    if (item.achieved) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setBurstKey((k) => k + 1);
    } else {
      Haptics.selectionAsync();
    }
  };

  // Create a list of all possible badges with achievement status
  const allBadges = useMemo(() => {
    return Object.values(badgeDefinitions).map((badge) => ({
      ...badge,
      achieved: badges.includes(badge.id),
      earnedFrom: challenges.find((c) =>
        c.milestones?.some((m) => m.badgeId === badge.id && m.achieved)
      ),
    }));
  }, [badgeDefinitions, badges, challenges]);

  const achievedCount = useMemo(
    () => allBadges.filter((b) => b.achieved).length,
    [allBadges]
  );

  const renderBadgeItem = ({ item }) => (
    <TouchableOpacity
      onPress={() => handleSelectBadge(item)}
      style={[
        styles.badgeContainer,
        item.achieved ? tokens.glass.cardElevated : tokens.glass.card,
        { borderRadius: tokens.radius.card },
        item.achieved && tokens.glow(colors.primary),
      ]}
    >
      <View
        style={[
          styles.badgeCircle,
          { opacity: item.achieved ? 1 : 0.4 },
        ]}
      >
        <Text style={styles.badgeIcon}>{item.icon}</Text>
      </View>
      <Text
        style={[
          styles.badgeName,
          { color: item.achieved ? colors.text : colors.textSecondary },
        ]}
      >
        {t(`${item.id}_name`) !== `${item.id}_name` ? t(`${item.id}_name`) : item.name}
      </Text>
      {item.achieved && (
        <View style={[styles.achievedBadge, { backgroundColor: colors.primary }]}>
          <Ionicons name="checkmark" size={12} color={colors.onPrimary} />
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>{t('trophyCaseTitle')}</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* Stats */}
      <View style={[styles.statsCard, tokens.glass.card]}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.primary }]}>
            {achievedCount}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            {t('badgesEarnedLabel')}
          </Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: tokens.hairline }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.primary }]}>
            {allBadges.length}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            {t('totalAvailableLabel')}
          </Text>
        </View>
      </View>

      {/* Badges Grid */}
      <FlatList
        data={allBadges}
        keyExtractor={(item) => item.id}
        numColumns={3}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.gridContent}
        renderItem={renderBadgeItem}
      />

      {/* Badge Detail Modal */}
      <Modal
        visible={!!selectedBadge}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedBadge(null)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.7)' }]}>
          <View style={[styles.modalContent, tokens.glass.sheet, { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }]}>
            <TouchableOpacity
              onPress={() => setSelectedBadge(null)}
              style={styles.modalCloseBtn}
            >
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>

            {selectedBadge && (
              <>
                <View style={styles.modalBadgeContainer}>
                  <View
                    style={[
                      styles.modalBadgeCircle,
                      { opacity: selectedBadge.achieved ? 1 : 0.4 },
                      selectedBadge.achieved && tokens.glow(colors.primary),
                    ]}
                  >
                    <Text style={styles.modalBadgeIcon}>
                      {selectedBadge.icon}
                    </Text>
                  </View>
                  {selectedBadge.achieved && <Confetti burstKey={burstKey} colors={[colors.primary, '#00E676', '#FFD60A']} />}
                </View>

                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  {t(`${selectedBadge.id}_name`) !== `${selectedBadge.id}_name` ? t(`${selectedBadge.id}_name`) : selectedBadge.name}
                </Text>

                {selectedBadge.achieved ? (
                  <>
                    <Text style={[styles.modalDescription, { color: colors.textSecondary }]}>
                      {t('badgeEarnedMessage')}
                    </Text>
                    {selectedBadge.earnedFrom && (
                      <View style={[styles.earnedFrom, tokens.glass.card]}>
                        <Text style={[styles.earnedFromLabel, { color: colors.textSecondary }]}>
                          {t('earnedFromLabel')}
                        </Text>
                        <Text style={[styles.earnedFromChallenge, { color: colors.text }]}>
                          {selectedBadge.earnedFrom.name}
                        </Text>
                      </View>
                    )}
                  </>
                ) : (
                  <>
                    <Text style={[styles.modalDescription, { color: colors.textSecondary }]}>
                      {t('badgeLockedMessage', selectedBadge.day)}
                    </Text>
                    <View style={[styles.lockIcon, { backgroundColor: withAlpha(colors.text, 0.05) }]}>
                      <Ionicons name="lock-closed" size={32} color={colors.textSecondary} />
                    </View>
                  </>
                )}

                <TouchableOpacity
                  onPress={() => setSelectedBadge(null)}
                  style={[styles.modalBtn, { backgroundColor: colors.primary }]}
                >
                  <Text style={[styles.modalBtnText, { color: colors.onPrimary }]}>
                    {t('closeLabel')}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backBtn: { padding: 4 },
  title: { fontSize: 24, fontWeight: '800' },
  statsCard: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: '800' },
  statLabel: { fontSize: 12, fontWeight: '600', marginTop: 4 },
  statDivider: { width: 1, height: 40 },
  gridContent: { paddingBottom: 20 },
  gridRow: { justifyContent: 'space-between', marginBottom: 12 },
  badgeContainer: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
    position: 'relative',
  },
  badgeCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeIcon: { fontSize: 32 },
  badgeName: { fontSize: 11, fontWeight: '600', marginTop: 8, textAlign: 'center' },
  achievedBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  modalCloseBtn: { alignSelf: 'flex-end', padding: 4, marginBottom: 12 },
  modalBadgeContainer: { alignItems: 'center', marginBottom: 20 },
  modalBadgeCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBadgeIcon: { fontSize: 64 },
  modalTitle: { fontSize: 20, fontWeight: '700', textAlign: 'center', marginBottom: 12 },
  modalDescription: { fontSize: 14, textAlign: 'center', marginBottom: 16, lineHeight: 20 },
  earnedFrom: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 16,
  },
  earnedFromLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', marginBottom: 4 },
  earnedFromChallenge: { fontSize: 14, fontWeight: '600' },
  lockIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalBtn: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  modalBtnText: { fontWeight: '600', fontSize: 14 },
});
