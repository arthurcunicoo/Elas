import { useCallback, useRef, useState } from 'react';
import { Animated, Easing, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../constants/theme';
import { upcomingEvents } from '../constants/events';
import { MotionReveal } from '../components/MotionReveal';
import { TouchFeedback } from '../components/TouchFeedback';
import { ProfileDialog, ProfileNotice } from '../components/ProfileDialog';
import { PollCard } from '../components/events/PollCard';
import { EventCard } from '../components/events/EventCard';
import { useReducedMotion } from '../hooks/useReducedMotion';
type Tab = 'Eventos' | 'Consultas';
export default function Events() {
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const [tab, setTab] = useState<Tab>('Eventos');
  const [notice, setNotice] = useState<ProfileNotice | null>(null);
  const [tabsWidth, setTabsWidth] = useState(0);
  const active = useRef(new Animated.Value(0)).current;
  const content = useRef(new Animated.Value(1)).current;
  const busy = useRef(false);
  const currentTab = useRef<Tab>('Eventos');
  useFocusEffect(useCallback(() => {
    busy.current = false;
    content.setValue(1);
    active.setValue(currentTab.current === 'Eventos' ? 0 : 1);
    return () => { content.stopAnimation(); active.stopAnimation(); busy.current = false; };
  }, [active, content]));
  function changeTab(next: Tab) {
    if (busy.current || next === tab) return;
    busy.current = true;
    Animated.timing(active, { toValue: next === 'Eventos' ? 0 : 1, duration: reduced ? 0 : 280, easing: Easing.inOut(Easing.cubic), useNativeDriver: Platform.OS !== 'web' }).start();
    Animated.timing(content, { toValue: 0, duration: reduced ? 0 : 120, useNativeDriver: Platform.OS !== 'web' }).start(({ finished }) => {
      if (!finished) return;
      currentTab.current = next;
      setTab(next);
      Animated.timing(content, { toValue: 1, duration: reduced ? 0 : 180, easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== 'web' }).start(() => { busy.current = false; });
    });
  }
  return <View style={styles.root}><StatusBar style="light" />
    <View style={[styles.header, { paddingTop: insets.top + 23 }]}><MotionReveal duration={260} distance={-5}><Text accessibilityRole="header" style={styles.heading}>Eventos</Text></MotionReveal></View>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
      <View style={styles.page}>
        <MotionReveal duration={280} distance={6}><View style={styles.tabs} onLayout={e => setTabsWidth(e.nativeEvent.layout.width)}>
          <View pointerEvents="none" style={styles.tabBackgrounds}><View style={styles.tabBackground} /><View style={styles.tabBackground} /></View>
          {!!tabsWidth && <Animated.View pointerEvents="none" style={[styles.indicator, { width: (tabsWidth - 20) / 2, transform: [{ translateX: active.interpolate({ inputRange: [0, 1], outputRange: [0, (tabsWidth + 20) / 2] }) }] }]} />}
          {(['Eventos', 'Consultas'] as const).map(name => <TouchFeedback key={name} label={name} selected={tab === name} onPress={() => changeTab(name)} style={styles.tab}><Text style={[styles.tabText, tab === name && styles.activeText]}>{name}</Text></TouchFeedback>)}
        </View></MotionReveal>
        <Animated.View style={{ opacity: content, transform: [{ translateY: content.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }) }] }}>
          <View style={tab !== 'Eventos' && { display: 'none' }}>
            <MotionReveal duration={320} delay={40} distance={12}><PollCard /></MotionReveal>
            <MotionReveal duration={320} delay={140} distance={10}><Text style={styles.section}>Próximos eventos..</Text><View style={styles.events}>{upcomingEvents.map(event => <EventCard key={event.id} event={event} onParticipate={() => setNotice({ title: event.title, message: 'Esta é uma demonstração. As inscrições estarão disponíveis em uma próxima etapa.' })} />)}</View></MotionReveal>
          </View>
          {tab === 'Consultas' && <View style={styles.placeholder}><Text style={styles.placeholderTitle}>Consultas</Text><Text style={styles.placeholderText}>As consultas estarão disponíveis em uma próxima etapa.</Text></View>}
        </Animated.View>
      </View>
    </ScrollView>
    <ProfileDialog notice={notice} onClose={() => setNotice(null)} />
  </View>;
}
const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: colors.surface }, header: { backgroundColor: colors.pink, paddingHorizontal: 15, paddingBottom: 14, borderBottomLeftRadius: 29, borderBottomRightRadius: 29 }, heading: { color: colors.white, fontSize: 22, fontWeight: '700' }, scroll: { flexGrow: 1, paddingBottom: 48 }, page: { width: '90%', maxWidth: 460, alignSelf: 'center' }, tabs: { flexDirection: 'row', gap: 20, marginHorizontal: 18, marginTop: 18, marginBottom: 24 }, tabBackgrounds: { ...StyleSheet.absoluteFillObject, flexDirection: 'row', gap: 20 }, tabBackground: { flex: 1, borderRadius: 6, backgroundColor: '#E1E3E8' }, indicator: { position: 'absolute', top: 0, bottom: 0, left: 0, borderRadius: 6, backgroundColor: colors.pink }, tab: { flex: 1, minHeight: 36, borderRadius: 6 }, tabText: { textAlign: 'center', fontSize: 20, fontWeight: '600', color: colors.wine }, activeText: { color: colors.white }, section: { color: colors.wine, fontSize: 18, fontWeight: '700', marginTop: 14, marginBottom: 6, marginLeft: 6 }, events: { gap: 12, marginHorizontal: 5 }, placeholder: { backgroundColor: colors.white, padding: 22, borderRadius: 20 }, placeholderTitle: { color: colors.achievement, fontSize: 18, fontWeight: '700' }, placeholderText: { color: colors.wine, fontSize: 15, lineHeight: 22, marginTop: 8 } });
