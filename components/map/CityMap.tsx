import { useState } from 'react';
import { Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CityMapProps } from './CityMap.types';
import { initialMapRegion } from '../../constants/places';

const TILE = 256;
const ZOOM = 15;
function project(latitude: number, longitude: number) {
  const size = TILE * 2 ** ZOOM;
  const sin = Math.sin(latitude * Math.PI / 180);
  return { x: (longitude + 180) / 360 * size, y: (.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * size };
}
const center = project(initialMapRegion.latitude, initialMapRegion.longitude);

// Browser-only static viewport. Metro selects CityMap.native.tsx on mobile.
export default function CityMap({ places, selected, onSelect, onClear }: CityMapProps) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [failed, setFailed] = useState(false);
  const left = Math.round(center.x - size.width / 2);
  const top = Math.round(center.y - size.height / 2);
  const tiles = [];
  if (size.width && size.height) {
    for (let x = Math.floor(left / TILE); x <= Math.floor((left + size.width - 1) / TILE); x++) {
      for (let y = Math.floor(top / TILE); y <= Math.floor((top + size.height - 1) / TILE); y++) {
        tiles.push({ x, y });
      }
    }
  }
  return (
    <View style={styles.root} onLayout={({ nativeEvent: { layout } }) => setSize({ width: layout.width, height: layout.height })}>
      <Pressable accessibilityLabel="Fechar detalhes do local" onPress={onClear} style={StyleSheet.absoluteFill} />
      <View pointerEvents="box-none" style={StyleSheet.absoluteFill} accessibilityLabel="Mapa estático do centro de Criciúma">
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>{tiles.map(({ x, y }) => <Image key={`${x}/${y}`} source={{ uri: `https://tile.openstreetmap.org/${ZOOM}/${x}/${y}.png` }} onError={() => setFailed(true)} style={{ position: 'absolute', width: TILE, height: TILE, left: x * TILE - left, top: y * TILE - top }} />)}</View>
        {!!size.width && places.map(place => {
          const point = project(place.latitude, place.longitude);
          const active = selected?.id === place.id;
          const pinSize = active ? 48 : 40;
          return <Pressable key={place.id} accessibilityRole="button" accessibilityLabel={`Ver detalhes de ${place.name}`} accessibilityState={{ selected: active }} onPress={() => onSelect(place)} style={{ position: 'absolute', width: 48, height: 54, alignItems: 'center', justifyContent: 'flex-end', left: point.x - left - 24, top: point.y - top - 54 }}><Ionicons name="location" size={pinSize} color={active ? '#BD1C51' : place.status === 'safe' ? '#419F87' : '#EDB13D'} /></Pressable>;
        })}
      </View>
      {failed && <Text style={styles.error}>Não foi possível carregar parte do mapa. Confira sua conexão e recarregue a página.</Text>}
      <Text accessibilityRole="link" onPress={() => void Linking.openURL('https://www.openstreetmap.org/copyright')} style={styles.attribution}>© OpenStreetMap contributors</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, overflow: 'hidden', backgroundColor: '#F0EEEA' },
  attribution: { position: 'absolute', right: 4, bottom: 62, backgroundColor: 'rgba(255,255,255,.95)', color: '#333', fontSize: 11, paddingHorizontal: 5, paddingVertical: 4 },
  error: { position: 'absolute', left: 16, right: 16, bottom: 94, backgroundColor: '#FFF2F2', color: '#760B20', fontSize: 12, padding: 10, borderRadius: 8 },
});
