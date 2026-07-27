import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';

const PIECE_COUNT = 18;
const COLORS_FALLBACK = ['#FF8A00', '#00E676', '#0A84FF', '#BF5AF2', '#FFD60A'];

function ConfettiPiece({ angle, distance, color, delay, onDone }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) }, (finished) => {
        if (finished && onDone) runOnJS(onDone)();
      })
    );
  }, []);

  const style = useAnimatedStyle(() => {
    const dx = Math.cos(angle) * distance * progress.value;
    const dy = Math.sin(angle) * distance * progress.value - 40 * progress.value; // slight upward arc
    const rotate = `${progress.value * angle * 200}deg`;
    return {
      opacity: 1 - progress.value,
      transform: [{ translateX: dx }, { translateY: dy }, { rotate }, { scale: 1 - 0.3 * progress.value }],
    };
  });

  return <Animated.View style={[styles.piece, { backgroundColor: color }, style]} />;
}

/**
 * Fires a one-shot confetti burst from the center of its bounding box.
 * Bump `burstKey` (e.g. a counter you increment) to trigger a new burst;
 * the component unmounts itself shortly after each burst finishes.
 */
export default function Confetti({ burstKey, colors = COLORS_FALLBACK }) {
  if (!burstKey) return null;

  const pieces = Array.from({ length: PIECE_COUNT }, (_, i) => ({
    id: `${burstKey}_${i}`,
    angle: (i / PIECE_COUNT) * Math.PI * 2 + Math.random() * 0.3,
    distance: 70 + Math.random() * 60,
    color: colors[i % colors.length],
    delay: Math.random() * 80,
  }));

  return (
    <View pointerEvents="none" style={styles.container}>
      {pieces.map((p) => (
        <ConfettiPiece key={p.id} angle={p.angle} distance={p.distance} color={p.color} delay={p.delay} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  piece: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 2,
  },
});
