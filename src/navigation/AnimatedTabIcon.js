import React, { useEffect } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, interpolate, Easing } from 'react-native-reanimated';

const DURATION = 220;

/**
 * Lives entirely in the bottom tab bar — it only animates the icon itself
 * (a quick pop + a color crossfade instead of the default instant tint
 * swap), never the screen content. That keeps it decoupled from whatever
 * screen's on screen: no wrapping, no remount risk.
 *
 * The color "crossfade" is two stacked Ionicons (one inactiveColor, one
 * activeColor) with the active one's opacity animated 0->1, NOT a single
 * icon with an animated color prop. Animating an icon's color prop
 * directly via useAnimatedProps was unreliable here — for tabs other than
 * the one focused at first mount, the color sometimes settled on neither
 * the intended active nor inactive color once the crossfade finished.
 * Two-icons-plus-opacity only ever animates opacity (the same technique
 * already used reliably elsewhere in this app), which sidesteps that
 * whole class of bug.
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
  const activeIconStyle = useAnimatedStyle(() => ({ opacity: progress.value }));

  return (
    <Animated.View style={containerStyle}>
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={iconName} size={size} color={inactiveColor} style={{ position: 'absolute' }} />
        <Animated.View style={activeIconStyle}>
          <Ionicons name={iconName} size={size} color={activeColor} />
        </Animated.View>
      </View>
    </Animated.View>
  );
}
