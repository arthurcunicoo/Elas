import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { colors } from '../constants/theme';
import { TouchFeedback } from './TouchFeedback';
import { MotionReveal } from './MotionReveal';
export function ProfileDestination({ title }: { title: string }) {
  return <SafeAreaView style={styles.root}><StatusBar style="dark" /><View style={styles.header}><TouchFeedback label="Voltar ao perfil" onPress={() => router.canGoBack() ? router.back() : router.replace('/perfil')} style={{ width: 44, minHeight: 44 }}><Ionicons name="chevron-back" size={26} color={colors.pink} /></TouchFeedback><Text style={styles.title}>{title}</Text></View><MotionReveal duration={340} distance={16} style={styles.card}><Text style={styles.message}>Esta funcionalidade estará disponível em uma próxima etapa.</Text></MotionReveal></SafeAreaView>;
}
const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: colors.surface }, header: { flexDirection: 'row', alignItems: 'center', padding: 16 }, title: { color: colors.wine, fontSize: 21, fontWeight: '700', flex: 1 }, card: { backgroundColor: colors.white, margin: 24, padding: 24, borderRadius: 20 }, message: { fontSize: 16, lineHeight: 24, color: colors.wine } });
