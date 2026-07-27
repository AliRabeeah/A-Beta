import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, Easing } from 'react-native-reanimated';
import { useTheme } from '../theme/ThemeContext';
import { useTokens, withAlpha } from '../theme/tokens';
import { useLanguage } from '../i18n/LanguageContext';

/**
 * Themed bottom sheet shown from any "+" button, offering to create a
 * Habit, a Recurring Task, or a (single) Task — each with an icon,
 * title, short description, and a chevron, matching the reference
 * design. Fully theme-aware: dark surface in dark mode, light surface
 * in light mode, like every other overlay in the app.
 */
import { useNavigation } from '@react-navigation/native';

export default function AddOptionsSheet({ visible, onClose, onSelectHabit, onSelectRecurringTask, onSelectTask }) {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const tokens = useTokens();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();

  const translateY = useSharedValue(40);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, { damping: 16, stiffness: 180 });
      opacity.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.cubic) });
    }
  }, [visible]);

  const sheetStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  if (!visible) return null;

  const options = [
    {
      key: 'habit',
      icon: 'trophy-outline',
      title: t('addMenuHabitTitle'),
      desc: t('addMenuHabitDesc'),
      onPress: onSelectHabit,
    },
    {
      key: 'recurringTask',
      icon: 'repeat-outline',
      title: t('addMenuRecurringTitle'),
      desc: t('addMenuRecurringDesc'),
      onPress: onSelectRecurringTask,
    },
    {
      key: 'task',
      icon: 'checkmark-outline',
      title: t('addMenuTaskTitle'),
      desc: t('addMenuTaskDesc'),
      onPress: onSelectTask,
    },
    {
      key: 'note',
      icon: 'document-text-outline',
      title: 'Add Note',
      desc: 'Capture your thoughts and ideas',
      onPress: () => navigation.navigate('AddEditNote'),
    },
  ];

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
        <View style={[styles.sheetWrap, { paddingBottom: insets.bottom + 16 }]}>
          <Animated.View style={sheetStyle}>
            <TouchableOpacity
              activeOpacity={1}
              style={[styles.sheet, { borderRadius: tokens.radius.sheet, borderColor: tokens.hairline }]}
            >
              <BlurView intensity={tokens.glass.blurIntensity} tint={tokens.glass.blurTint} style={StyleSheet.absoluteFillObject} />
              <View style={[StyleSheet.absoluteFillObject, { backgroundColor: tokens.glass.sheet.backgroundColor }]} />

              {options.map((opt, idx) => (
                <TouchableOpacity
                  key={opt.key}
                  onPress={() => {
                    Haptics.selectionAsync();
                    onClose();
                    opt.onPress && opt.onPress();
                  }}
                  style={[
                    styles.row,
                    idx < options.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: tokens.hairline },
                  ]}
                >
                  <View style={[styles.iconCircle, { backgroundColor: withAlpha(colors.primary, 0.14) }]}>
                    <Ionicons name={opt.icon} size={22} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 14 }}>
                    <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>{opt.title}</Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 4, lineHeight: 18 }}>{opt.desc}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              ))}
            </TouchableOpacity>
          </Animated.View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheetWrap: { paddingHorizontal: 16 },
  sheet: { borderWidth: 1, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 16 },
  iconCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
