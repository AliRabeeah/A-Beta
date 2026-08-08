import React, { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';

const FADE_DURATION = 180; // quick and subtle — see navigation/index.js for why

/**
 * Wraps a bottom-tab screen so it fades in each time the tab becomes
 * focused, instead of the default instant swap. Opacity-only (no
 * translation), so it's identical in LTR and RTL — no mirroring logic
 * needed. Respects the system's "remove animations" accessibility
 * setting by skipping straight to fully visible when it's on.
 */
export default function withTabFade(ScreenComponent) {
  return function FadedScreen(props) {
    const isFocused = useIsFocused();
    const opacity = useSharedValue(1);
    const [reduceMotion, setReduceMotion] = useState(false);

    useEffect(() => {
      let mounted = true;
      AccessibilityInfo.isReduceMotionEnabled?.()
        .then((v) => mounted && setReduceMotion(!!v))
        .catch(() => {});
      return () => {
        mounted = false;
      };
    }, []);

    useEffect(() => {
      if (!isFocused) return;
      if (reduceMotion) {
        opacity.value = 1;
        return;
      }
      opacity.value = 0;
      opacity.value = withTiming(1, { duration: FADE_DURATION, easing: Easing.out(Easing.quad) });
    }, [isFocused, reduceMotion, opacity]);

    const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

    return (
      <Animated.View style={[{ flex: 1 }, style]}>
        <ScreenComponent {...props} />
      </Animated.View>
    );
  };
}
