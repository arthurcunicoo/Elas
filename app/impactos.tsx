import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MotionReveal } from '../components/MotionReveal';
import { ImpactStatCard } from '../components/impacts/ImpactStatCard';
import { ImprovementCard, Improvement } from '../components/impacts/ImprovementCard';
import { ImprovementRequest } from '../components/impacts/ImprovementRequest';
const improvements: Improvement[] = [
  { title: 'Iluminação na Rua João Pessoa', description: 'Novos postes instalados', status: 'Concluída', color: '#49A789', icon: 'megaphone-outline' },
  { title: 'Instalação de câmeras em pontos de ônibus', description: 'Câmeras em pontos de ônibus que apresentam risco.', status: 'Em andamento', color: '#F5A623', icon: 'megaphone-outline' },
  { title: 'Patrulhamento no Bairro Michel', description: 'Mais rondas noturnas', status: 'Solicitada', color: '#8A65C7', icon: 'megaphone-outline' },
];
export default function Impacts() {
  const insets = useSafeAreaInsets();
  return <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}><StatusBar style="light" />
    <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
      <View style={[styles.header, { paddingTop: insets.top + 18 }]}><View style={styles.headerContent}>
        <MotionReveal duration={280} distance={8}><Text accessibilityRole="header" style={styles.title}>Impactos na cidade</Text></MotionReveal>
        <View style={styles.stats}><ImpactStatCard total={12} label="Solicitadas" color="#8A65C7" delay={0} /><ImpactStatCard total={7} label="Em andamento" color="#F5A623" delay={80} /><ImpactStatCard total={4} label="Concluídas" color="#49A789" delay={160} /></View>
        <MotionReveal duration={300} delay={160} distance={6}><Text style={styles.tagline}>A sua voz gera mudanças!</Text></MotionReveal>
      </View></View>
      <View style={styles.content}><MotionReveal duration={280} delay={200} distance={8}><Text accessibilityRole="header" style={styles.section}>Melhorias recentes</Text></MotionReveal>
        <View style={styles.list}>{improvements.map((item, index) => <MotionReveal key={item.title} delay={250 + index * 80} duration={330} distance={15}><ImprovementCard item={item} /></MotionReveal>)}</View>
        <MotionReveal duration={320} delay={450} distance={10}><ImprovementRequest /></MotionReveal>
      </View>
    </ScrollView>
  </KeyboardAvoidingView>;
}
const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: '#F7F7F7' }, scroll: { flexGrow: 1, paddingBottom: 54 }, header: { backgroundColor: '#C91E50', borderBottomLeftRadius: 28, borderBottomRightRadius: 28, paddingBottom: 15 }, headerContent: { width: '93%', maxWidth: 460, alignSelf: 'center' }, title: { fontSize: 20, fontWeight: '700', color: 'white' }, stats: { flexDirection: 'row', gap: 18, marginTop: 17 }, tagline: { color: 'white', fontSize: 16, fontWeight: '600', textAlign: 'center', marginTop: 13 }, content: { width: '90%', maxWidth: 460, alignSelf: 'center' }, section: { color: '#8A65C7', fontSize: 19, fontWeight: '700', marginTop: 20, marginBottom: 12 }, list: { gap: 8 } });
