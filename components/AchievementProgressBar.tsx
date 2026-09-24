import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/theme';
import { useReducedMotion } from '../hooks/useReducedMotion';
export function AchievementProgressBar({ value, total, delay = 0, compact = false, poll = false }: { value: number; total: number; delay?: number; compact?: boolean; poll?: boolean }) {
  const reduced = useReducedMotion();
  const progress = useRef(new Animated.Value(value / total)).current;
  const played = useRef(false);
  useEffect(() => {
    if (reduced) { progress.stopAnimation(); progress.setValue(value / total); return; }
    if (played.current) return;
    played.current = true;
    progress.setValue(0);
    const animation = Animated.timing(progress, { toValue: value / total, duration: 650, delay, easing: Easing.out(Easing.cubic), useNativeDriver: false });
    animation.start();
    return () => { animation.stop(); progress.setValue(value / total); };
  }, [progress, reduced, total, value, delay]);
  return <View style={[styles.progressRow, poll && { marginTop: 3 }]} accessible accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: total, now: value, text: `${value} de ${total}` }}><View style={[styles.track, compact && { height: 7 }, poll && { height: 14, borderRadius: 7 }]}><Animated.View style={[styles.fill, poll && { backgroundColor: colors.achievement, borderRadius: 7 }, { width: progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} /></View>{!poll && <Text style={[styles.count, compact && { fontSize: 9, minWidth: 26 }]}>{value}/{total}</Text>}</View>;
}
const styles = StyleSheet.create({ progressRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 }, track: { flex: 1, height: 9, backgroundColor: '#EAEAEA', borderRadius: 5, overflow: 'hidden' }, fill: { height: '100%', backgroundColor: colors.pink, borderRadius: 5 }, count: { color: colors.wine, fontSize: 11, fontWeight: '600', minWidth: 31, textAlign: 'right' } });
