import React, { useRef } from 'react';
import { Animated, PanResponder, StyleSheet, Text, View, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../i18n/LanguageContext';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_TRIGGER = 76; // distance needed to fire the action
const MAX_SWIPE = 96; // visual clamp so the row can't be dragged forever

/**
 * Wraps a Notes row with iOS-style swipe actions:
 *  - Swipe RIGHT  -> reveals a "Pin" action in the app's accent color
 *  - Swipe LEFT   -> reveals a "Delete" action in the danger color
 *
 * Pure React Native Animated + PanResponder implementation — intentionally
 * avoids react-native-gesture-handler since it isn't in this project's
 * dependency tree yet, keeping this drop-in and CI-build-safe.
 */
export default function SwipeableNoteRow({ children, onPin, isPinned, onDelete, disabled = false }) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const translateX = useRef(new Animated.Value(0)).current;
  const rowRef = useRef(null);

  const resetPosition = (toValue = 0) => {
    Animated.spring(translateX, {
      toValue,
      useNativeDriver: true,
      bounciness: 6,
      speed: 16,
    }).start();
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => {
        if (disabled) return false;
        return Math.abs(gesture.dx) > 8 && Math.abs(gesture.dx) > Math.abs(gesture.dy);
      },
      onPanResponderMove: (_, gesture) => {
        // Clamp so the row never travels further than MAX_SWIPE in either direction
        const clamped = Math.max(-MAX_SWIPE, Math.min(MAX_SWIPE, gesture.dx));
        translateX.setValue(clamped);
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx >= SWIPE_TRIGGER) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          resetPosition(0);
          onPin && onPin();
        } else if (gesture.dx <= -SWIPE_TRIGGER) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          resetPosition(0);
          onDelete && onDelete();
        } else {
          resetPosition(0);
        }
      },
      onPanResponderTerminate: () => resetPosition(0),
    })
  ).current;

  const pinOpacity = translateX.interpolate({
    inputRange: [0, SWIPE_TRIGGER],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const deleteOpacity = translateX.interpolate({
    inputRange: [-SWIPE_TRIGGER, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.wrapper}>
      {/* Background action layer, revealed as the row is dragged */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={styles.actionsRow}>
          <Animated.View style={[styles.actionLeft, { backgroundColor: colors.primary, opacity: pinOpacity }]}>
            <Ionicons name={isPinned ? 'pin' : 'pin-outline'} size={20} color={colors.onPrimary} />
            <Text style={[styles.actionLabel, { color: colors.onPrimary }]}>
              {isPinned ? t('unpin') : t('pin')}
            </Text>
          </Animated.View>
          <Animated.View style={[styles.actionRight, { backgroundColor: colors.danger, opacity: deleteOpacity }]}>
            <Ionicons name="trash" size={20} color="#FFFFFF" />
            <Text style={[styles.actionLabel, { color: '#FFFFFF' }]}>{t('delete')}</Text>
          </Animated.View>
        </View>
      </View>

      <Animated.View
        ref={rowRef}
        {...panResponder.panHandlers}
        style={{ transform: [{ translateX }] }}
      >
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    overflow: 'hidden',
  },
  actionsRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionLeft: {
    width: SCREEN_WIDTH,
    marginLeft: -SCREEN_WIDTH + MAX_SWIPE,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  actionRight: {
    width: SCREEN_WIDTH,
    marginRight: -SCREEN_WIDTH + MAX_SWIPE,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
});
