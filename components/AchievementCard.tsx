import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../constants/theme';
import { achievements } from '../constants/achievements';
import { AchievementProgressBar } from './AchievementProgressBar';
import { TouchFeedback } from './TouchFeedback';
export function AchievementCard({ onMore }: { onMore: () => void }) {
  return <View style={styles.card}>
    <Text style={styles.number}>7</Text><Text style={styles.reviews}>Avaliações</Text>
    <Text style={styles.heading}>Conquistas</Text>
    {achievements.filter(item => !item.completed).map(item => <View key={item.title} style={styles.row}><MaterialCommunityIcons name={item.icon} size={28} color={item.color} style={{ marginTop: 2 }} /><View style={styles.detail}><Text style={styles.title}>{item.title}</Text><Text style={styles.description}>{item.description}</Text><AchievementProgressBar compact value={item.value} total={item.total} /></View></View>)}
    <TouchFeedback label="Ver mais conquistas" onPress={onMore} style={styles.more}><Text style={styles.moreText}>Ver mais</Text></TouchFeedback>
  </View>;
}
const styles = StyleSheet.create({ card: { backgroundColor: colors.white, borderRadius: 21, paddingHorizontal: 24, paddingTop: 10, paddingBottom: 0, shadowColor: '#000', shadowOpacity: .15, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 4 }, number: { color: colors.wine, fontSize: 18, fontWeight: '700', textAlign: 'center' }, reviews: { color: colors.wine, fontSize: 16, textAlign: 'center', marginTop: 2 }, heading: { color: colors.wine, fontSize: 16, fontWeight: '600', marginTop: 10, marginBottom: 10 }, row: { flexDirection: 'row', gap: 9, marginBottom: 14 }, detail: { flex: 1 }, title: { color: colors.wine, fontSize: 13, fontWeight: '700' }, description: { color: colors.wine, fontSize: 10, fontWeight: '500', marginTop: 1 }, progressRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 9 }, track: { flex: 1, height: 7, backgroundColor: '#EAEAEA', borderRadius: 5, overflow: 'hidden' }, fill: { height: '100%', backgroundColor: colors.pink, borderRadius: 5 }, count: { color: colors.wine, fontSize: 9, fontWeight: '700', minWidth: 26 }, more: { alignSelf: 'center', minHeight: 44, marginTop: -14, paddingHorizontal: 18 }, moreText: { color: colors.pink, fontSize: 13, fontWeight: '700', textAlign: 'center', backgroundColor: colors.cream, borderRadius: 5, paddingHorizontal: 5, paddingVertical: 2 } });
