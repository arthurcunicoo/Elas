import { ComponentProps, useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TouchFeedback } from './TouchFeedback';
import { colors } from '../constants/theme';
import { useReducedMotion } from '../hooks/useReducedMotion';
function NavMotion({ active, children }: { active: boolean; children: React.ReactNode }) {
  const reduced = useReducedMotion();
  const value = useRef(new Animated.Value(active ? 1 : 0)).current;
  useEffect(() => { const animation = Animated.spring(value, { toValue: active && !reduced ? 1 : 0, stiffness: 300, damping: 24, useNativeDriver: Platform.OS !== 'web' }); animation.start(); return () => animation.stop(); }, [active, reduced, value]);
  return <Animated.View style={{ transform: [{ translateY: value.interpolate({ inputRange: [0, 1], outputRange: [0, -2] }) }, { scale: value.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }) }] }}>{children}</Animated.View>;
}
const items: { label: string; icon: ComponentProps<typeof Ionicons>['name'] }[] = [{ label: 'Mapa', icon: 'location-outline' }, { label: 'Eventos', icon: 'calendar-outline' }, { label: 'Adicionar', icon: 'add' }, { label: 'Alertas', icon: 'notifications-outline' }, { label: 'Perfil', icon: 'person' }];
export function BottomNavigation({ onAction, active = 'Perfil' }: { onAction: (label: string) => void; active?: 'Mapa' | 'Eventos' | 'Alertas' | 'Perfil' }) {
  const insets = useSafeAreaInsets();
  return <View style={[styles.bar, { paddingBottom: Math.max(6, insets.bottom) }]}>
    {items.map(item => item.label === 'Adicionar' ? <View key={item.label} style={styles.slot}><TouchFeedback label="Adicionar avaliação" onPress={() => onAction(item.label)} spring pressedScale={.90} style={styles.add}><Ionicons name="add" color={colors.white} size={50} style={{ alignSelf: 'center' }} /></TouchFeedback></View> : <TouchFeedback key={item.label} label={item.label} selected={item.label === active} onPress={() => onAction(item.label)} spring style={styles.item}><NavMotion active={item.label === active}><View style={styles.content}><Ionicons name={item.label === 'Eventos' && active === 'Eventos' ? 'calendar' : item.label === 'Alertas' && active === 'Alertas' ? 'notifications' : item.label === 'Mapa' && active === 'Mapa' ? 'location' : item.label === 'Perfil' && active !== 'Perfil' ? 'person-outline' : item.icon} size={27} color={item.label === active ? colors.pink : '#E7628E'} /><Text style={[styles.label, item.label === active && styles.active]}>{item.label}</Text></View></NavMotion></TouchFeedback>)}
  </View>;
}
const styles = StyleSheet.create({ bar: { flexDirection: 'row', backgroundColor: colors.white, paddingTop: 6, paddingHorizontal: 18, minHeight: 62 }, item: { flex: 1, minHeight: 48 }, content: { alignItems: 'center', justifyContent: 'center', gap: 2 }, label: { fontSize: 9, color: '#D34474' }, active: { color: colors.pink, fontWeight: '700' }, slot: { flex: 1.5, alignItems: 'center' }, add: { position: 'absolute', top: -33, width: 86, height: 86, borderRadius: 43, borderWidth: 6, borderColor: colors.white, backgroundColor: colors.pink, shadowColor: colors.wine, shadowOpacity: .07, shadowRadius: 4, shadowOffset: { width: 0, height: -1 }, elevation: 2 } });
