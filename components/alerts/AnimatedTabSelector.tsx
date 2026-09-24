import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { TouchFeedback } from '../TouchFeedback';
import { useReducedMotion } from '../../hooks/useReducedMotion';
export type AlertTab = 'Avisos' | 'Notificações';
export function AnimatedTabSelector({ value, onChange }: { value: AlertTab; onChange: (tab: AlertTab) => void }) {
  const reduced = useReducedMotion();
  const progress = useRef(new Animated.Value(value === 'Avisos' ? 0 : 1)).current;
  const [width, setWidth] = useState(0);
  useEffect(() => { const animation = Animated.timing(progress, { toValue: value === 'Avisos' ? 0 : 1, duration: reduced ? 0 : 260, easing: Easing.inOut(Easing.cubic), useNativeDriver: false }); animation.start(); return () => animation.stop(); }, [value, reduced, progress]);
  return <View style={styles.tabs} onLayout={e => setWidth(e.nativeEvent.layout.width)}>
    <View pointerEvents="none" style={styles.backgrounds}><View style={styles.background} /><View style={styles.background} /></View>
    {width > 0 && <Animated.View pointerEvents="none" style={[styles.indicator, { width: (width - 20) / 2, transform: [{ translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [0, (width + 20) / 2] }) }] }]} />}
    {(['Avisos', 'Notificações'] as const).map((tab, index) => <TouchFeedback key={tab} role="tab" label={tab} selected={value === tab} onPress={() => onChange(tab)} style={styles.tab}><Animated.Text style={[styles.label, { color: progress.interpolate({ inputRange: [0, 1], outputRange: index === 0 ? ['#FFFFFF', '#2E1D3A'] : ['#2E1D3A', '#FFFFFF'] }) }]}>{tab}</Animated.Text></TouchFeedback>)}
  </View>;
}
const styles = StyleSheet.create({ tabs: { flexDirection: 'row', gap: 20, marginHorizontal: 19, marginTop: 20, marginBottom: 24 }, backgrounds: { ...StyleSheet.absoluteFillObject, flexDirection: 'row', gap: 20 }, background: { flex: 1, backgroundColor: '#E1E3E8', borderRadius: 6 }, indicator: { position: 'absolute', top: 0, bottom: 0, borderRadius: 6, backgroundColor: '#C91E50' }, tab: { flex: 1, minHeight: 44, justifyContent: 'center', alignItems: 'center' }, label: { fontSize: 20, fontWeight: '600' } });
