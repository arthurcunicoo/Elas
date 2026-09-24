import { useCallback, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { MotionReveal } from '../MotionReveal';
import { useReducedMotion } from '../../hooks/useReducedMotion';
export function ImpactStatCard({ total, label, color, delay }: { total: number; label: string; color: string; delay: number }) {
  const reduced = useReducedMotion();
  const value = useRef(new Animated.Value(total)).current;
  const [count, setCount] = useState(total);
  useFocusEffect(useCallback(() => {
    if (reduced) { setCount(total); return; }
    value.setValue(0); setCount(0);
    const listener = value.addListener(({ value: current }) => setCount(Math.round(current)));
    const animation = Animated.timing(value, { toValue: total, duration: 850, delay, easing: Easing.out(Easing.cubic), useNativeDriver: false });
    animation.start();
    return () => { animation.stop(); value.removeListener(listener); };
  }, [delay, reduced, total, value]));
  return <MotionReveal delay={delay} duration={340} distance={15} style={styles.card}><Text accessibilityLabel={`${total} ${label}`} style={[styles.number, { color }]}>{count}</Text><Text style={styles.label}>{label}</Text></MotionReveal>;
}
const styles = StyleSheet.create({ card: { flex: 1, backgroundColor: 'white', borderRadius: 18, alignItems: 'center', justifyContent: 'center', paddingVertical: 8, paddingHorizontal: 4, minHeight: 102, shadowColor: '#681532', shadowOpacity: .12, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 3 }, number: { fontSize: 56, lineHeight: 61, fontWeight: '800', fontVariant: ['tabular-nums'] }, label: { fontSize: 13, color: '#30213C', textAlign: 'center', marginTop: 1 } });
