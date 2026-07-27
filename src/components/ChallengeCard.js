import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { useTheme } from '../theme/ThemeContext';
import { useTokens, withAlpha } from '../theme/tokens';
import { useLanguage } from '../i18n/LanguageContext';
import { toKey, calendarDaysBetween } from '../utils/dateUtils';
import AnimatedPressable from './AnimatedPressable';
import ActionSheet from './ActionSheet';

export default function ChallengeCard({
  challenge,
  onCheckIn,
  onPress,
  onArchive,
  onDelete,
  onEdit,
  onMore,
  onReorderRequest,
  index = 0,
}) {
  const { colors } = useTheme();
  const tokens = useTokens();
  const { t } = useLanguage();
  const [menuVisible, setMenuVisible] = useState(false);

  // Calculate current day and progress
  const startDate = new Date(challenge.startDate);
  const today = new Date();
  const daysElapsed = calendarDaysBetween(startDate, today);
  const currentDay = Math.max(1, Math.min(daysElapsed + 1, challenge.durationDays));
  const progressPercent = (currentDay / challenge.durationDays) * 100;

  // Count consecutive days (streak)
  const calculateStreak = () => {
    let streak = 0;
    const date = new Date(today);
    for (let i = 0; i < challenge.durationDays; i++) {
      const key = toKey(date);
      if (challenge.completions?.[key]) {
        streak++;
        date.setDate(date.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  };

  const streak = calculateStreak();
  const todayKey = toKey(today);
  const checkedInToday = challenge.completions?.[todayKey];

  // Get next milestone
  const nextMilestone = useMemo(() => {
    return (challenge.milestones || []).find((m) => !m.achieved);
  }, [challenge.milestones]);

  const menuActions = [
    { icon: checkedInToday ? 'checkmark-circle' : 'checkmark-circle-outline', label: checkedInToday ? 'Checked in today' : 'Check in today', onPress: handleCheckIn },
    { icon: 'create-outline', label: 'Edit', onPress: onEdit },
    ...(onReorderRequest ? [{ icon: 'swap-vertical-outline', label: t('reorderItems'), onPress: onReorderRequest }] : []),
    { icon: 'trash-outline', label: t('delete'), onPress: onDelete, destructive: true },
    { icon: 'ellipsis-horizontal-circle-outline', label: 'More', onPress: onMore || onPress },
  ];

  const progressWidth = useSharedValue(0);
  useEffect(() => {
    progressWidth.value = withTiming(progressPercent, { duration: 600, easing: Easing.out(Easing.cubic) });
  }, [progressPercent]);
  const progressStyle = useAnimatedStyle(() => ({ width: `${progressWidth.value}%` }));

  function handleCheckIn() {
    Haptics.impactAsync(checkedInToday ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Heavy);
    onCheckIn && onCheckIn();
  }

  return (
    <>
      <AnimatedPressable
        index={index}
        onPress={handleCheckIn}
        onLongPress={() => {
          Haptics.selectionAsync();
          setMenuVisible(true);
        }}
        style={[styles.card, tokens.glass.card, tokens.shadow.soft]}
      >
        <LinearGradient
          colors={[withAlpha(challenge.color, 0.16), 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />

        {/* Header: Icon, Name, Status */}
        <View style={styles.header}>
          <View style={[styles.colorDot, { backgroundColor: challenge.color }]} />
          <View style={styles.info}>
            <Text style={[styles.name, { color: colors.text }]}>
              {challenge.icon} {challenge.name}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Day {currentDay}/{challenge.durationDays}
            </Text>
          </View>
          <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.moreBtn} hitSlop={8}>
            <Ionicons name="ellipsis-horizontal" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Progress Bar */}
        <View style={[styles.progressContainer, { backgroundColor: withAlpha(colors.text, 0.08) }]}>
          <Animated.View style={progressStyle}>
            <LinearGradient
              colors={tokens.gradient(challenge.color)}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.progressBar}
            />
          </Animated.View>
        </View>

        {/* Footer: Streak, Metrics, Check-in Button */}
        <View style={styles.footer}>
          <View style={styles.stats}>
            {streak > 0 && (
              <Text style={[styles.stat, { color: colors.textSecondary }]}>
                🔥 {t('dayStreak', streak)}
              </Text>
            )}
            {challenge.metrics?.totalImpact > 0 && (
              <Text style={[styles.stat, { color: colors.textSecondary }]}>
                {challenge.metrics.totalImpact} {challenge.metrics.unit}
              </Text>
            )}
            {nextMilestone && (
              <Text style={[styles.stat, { color: colors.primary }]}>
                {BADGES[nextMilestone.badgeId]?.icon} {nextMilestone.day}d
              </Text>
            )}
          </View>

          <TouchableOpacity
            onPress={handleCheckIn}
            style={[
              styles.checkInBtn,
              {
                backgroundColor: checkedInToday ? challenge.color : withAlpha(colors.text, 0.04),
                borderColor: checkedInToday ? challenge.color : tokens.hairline,
              },
              checkedInToday && tokens.glow(challenge.color),
            ]}
          >
            <Ionicons
              name={checkedInToday ? 'checkmark' : 'checkmark-circle-outline'}
              size={18}
              color={checkedInToday ? colors.onPrimary : challenge.color}
            />
          </TouchableOpacity>
        </View>
      </AnimatedPressable>

      <ActionSheet
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        title={challenge.name}
        actions={menuActions}
      />
    </>
  );
}

// Badge definitions (imported from ChallengeContext)
const BADGES = {
  badge_3d: { icon: '🌱' },
  badge_7d: { icon: '⚔️' },
  badge_14d: { icon: '🛡️' },
  badge_30d: { icon: '👑' },
};

const styles = StyleSheet.create({
  card: {
    padding: 14,
    marginBottom: 10,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  colorDot: {
    width: 8,
    height: 32,
    borderRadius: 4,
    marginRight: 12,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  moreBtn: {
    padding: 4,
  },
  progressContainer: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stats: {
    flexDirection: 'row',
    gap: 12,
    flex: 1,
  },
  stat: {
    fontSize: 12,
    fontWeight: '500',
  },
  checkInBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
});
