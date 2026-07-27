import React, { useEffect } from 'react';
import { Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  Easing,
} from 'react-native-reanimated';

const AnimatedPressableBase = Animated.createAnimatedComponent(Pressable);

/**
 * Wraps a card/row with:
 *  - a staggered slide + fade entrance (driven by `index` in a list)
 *  - a spring "press scale" (0.96) on touch down/up, for tactile feedback
 *
 * Fully presentational: forwards onPress / onLongPress untouched, so it can
 * be dropped in as a 1:1 replacement for TouchableOpacity in existing cards.
 */
export default function AnimatedPressable({
  children,
  onPress,
  onLongPress,
  style,
  index = 0,
  disabled,
  ...rest
}) {
  const scale = useSharedValue(0.96);
  const entrance = useSharedValue(0);

  useEffect(() => {
    const delay = Math.min(index, 8) * 45; // cap stagger so item #30 isn't 1.5s late
    entrance.value = withDelay(
      delay,
      withTiming(1, { duration: 380, easing: Easing.out(Easing.cubic) })
    );
    scale.value = withDelay(delay, withSpring(1, { damping: 14, stiffness: 160 }));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: entrance.value,
    transform: [
      { translateY: (1 - entrance.value) * 14 },
      { scale: scale.value },
    ],
  }));

  const handlePressIn = () => {
    scale.value = withTiming(0.96, { duration: 90 });
  };
  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 14, stiffness: 200 });
  };

  return (
    <AnimatedPressableBase
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={[style, animatedStyle]}
      {...rest}
    >
      {children}
    </AnimatedPressableBase>
  );
}
