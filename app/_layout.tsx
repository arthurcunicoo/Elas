import { useState } from 'react';
import { BottomNavigation } from '../components/BottomNavigation';
import { ProfileDialog, ProfileNotice } from '../components/ProfileDialog';
import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { colors } from '../constants/theme';
import { Stack, router, usePathname, useGlobalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { CitySkyline } from '../components/CitySkyline';
const theme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: 'transparent' } };
export default function RootLayout() {
  const path = usePathname();
  const { placeId } = useGlobalSearchParams<{ placeId?: string }>();
  const [notice, setNotice] = useState<ProfileNotice | null>(null);
  const profileArea = path === '/perfil' || path === '/conquistas' || path === '/mapa' || path === '/eventos' || path === '/alertas' || path === '/impactos';
  function onTab(label: string) {
    if (label === 'Mapa') { if (path !== '/mapa') router.navigate('/mapa'); return; }
    if (label === 'Eventos') { if (path !== '/eventos') router.navigate('/eventos'); return; }
    if (label === 'Alertas') { if (path !== '/alertas') router.navigate('/alertas'); return; }
    if (label === 'Perfil') { if (path !== '/perfil') router.navigate('/perfil'); return; }
    if (label === 'Adicionar' && (path !== '/mapa' || !placeId)) { setNotice({ title: 'Escolha um lugar no mapa', message: 'Toque no pin do local e depois no botão + para avaliá-lo.' }); if (path !== '/mapa') router.navigate('/mapa'); return; }
    if (label === 'Adicionar') { router.push({ pathname: '/avaliar', params: path === '/mapa' && placeId ? { placeId } : {} }); return; }
    setNotice({ title: label === 'Adicionar' ? 'Adicionar avaliação' : label, message: 'Esta funcionalidade estará disponível em uma próxima etapa.' });
  }
  const authScreen = ['/', '/login', '/cadastro'].includes(path);
  return <SafeAreaProvider><ThemeProvider value={theme}><View style={styles.root}><StatusBar style="dark" />{authScreen && <CitySkyline />}
    <View style={{ flex: 1 }}><Stack screenOptions={{ headerShown: false, animation: 'fade', contentStyle: { backgroundColor: 'transparent' } }} /></View>
    {profileArea && <BottomNavigation active={path === '/mapa' || path === '/impactos' ? 'Mapa' : path === '/eventos' ? 'Eventos' : path === '/alertas' ? 'Alertas' : 'Perfil'} onAction={onTab} />}
    <ProfileDialog notice={notice} onClose={() => setNotice(null)} />
  </View></ThemeProvider></SafeAreaProvider>;
}
const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: colors.cream, overflow: 'hidden' } });
