import React, { useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  withTiming,
  interpolate,
  interpolateColor,
  Easing,
} from 'react-native-reanimated';

const AnimatedIonicons = Animated.createAnimatedComponent(Ionicons);
const DURATION = 220;

/**
 * Lives entirely in the bottom tab bar — it only animates the icon itself
 * (a quick pop + a smooth color crossfade instead of the default instant
 * tint swap), never the screen content. That keeps it decoupled from
 * whatever's on screen: no wrapping, no remount risk, safe even behind a
 * heavy screen like EvoCat's Skia canvas.
 */
export default function AnimatedTabIcon({ focused, iconName, size, activeColor, inactiveColor }) {
  const progress = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(focused ? 1 : 0, { duration: DURATION, easing: Easing.out(Easing.quad) });
  }, [focused, progress]);

  const containerStyle = useAnimatedStyle(() => ({
    // a quick pop that overshoots slightly then settles — only reads as a
    // "pop" when animating toward focused; unfocusing just eases back down
    transform: [{ scale: interpolate(progress.value, [0, 0.5, 1], [1, 1.16, 1]) }],
  }));

  const animatedProps = useAnimatedProps(() => ({
    color: interpolateColor(progress.value, [0, 1], [inactiveColor, activeColor]),
  }));

  return (
    <Animated.View style={containerStyle}>
      <AnimatedIonicons name={iconName} size={size} animatedProps={animatedProps} />
    </Animated.View>
  );
}
