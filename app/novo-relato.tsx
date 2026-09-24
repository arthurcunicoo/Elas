import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TouchFeedback } from '../components/TouchFeedback';
import { MotionReveal } from '../components/MotionReveal';
export default function NewReport() {
  const insets = useSafeAreaInsets();
  const [place, setPlace] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState(false);
  const [done, setDone] = useState(false);
  function back() { if (router.canGoBack()) router.back(); else router.replace('/alertas'); }
  return <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.root}><StatusBar style="light" /><View style={[styles.header, { paddingTop: insets.top + 16 }]}><TouchFeedback label="Voltar" onPress={back} style={styles.back} spring><Ionicons name="chevron-back" size={26} color="white" /></TouchFeedback><Text style={styles.title}>Novo relato</Text></View>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 22, paddingBottom: insets.bottom + 30 }}><MotionReveal duration={280} distance={14}>
      {done ? <View style={styles.card}><Ionicons name="checkmark-circle-outline" color="#C91E50" size={48} /><Text style={styles.heading}>Relato de demonstração concluído</Text><Text style={styles.note}>Nenhum dado foi enviado. Este formulário funciona apenas como demonstração local.</Text><TouchFeedback label="Voltar" onPress={back} spring style={styles.button}><Text style={styles.buttonText}>Voltar</Text></TouchFeedback></View> : <View style={styles.card}>
        <Text style={styles.note}>Demonstração: os campos não serão enviados nem armazenados.</Text>
        <Text style={styles.label}>Local</Text><TextInput accessibilityLabel="Local do relato" value={place} onChangeText={setPlace} placeholder="Nome da rua ou praça" placeholderTextColor="#78717E" maxLength={120} style={styles.input} />
        <Text style={styles.label}>Relato</Text><TextInput accessibilityLabel="Descrição do relato" value={description} onChangeText={setDescription} placeholder="Descreva o que observou" placeholderTextColor="#78717E" multiline maxLength={1000} style={[styles.input, { minHeight: 130, textAlignVertical: 'top' }]} />
        {error && <Text accessibilityRole="alert" style={styles.error}>Preencha o local e a descrição.</Text>}
        <TouchFeedback label="Concluir demonstração" spring style={styles.button} onPress={() => { if (!place.trim() || !description.trim()) { setError(true); return; } setDone(true); }}><Text style={styles.buttonText}>Concluir demonstração</Text></TouchFeedback>
      </View>}
    </MotionReveal></ScrollView></KeyboardAvoidingView>;
}
const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: '#F5F5F5' }, header: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#C91E50', paddingHorizontal: 14, paddingBottom: 16, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 }, back: { width: 40, height: 40 }, title: { fontSize: 20, color: 'white', fontWeight: '700' }, card: { width: '100%', maxWidth: 460, alignSelf: 'center', backgroundColor: 'white', padding: 20, borderRadius: 20, gap: 12 }, note: { color: '#78717E', fontSize: 14, lineHeight: 21 }, heading: { fontWeight: '700', fontSize: 20, color: '#2E1D3A' }, label: { color: '#2E1D3A', fontWeight: '600', fontSize: 15, marginTop: 8 }, input: { borderWidth: 1, borderColor: '#EDA1B8', borderRadius: 10, padding: 12, color: '#2E1D3A', fontSize: 15 }, button: { backgroundColor: '#C91E50', borderRadius: 8, minHeight: 44, marginTop: 8 }, buttonText: { textAlign: 'center', color: 'white', fontWeight: '700', padding: 10 }, error: { color: '#D92D3A', fontSize: 13 } });
