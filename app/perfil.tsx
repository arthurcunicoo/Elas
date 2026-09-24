import { useCallback, useRef, useState } from 'react';
import { Animated, Easing, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ProfileHeader } from '../components/ProfileHeader';
import { AchievementCard } from '../components/AchievementCard';
import { ProfileMenuItem } from '../components/ProfileMenuItem';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { ProfileDialog, ProfileNotice } from '../components/ProfileDialog';
import { MotionReveal } from '../components/MotionReveal';
import { colors } from '../constants/theme';
export default function Profile() {
  const [notice, setNotice] = useState<ProfileNotice | null>(null);
  const transition = useRef(new Animated.Value(0)).current;
  const navigating = useRef(false);
  const reduced = useReducedMotion();
  useFocusEffect(useCallback(() => {
    navigating.current = false;
    transition.setValue(0);
    return () => transition.stopAnimation();
  }, [transition]));
  function openAchievements() {
    if (navigating.current) return;
    navigating.current = true;
    Animated.timing(transition, { toValue: 1, duration: reduced ? 0 : 140, easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== 'web' }).start(({ finished }) => {
      if (finished) router.push('/conquistas');
    });
  }
  const faded = { opacity: transition.interpolate({ inputRange: [0, 1], outputRange: [1, .65] }) };
  function pending(title: string) { setNotice({ title, message: 'Esta funcionalidade estará disponível em uma próxima etapa.' }); }
  function handleLogout() { setNotice({ title: 'Sair do perfil?', message: 'Você voltará para a tela de login.', confirm: () => router.replace('/login') }); }
  return <View style={styles.root}><StatusBar style="light" />
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <Animated.View style={faded}><ProfileHeader onEdit={() => pending('Alterar foto')} /></Animated.View>
      <View style={styles.body}>
        <MotionReveal duration={360} delay={80} distance={20} style={styles.overlap}><Animated.View style={{ transform: [{ scale: transition.interpolate({ inputRange: [0, 1], outputRange: [1, 1.012] }) }, { translateY: transition.interpolate({ inputRange: [0, 1], outputRange: [0, -3] }) }] }}><AchievementCard onMore={openAchievements} /></Animated.View></MotionReveal>
        <Animated.View style={[styles.menu, faded]}>
          <MotionReveal duration={320} delay={140} distance={12}><ProfileMenuItem title="Informações pessoais" icon="pencil" onPress={() => router.push('/informacoes-pessoais')} /></MotionReveal>
          <MotionReveal duration={320} delay={190} distance={12}><ProfileMenuItem title="Configurações" icon="settings" onPress={() => router.push('/configuracoes')} /></MotionReveal>
          <MotionReveal duration={320} delay={240} distance={12}><ProfileMenuItem title="Sair" icon="log-out" onPress={handleLogout} /></MotionReveal>
        </Animated.View>
      </View>
    </ScrollView>
    <ProfileDialog notice={notice} onClose={() => setNotice(null)} />
  </View>;
}
const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: colors.surface }, scroll: { flexGrow: 1, paddingBottom: 40 }, body: { width: '84%', maxWidth: 440, alignSelf: 'center' }, overlap: { marginTop: -52 }, menu: { marginTop: 10, gap: 8 } });
