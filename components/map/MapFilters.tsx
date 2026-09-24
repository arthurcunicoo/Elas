import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../constants/theme';
import { TouchFeedback } from '../TouchFeedback';
import { useReducedMotion } from '../../hooks/useReducedMotion';
export type MapFilter = 'all' | 'safe' | 'attention';
export function MapFilters({ visible, value, onChange, onClose }: { visible: boolean; value: MapFilter; onChange: (value: MapFilter) => void; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const options = [{ key: 'all', text: 'Todos os locais' }, { key: 'safe', text: 'Seguros' }, { key: 'attention', text: 'Atenção' }] as const;
  return <Modal transparent visible={visible} animationType={reduced ? 'none' : 'slide'} onRequestClose={onClose}><View style={styles.backdrop}><Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Fechar filtros" /><View style={[styles.sheet, { paddingBottom: insets.bottom + 22 }]}><Text style={styles.title}>Filtrar locais</Text><Text style={styles.subtitle}>Classificações de demonstração.</Text>{options.map(option => <TouchFeedback key={option.key} label={option.text} selected={value === option.key} onPress={() => { onChange(option.key); onClose(); }} style={[styles.option, value === option.key && { backgroundColor: colors.cream }]}><Text style={styles.label}>{option.text}{value === option.key ? '  ✓' : ''}</Text></TouchFeedback>)}</View></View></Modal>;
}
const styles = StyleSheet.create({ backdrop: { flex: 1, backgroundColor: '#21051555', justifyContent: 'flex-end' }, sheet: { backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 }, title: { fontSize: 22, fontWeight: '700', color: colors.wine }, subtitle: { color: colors.wine, marginTop: 8, marginBottom: 10 }, option: { minHeight: 48, borderRadius: 12, paddingHorizontal: 14, marginTop: 5 }, label: { color: colors.pink, fontSize: 16, fontWeight: '600' } });
