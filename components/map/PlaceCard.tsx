import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Place } from '../../constants/places';
import { colors } from '../../constants/theme';
import { ReferenceCrop } from '../ReferenceCrop';
import { useReducedMotion } from '../../hooks/useReducedMotion';
export function PlaceCard({ place, expanded = false, onToggle, maxHeight = 440 }: { place: Place | null; expanded?: boolean; onToggle?: () => void; maxHeight?: number }) {
  const reduced = useReducedMotion();
  const { width } = useWindowDimensions();
  const cardWidth = expanded ? Math.min(width - 24, 420) : 154;
  const photoWidth = cardWidth - (expanded ? 44 : 24);
  const zoom = useRef(new Animated.Value(1)).current;
  useEffect(() => { if (reduced) { zoom.setValue(1); return; } zoom.setValue(.94); const animation = Animated.spring(zoom, { toValue: 1, damping: 22, stiffness: 260, useNativeDriver: Platform.OS !== 'web' }); animation.start(); return () => animation.stop(); }, [expanded, zoom, reduced]);
  const [shown, setShown] = useState<Place | null>(null);
  const current = useRef<Place | null>(null);
  const entrance = useRef(new Animated.Value(0)).current;
  const content = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    let active = true;
    const timing = (value: Animated.Value, toValue: number, duration: number) => Animated.timing(value, { toValue, duration: reduced ? 0 : duration, easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== 'web' });
    let animation: Animated.CompositeAnimation;
    if (!place) {
      animation = timing(entrance, 0, 180);
      animation.start(({ finished }) => { if (active && finished) { current.current = null; setShown(null); } });
    } else if (current.current && current.current.id !== place.id) {
      animation = timing(content, 0, 100);
      animation.start(({ finished }) => {
        if (!active || !finished) return;
        current.current = place; setShown(place);
        animation = Animated.parallel([timing(content, 1, 180), timing(entrance, 1, 180)]); animation.start();
      });
    } else {
      current.current = place; setShown(place); content.setValue(1);
      animation = timing(entrance, 1, 300); animation.start();
    }
    return () => { active = false; animation?.stop(); };
  }, [place, entrance, content, reduced]);
  if (!shown) return null;
  return <Animated.View style={[styles.card, { width: cardWidth, maxHeight, padding: expanded ? 14 : 12, opacity: entrance, transform: [{ translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }, { scale: Animated.multiply(zoom, entrance.interpolate({ inputRange: [0, 1], outputRange: [.97, 1] })) }] }]}><ScrollView showsVerticalScrollIndicator={false}><Pressable accessibilityRole="button" accessibilityLabel={expanded ? "Recolher detalhes do local" : "Ampliar detalhes do local"} accessibilityState={{ expanded }} onPress={onToggle}><Animated.View style={{ opacity: content }}>
    <Text style={[styles.name, expanded && { fontSize: 26, marginTop: 15 }]}>{shown.name}</Text><Text style={[styles.address, expanded && { fontSize: 17, marginTop: 5 }]}>{shown.address}</Text>
    <View style={[styles.status, expanded && { marginTop: 18, marginBottom: 30 }]}><Ionicons name={shown.status === 'safe' ? 'shield-checkmark' : 'alert-circle'} size={expanded ? 28 : 15} color={shown.status === 'safe' ? '#159A50' : '#BD861F'} /><Text style={[styles.statusText, expanded && { fontSize: 14 }]}>{shown.status === 'safe' ? 'SEGURA' : 'ATENÇÃO'} · DEMO</Text></View>
    {shown.photo ? <View style={[styles.photo, { alignSelf: 'center' }]}><ReferenceCrop source={require('../../assets/map-reference.png')} originalWidth={396} originalHeight={738} x={139} y={403} cropWidth={132} cropHeight={100} width={photoWidth} height={photoWidth * 100 / 132} /></View> : <View style={styles.placeholder}><Ionicons name="image-outline" size={30} color={colors.icon} /><Text style={styles.photoText}>Foto indisponível</Text></View>}
  </Animated.View></Pressable></ScrollView></Animated.View>;
}
const styles = StyleSheet.create({ card: { width: 174, backgroundColor: colors.white, borderRadius: 7, padding: 12, shadowColor: '#000', shadowOpacity: .2, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 5 }, name: { fontSize: 12, fontWeight: '800', color: '#291B33' }, address: { fontSize: 9, color: '#6F6773', marginTop: 2 }, status: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 6, marginBottom: 10 }, statusText: { fontSize: 8, color: '#21623D', fontWeight: '700' }, photo: { borderRadius: 2, overflow: 'hidden' }, placeholder: { height: 114, backgroundColor: colors.cream, alignItems: 'center', justifyContent: 'center' }, photoText: { fontSize: 10, color: colors.wine, marginTop: 7 } });
