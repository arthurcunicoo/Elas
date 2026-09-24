import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MotionReveal } from '../components/MotionReveal';
import { CriticalAlertCard, AlertLocationCard, alertColors } from '../components/alerts/AlertCards';
import { AnimatedTabSelector, AlertTab } from '../components/alerts/AnimatedTabSelector';
import { useReducedMotion } from '../hooks/useReducedMotion';
const locations = [{ name: 'Parque das Nações', description: 'Relatos de assédio' }, { name: 'Praça do Congresso', description: 'Iluminação Precária' }, { name: 'Rua Major Acácio Moreira', description: 'Pouco movimento à noite' }];
export default function Alerts() {
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const [tab, setTab] = useState<AlertTab>('Avisos');
  const [displayed, setDisplayed] = useState<AlertTab>('Avisos');
  const content = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const out = Animated.timing(content, { toValue: 0, duration: reduced ? 0 : 110, useNativeDriver: Platform.OS !== 'web' });
    out.start(({ finished }) => { if (!finished) return; setDisplayed(tab); Animated.timing(content, { toValue: 1, duration: reduced ? 0 : 190, easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== 'web' }).start(); });
    return () => { content.stopAnimation(); };
  }, [tab, reduced, content]);
  return <View style={styles.root}><StatusBar style="light" />
    <View style={[styles.header, { paddingTop: insets.top + 24 }]}><MotionReveal duration={240} distance={-4}><Text accessibilityRole="header" style={styles.title}>Alertas</Text></MotionReveal></View>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}><View style={styles.page}>
      <MotionReveal duration={280} distance={6}><AnimatedTabSelector value={tab} onChange={setTab} /></MotionReveal>
      <Animated.View style={{ opacity: content, transform: [{ translateX: content.interpolate({ inputRange: [0, 1], outputRange: [displayed === 'Avisos' ? -10 : 10, 0] }) }] }}>
        {displayed === 'Avisos' ? <View>
          <MotionReveal duration={320} delay={40} distance={20}><CriticalAlertCard onMap={() => router.navigate('/mapa')} /></MotionReveal>
          <Text accessibilityRole="header" style={styles.section}>Outros locais em atenção</Text>
          <View style={styles.locations}>{locations.map((location, i) => <MotionReveal key={location.name} duration={300} delay={80 + i * 60} distance={14}><AlertLocationCard {...location} onPress={() => router.navigate('/mapa')} /></MotionReveal>)}</View>
        </View> : <View style={styles.empty}><Ionicons name="notifications-outline" size={38} color={alertColors.pink} /><Text style={styles.emptyTitle}>Nenhuma notificação por aqui</Text><Text style={styles.emptyText}>Quando houver novidades, elas aparecerão aqui.</Text></View>}
      </Animated.View>
    </View></ScrollView>
  </View>;
}
const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: '#F5F5F5' }, header: { backgroundColor: '#C91E50', borderBottomLeftRadius: 24, borderBottomRightRadius: 24, paddingHorizontal: 15, paddingBottom: 15 }, title: { color: 'white', fontSize: 20, fontWeight: '700' }, scroll: { flexGrow: 1, paddingBottom: 54 }, page: { width: '90%', maxWidth: 460, alignSelf: 'center' }, section: { color: alertColors.text, fontSize: 18, fontWeight: '700', marginTop: 10, marginBottom: 6, marginLeft: 2 }, locations: { gap: 8 }, empty: { padding: 28, backgroundColor: 'white', borderRadius: 21, alignItems: 'center', gap: 12 }, emptyTitle: { color: alertColors.text, fontSize: 17, fontWeight: '700', textAlign: 'center' }, emptyText: { color: alertColors.muted, textAlign: 'center', lineHeight: 22 } });
