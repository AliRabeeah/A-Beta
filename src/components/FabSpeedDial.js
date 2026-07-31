import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, Easing } from 'react-native-reanimated';
import { useTheme } from '../theme/ThemeContext';
import { useTokens, withAlpha } from '../theme/tokens';
import { useLanguage } from '../i18n/LanguageContext';
import { useSpeedDial, DEFAULT_SPEED_DIAL } from '../context/SpeedDialContext';

/**
 * Long-press-triggered quick-navigation popover, anchored above the FAB
 * it's opened from. Mirrors AddOptionsSheet's Reanimated-driven pattern
 * (scale/fade in with a spring, tap-outside-to-dismiss backdrop) but
 * renders as a small floating menu instead of a full-width bottom sheet,
 * since this is a shortcut list, not a multi-line "create new" chooser.
 */
export default function FabSpeedDial({ visible, onClose }) {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const tokens = useTokens();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const { items: activeIds, loaded, pool } = useSpeedDial();

  const scale = useSharedValue(0.85);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      scale.value = withSpring(1, { damping: 14, stiffness: 220 });
      opacity.value = withTiming(1, { duration: 160, easing: Easing.out(Easing.cubic) });
    } else {
      // Reset for next time it opens — Modal unmounts its content on
      // close, but resetting here too avoids a stale start value if
      // `visible` is ever toggled true again before the state settles.
      scale.value = 0.85;
      opacity.value = 0;
    }
  }, [visible]);

  const menuStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }, { translateY: (1 - scale.value) * 12 }],
  }));

  if (!visible) return null;

  // Before the stored config loads, fall back to the classic 5-shortcut
  // layout so there's never a flash of an empty popover.
  const shortcutIds = loaded && activeIds.length > 0 ? activeIds : DEFAULT_SPEED_DIAL;
  const items = shortcutIds.map((id) => pool.find((s) => s.id === id)).filter(Boolean);

  const handleSelect = (screenId) => {
    Haptics.selectionAsync();
    onClose();
    navigation.navigate(screenId);
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
        <Animated.View
          style={[
            styles.menu,
            menuStyle,
            {
              right: 20,
              bottom: insets.bottom + 96, // clears the FAB (~64 tall, ~24 from edge) plus a gap
              backgroundColor: colors.surfaceElevated || colors.surface,
              borderColor: withAlpha(colors.primary, 0.25),
              borderRadius: tokens.radius.card,
            },
          ]}
        >
          {items.map((item, idx) => (
            <TouchableOpacity
              key={item.id}
              onPress={() => handleSelect(item.id)}
              activeOpacity={0.7}
              style={[
                styles.row,
                idx < items.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: withAlpha(colors.text, 0.08) },
              ]}
            >
              <View style={[styles.iconCircle, { backgroundColor: withAlpha(colors.primary, 0.16) }]}>
                <Ionicons name={item.icon} size={17} color={colors.primary} />
              </View>
              <Text style={{ color: colors.text, fontSize: 14.5, fontWeight: '600', marginLeft: 12 }}>
                {t(`tabScreen_${item.id}`)}
              </Text>
            </TouchableOpacity>
          ))}
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  menu: {
    position: 'absolute',
    minWidth: 190,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 10,
  },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 13 },
  iconCircle: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
});
