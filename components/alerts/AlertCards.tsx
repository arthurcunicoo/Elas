import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TouchFeedback } from '../TouchFeedback';
export const alertColors = { pink: '#C91E50', text: '#2E1D3A', muted: '#78717E', red: '#D92D3A' };
export function CriticalAlertCard({ onMap }: { onMap: () => void }) {
  return <View style={styles.critical}>
    <Text style={styles.criticalTitle}>LOCAL CRÍTICO NAS ÚLTIMAS 24H</Text>
    <View style={styles.address}><Text style={styles.name}>Rua Coronel Pedro Benedet</Text><Text style={styles.subtitle}>(Próximo ao terminal central)</Text></View>
    <View style={styles.reasons}><View style={styles.reason}><View style={styles.badge}><Ionicons name="shield-outline" size={15} color="white" /></View><Text style={[styles.reasonText, { color: alertColors.red }]}>Insegura</Text></View>
      <View style={styles.reason}><View style={styles.badge}><Ionicons name="megaphone-outline" size={15} color="white" /></View><Text style={styles.reasonText}>Muitas avaliações negativas</Text></View></View>
    <TouchFeedback label="Ver Rua Coronel Pedro Benedet no mapa" onPress={onMap} style={styles.button} spring><Text style={styles.buttonText}>Ver no mapa</Text></TouchFeedback>
  </View>;
}
export function AlertLocationCard({ name, description, onPress }: { name: string; description: string; onPress: () => void }) {
  return <TouchFeedback label={`${name}, ${description}, Atenção. Ver no mapa`} onPress={onPress} style={styles.location} spring pressedScale={.98}><View style={styles.locationRow}><Ionicons name="location-outline" size={38} color="#DF3261" /><View style={styles.locationText}><Text style={styles.locationName}>{name}</Text><Text style={styles.description}>{description}</Text><Text style={styles.attention}>Atenção</Text></View></View></TouchFeedback>;
}
const shadow = { shadowColor: '#000', shadowOpacity: .10, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 4 };
const styles = StyleSheet.create({
  critical: { backgroundColor: '#FFE3E5', borderRadius: 21, paddingHorizontal: 20, paddingTop: 19, paddingBottom: 20, ...shadow },
  criticalTitle: { fontSize: 15, fontWeight: '700', color: alertColors.red }, address: { marginTop: 18 }, name: { fontSize: 15, fontWeight: '700', color: alertColors.text }, subtitle: { fontSize: 14, color: alertColors.muted },
  reasons: { marginTop: 24, gap: 7, marginBottom: 24 }, reason: { flexDirection: 'row', alignItems: 'center', gap: 10 }, badge: { width: 22, height: 22, borderRadius: 11, backgroundColor: alertColors.red, alignItems: 'center', justifyContent: 'center' }, reasonText: { flex: 1, fontSize: 15, color: alertColors.text },
  button: { minHeight: 44, marginHorizontal: 3, borderRadius: 6, backgroundColor: '#C11B4C', shadowColor: alertColors.pink, shadowOpacity: .16, shadowRadius: 7, shadowOffset: { width: 0, height: 3 }, elevation: 2 }, buttonText: { textAlign: 'center', paddingVertical: 8, color: 'white', fontSize: 14, fontWeight: '800' },
  location: { backgroundColor: 'white', borderRadius: 20, minHeight: 58, paddingHorizontal: 10, paddingVertical: 7, ...shadow }, locationRow: { flexDirection: 'row', alignItems: 'center', gap: 1 }, locationText: { flex: 1 }, locationName: { fontSize: 14, fontWeight: '700', color: alertColors.text }, description: { fontSize: 10, color: alertColors.muted, marginTop: 1 }, attention: { fontSize: 10, color: '#DA243B', marginTop: 2 }
});
