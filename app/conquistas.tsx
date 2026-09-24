import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../constants/theme';
import { achievements } from '../constants/achievements';
import { AchievementDetailCard } from '../components/AchievementDetailCard';
import { MotionReveal } from '../components/MotionReveal';
export default function Achievements() {
  const insets = useSafeAreaInsets();
  return <View style={styles.root}><StatusBar style="light" />
    <View style={[styles.header, { paddingTop: insets.top + 18 }]}><MotionReveal duration={280} distance={-8}><Text accessibilityRole="header" style={styles.heading}>Conquistas</Text></MotionReveal></View>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
      <MotionReveal duration={280} delay={30} distance={8}><Text style={styles.subtitle}>Suas ações fazem a cidade melhor!</Text></MotionReveal>
      <View style={styles.list}>{achievements.map((item, index) => <AchievementDetailCard key={item.id} item={item} index={index} />)}</View>
    </ScrollView>
  </View>;
}
const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: colors.surface }, header: { backgroundColor: colors.pink, paddingHorizontal: 19, paddingBottom: 24, borderBottomLeftRadius: 29, borderBottomRightRadius: 29 }, heading: { color: colors.white, fontSize: 22, fontWeight: '700' }, scroll: { flexGrow: 1, paddingBottom: 50 }, subtitle: { color: colors.achievement, fontSize: 17, fontWeight: '600', textAlign: 'center', marginTop: 19, marginBottom: 22, paddingHorizontal: 15 }, list: { width: '86%', maxWidth: 460, alignSelf: 'center', gap: 20 } });
