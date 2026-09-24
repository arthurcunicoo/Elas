import { useMemo, useState } from 'react';
import { Keyboard, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../constants/theme';
import { normalizePlaceQuery, Place, places } from '../constants/places';
import CityMap from '../components/map/CityMap';
import { PlaceCard } from '../components/map/PlaceCard';
import { MapFilter, MapFilters } from '../components/map/MapFilters';
import { MotionReveal } from '../components/MotionReveal';
import { TouchFeedback } from '../components/TouchFeedback';
export default function CityMapScreen() {
  const insets = useSafeAreaInsets();
  const [expanded, setExpanded] = useState(false);
  const [selected, setSelected] = useState<Place | null>(null);
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [filter, setFilter] = useState<MapFilter>('all');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [areaHeight, setAreaHeight] = useState(600);
  const available = useMemo(() => places.filter(place => filter === 'all' || place.status === filter), [filter]);
  const results = useMemo(() => available.filter(place => normalizePlaceQuery(place.name).includes(normalizePlaceQuery(query))), [available, query]);
  function choose(place: Place) { setExpanded(true); router.setParams({ placeId: place.id }); setSelected(place); setQuery(''); setFocused(false); Keyboard.dismiss(); }
  function clear() { setExpanded(false); router.setParams({ placeId: '' }); setSelected(null); setFocused(false); Keyboard.dismiss(); }
  return <View style={styles.root} onLayout={event => setAreaHeight(event.nativeEvent.layout.height)}><StatusBar style="light" />
    <CityMap places={available} selected={selected} onSelect={choose} onClear={clear} />
    <View style={[styles.header, { paddingTop: insets.top + 19 }]}><Text accessibilityRole="header" style={styles.heading}>Mapa da cidade</Text></View>
    <View pointerEvents="box-none" style={[styles.searchArea, { top: insets.top + 77 }]}>
      <MotionReveal duration={300} distance={-8}><View style={styles.searchRow}>
        <View style={[styles.searchBox, focused && styles.focused]}><Ionicons name="search" size={25} color="#241521" /><TextInput accessibilityLabel="Buscar um lugar" placeholder="Buscar um lugar" placeholderTextColor="#241521" value={query} onChangeText={setQuery} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} autoCorrect={false} returnKeyType="search" onSubmitEditing={() => { if (results[0]) choose(results[0]); }} underlineColorAndroid="transparent" style={[styles.input, Platform.OS === 'web' && styles.webInput]} /></View>
        <TouchFeedback label="Abrir filtros" onPress={() => { Keyboard.dismiss(); setFocused(false); setFiltersOpen(true); }} style={styles.filter}><Ionicons name="options-outline" size={29} color="#242424" style={{ alignSelf: 'center' }} /></TouchFeedback>
      </View></MotionReveal>
      {focused && <View style={styles.results}><ScrollView keyboardShouldPersistTaps="always" style={{ maxHeight: 190 }}>{results.length ? results.map(place => <TouchFeedback immediate key={place.id} label={place.name} onPress={() => choose(place)} style={styles.result}><Text style={styles.resultText}>{place.name}</Text></TouchFeedback>) : <Text style={styles.empty}>Nenhum local de demonstração encontrado.</Text>}</ScrollView></View>}
    </View>
    <View pointerEvents="box-none" style={[styles.cardPosition, { top: expanded ? insets.top + 145 : Math.max(insets.top + 138, Math.min(areaHeight * .50, areaHeight - 240)) }]}><PlaceCard place={selected} expanded={expanded} onToggle={() => setExpanded(current => !current)} maxHeight={expanded ? Math.max(120, areaHeight - insets.top - 220) : 220} /></View>
    <TouchFeedback label="Ver impactos" onPress={() => router.push('/impactos')} style={styles.impacts}><View style={styles.impactContent}><MaterialCommunityIcons name="office-building" size={29} color={colors.white} /><Text style={styles.impactText}>Ver impactos</Text></View></TouchFeedback>
    <MapFilters visible={filtersOpen} value={filter} onClose={() => setFiltersOpen(false)} onChange={value => { setFilter(value); if (selected && value !== 'all' && selected.status !== value) clear(); }} />
  </View>;
}
const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: colors.surface }, header: { backgroundColor: colors.pink, paddingHorizontal: 21, paddingBottom: 14, borderBottomLeftRadius: 29, borderBottomRightRadius: 29, zIndex: 4 }, heading: { color: colors.white, fontSize: 23, fontWeight: '800' }, searchArea: { position: 'absolute', left: '7%', right: '7%', zIndex: 5 }, searchRow: { flexDirection: 'row', gap: 12 }, searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, minHeight: 48, backgroundColor: colors.white, borderRadius: 15, borderWidth: 1, borderColor: '#FFFFFF', shadowColor: '#000', shadowOpacity: .09, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 3 }, focused: { shadowOpacity: .17 }, webInput: { outlineWidth: 0, outlineStyle: 'solid', outlineColor: 'transparent', boxShadow: 'none' }, input: { flex: 1, fontSize: 16, color: '#241521', minWidth: 0, paddingVertical: 12, borderWidth: 0 }, filter: { width: 44, minHeight: 46, borderRadius: 5, backgroundColor: colors.white, elevation: 3 }, results: { backgroundColor: colors.white, borderRadius: 12, marginTop: 7, padding: 5, elevation: 6 }, result: { minHeight: 44, padding: 9 }, resultText: { color: colors.wine, fontSize: 14 }, empty: { color: colors.wine, padding: 12, fontSize: 13 }, cardPosition: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 2 }, impacts: { position: 'absolute', bottom: 8, left: 16, backgroundColor: colors.pink, borderRadius: 20, minHeight: 44, paddingHorizontal: 10, zIndex: 4, elevation: 4 }, impactContent: { flexDirection: 'row', alignItems: 'center', gap: 4 }, impactText: { color: colors.white, fontSize: 13, fontWeight: '700' } });
