import { ComponentProps, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ProfileDialog } from '../ProfileDialog';
import { TouchFeedback } from '../TouchFeedback';
export type Improvement = { title: string; description: string; status: string; color: string; icon: ComponentProps<typeof Ionicons>['name'] };
export function ImprovementCard({ item }: { item: Improvement }) {
  const [open, setOpen] = useState(false);
  return <><TouchFeedback label={`${item.title}. ${item.description}. ${item.status}`} onPress={() => setOpen(true)} spring pressedScale={.98} style={styles.card}><View style={styles.row}>
    <View style={[styles.icon, { backgroundColor: item.color }]}><Ionicons name={item.icon} size={13} color="white" /></View>
    <View style={styles.text}><Text style={styles.title}>{item.title}</Text><Text style={styles.description}>{item.description}</Text><Text style={[styles.status, { color: item.color }]}>{item.status}</Text></View>
  </View></TouchFeedback><ProfileDialog notice={open ? { title: item.title, message: `${item.description}\n\nStatus: ${item.status}. Dados locais de demonstração.` } : null} onClose={() => setOpen(false)} /></>;
}
const styles = StyleSheet.create({ card: { backgroundColor: 'white', borderRadius: 19, paddingHorizontal: 12, paddingVertical: 8, shadowColor: '#30213C', shadowOpacity: .08, shadowRadius: 9, shadowOffset: { width: 0, height: 3 }, elevation: 3 }, row: { flexDirection: 'row', gap: 11, alignItems: 'center' }, icon: { width: 22, height: 22, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }, text: { flex: 1 }, title: { fontSize: 13, lineHeight: 15, fontWeight: '700', color: '#30213C' }, description: { fontSize: 11, lineHeight: 15, marginTop: 1, color: '#747079' }, status: { fontSize: 11, fontWeight: '600', textAlign: 'right', marginTop: 1 } });
