import { ComponentRef, useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { initialMapRegion, Place } from '../../constants/places';
import { colors } from '../../constants/theme';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { CityMapProps } from './CityMap.types';
function PlacePin({ place, selected, onSelect }: { place: Place; selected: boolean; onSelect: () => void }) {
  const scale = useRef(new Animated.Value(1)).current;
  const marker = useRef<ComponentRef<typeof Marker>>(null);
  const reduced = useReducedMotion();
  const [tracking, setTracking] = useState(true);
  useEffect(() => {
    setTracking(true);
    const timer = setTimeout(() => setTracking(false), 300);
    const animation = Animated.timing(scale, { toValue: selected ? 1.12 : 1, duration: reduced ? 0 : 180, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    animation.start(() => marker.current?.redraw());
    return () => { clearTimeout(timer); animation.stop(); };
  }, [reduced, scale, selected]);
  return <Marker ref={marker} coordinate={place} anchor={{ x: .5, y: 1 }} tracksViewChanges={tracking} onPress={event => { event.stopPropagation(); onSelect(); }} accessibilityLabel={place.name}>
    <Animated.View style={{ width: 48, height: 54, alignItems: 'center', justifyContent: 'center', transform: [{ scale }] }}><Ionicons name="location" size={44} color={selected ? colors.pink : place.status === 'safe' ? '#40A68C' : '#F1B43B'} /></Animated.View>
  </Marker>;
}
export default function CityMap({ places, selected, onSelect, onClear }: CityMapProps) {
  const map = useRef<MapView>(null);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (selected) map.current?.animateToRegion({ ...initialMapRegion, latitude: selected.latitude - .002, longitude: selected.longitude }, reduced ? 0 : 350);
  }, [selected, reduced]);
  return <MapView ref={map} style={StyleSheet.absoluteFill} initialRegion={initialMapRegion} onPress={event => { if (event.nativeEvent.action !== 'marker-press') onClear(); }} showsUserLocation={false} showsMyLocationButton={false} showsCompass={false} toolbarEnabled={false} mapPadding={{ top: 110, right: 0, bottom: 50, left: 0 }}>
    {places.map(place => <PlacePin key={place.id} place={place} selected={selected?.id === place.id} onSelect={() => onSelect(place)} />)}
  </MapView>;
}
