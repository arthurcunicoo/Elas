import { PropsWithChildren, useCallback, useRef } from 'react';
import { Animated, Easing, Platform, StyleProp, ViewStyle } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useReducedMotion } from '../hooks/useReducedMotion';
type Props = PropsWithChildren<{ duration?: number; delay?: number; distance?: number; style?: StyleProp<ViewStyle> }>;
export function MotionReveal({ children, delay = 0, duration = 620, distance = 28, style }: Props) {
  const progress = useRef(new Animated.Value(1)).current;
  const reduced = useReducedMotion();
  useFocusEffect(useCallback(() => {
    if (reduced) { progress.setValue(1); return; }
    progress.setValue(0);
    const animation = Animated.timing(progress, { toValue: 1, duration, delay, easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== 'web' });
    animation.start();
    return () => animation.stop();
  }, [delay, duration, progress, reduced]));
  return <Animated.View style={[style, { opacity: progress, transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) }, { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [.97, 1] }) }] }]}>{children}</Animated.View>;
}
