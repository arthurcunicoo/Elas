import { StyleSheet, Text, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Achievement } from '../constants/achievements';
import { colors } from '../constants/theme';
import { AchievementProgressBar } from './AchievementProgressBar';
import { MotionReveal } from './MotionReveal';
export function AchievementDetailCard({ item, index }: { item: Achievement; index: number }) {
  return <MotionReveal duration={320} delay={index * 45} distance={12}>
    <View style={styles.card}>
      <MaterialCommunityIcons name={item.icon} size={37} color={item.color} style={styles.icon} />
      <View style={styles.detail}><Text style={styles.title}>{item.title}</Text><Text style={styles.description}>{item.description}</Text>
        {!item.completed && <AchievementProgressBar value={item.value} total={item.total} delay={index * 45 + 130} />}
      </View>
      {item.completed && <MotionReveal duration={280} delay={index * 45 + 100} distance={0}><Ionicons name="checkmark-circle" size={35} color="#40A68C" accessibilityLabel="Conquista concluída" /></MotionReveal>}
    </View>
  </MotionReveal>;
}
const styles = StyleSheet.create({ card: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderRadius: 7, paddingHorizontal: 12, paddingVertical: 12, minHeight: 60, gap: 9, shadowColor: '#000', shadowOpacity: .09, shadowRadius: 9, shadowOffset: { width: 0, height: 3 }, elevation: 3 }, icon: { width: 38, textAlign: 'center' }, detail: { flex: 1 }, title: { fontSize: 17, color: colors.wine, fontWeight: '600' }, description: { fontSize: 13, color: colors.wine, marginTop: 2, lineHeight: 18 } });
