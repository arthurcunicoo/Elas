import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MotionReveal } from '../components/MotionReveal';
import { TouchFeedback } from '../components/TouchFeedback';
import { MoodSelector } from '../components/reviews/MoodSelector';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { places } from '../constants/places';
const factors = ['Iluminação', 'Movimento de pessoas', 'Acessibilidade', 'Assédio ou Importunação', 'Limpeza/Conservação', 'Outro'];
export default function Review() {
  const insets = useSafeAreaInsets();
  const { placeId } = useLocalSearchParams<{ placeId?: string }>();
  const place = places.find(item => item.id === placeId);
  const [mood, setMood] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [state, setState] = useState<'idle' | 'loading' | 'done'>('idle');
  const focus = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const busy = useRef(false);
  const reduced = useReducedMotion();
  useFocusEffect(useCallback(() => () => { if (timer.current) clearTimeout(timer.current); busy.current = false; focus.stopAnimation(); focus.setValue(0); setState(current => current === 'loading' ? 'idle' : current); }, [focus]));
  function animate(toValue: number) { Animated.timing(focus, { toValue, duration: reduced ? 0 : 180, useNativeDriver: false }).start(); }
  function send() {
    if (busy.current) return;
    if (!mood || !selected.length) { setError('Selecione como se sente e ao menos uma opção.'); return; }
    busy.current = true; setError(''); Keyboard.dismiss(); setState('loading');
    timer.current = setTimeout(() => { setState('done'); busy.current = false; }, 600);
  }
  function back() { if (router.canGoBack()) router.back(); else router.replace('/mapa'); }
  return <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}><StatusBar style="light" /><View style={[styles.header, { paddingTop: insets.top + 19 }]}><TouchFeedback label="Voltar ao mapa" onPress={back} style={{ width: 44, height: 44 }}><Ionicons name="chevron-back" size={26} color="white" /></TouchFeedback><Text style={styles.title}>Avalie um lugar</Text></View>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 28 }]}><View style={styles.page}>
      {state === 'done' ? <MotionReveal duration={260} distance={12}><View style={styles.success}><Ionicons name="checkmark-circle" size={54} color="#40A58A" /><Text style={styles.question}>Avaliação concluída!</Text><Text style={styles.note}>Demonstração local{place ? `: ${place.name}` : ''}. Nenhum dado foi enviado ou armazenado.</Text><TouchFeedback label="Voltar ao mapa" onPress={back} spring style={styles.button}><Text style={styles.buttonText}>Voltar ao mapa</Text></TouchFeedback></View></MotionReveal> : <>
        <MotionReveal duration={280} distance={10}>{place && <Text style={styles.place}>{place.name}</Text>}<Text style={styles.question}>Como você se sente nesse{ '\n' }local?</Text><MoodSelector disabled={state !== 'idle'} value={mood} onChange={value => { if (state === 'idle') { setMood(value); setError(''); } }} /></MotionReveal>
        <MotionReveal duration={300} delay={80} distance={10}><Text style={styles.heading}>O que influenciou a sua avaliação?</Text><Text style={styles.helper}>(Selecione uma ou mais opções)</Text><View style={styles.factors}>{factors.map(factor => <TouchFeedback key={factor} label={factor} role="checkbox" checked={selected.includes(factor)} disabled={state !== 'idle'} onPress={() => { setSelected(current => current.includes(factor) ? current.filter(item => item !== factor) : [...current, factor]); setError(''); }} style={{ minHeight: 44 }}><View style={styles.factor}><View style={styles.checkbox}>{selected.includes(factor) && <Ionicons name="checkmark" size={23} color="#C91E50" />}</View><Text style={styles.factorText}>{factor}</Text></View></TouchFeedback>)}</View></MotionReveal>
        <MotionReveal duration={300} delay={160} distance={10}><Text style={styles.heading}>Comentário <Text style={styles.helper}>(Opcional)</Text></Text><Animated.View style={[styles.comment, { shadowOpacity: focus.interpolate({ inputRange: [0, 1], outputRange: [0, .22] }), elevation: focus.interpolate({ inputRange: [0, 1], outputRange: [0, 4] }) }]}><Ionicons name="create-outline" size={18} color="#97A0AB" style={{ marginTop: 10, marginLeft: 8 }} /><TextInput accessibilityLabel="Comentário opcional" value={comment} onChangeText={setComment} editable={state === 'idle'} onFocus={() => animate(1)} onBlur={() => animate(0)} multiline maxLength={1000} placeholder="Escreva algo sobre sua experiência..." placeholderTextColor="#929CAA" underlineColorAndroid="transparent" selectionColor="#C91E50" style={[styles.input, Platform.OS === 'web' && styles.webInput]} /></Animated.View>
          {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
          <TouchFeedback disabled={state !== 'idle'} busy={state === 'loading'} label="Avaliar lugar" onPress={send} spring style={styles.button}>{state === 'loading' ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Avaliar lugar</Text>}</TouchFeedback>
        </MotionReveal>
      </>}
    </View></ScrollView></KeyboardAvoidingView>;
}
const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: '#F5F5F5' }, header: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#C91E50', paddingHorizontal: 20, paddingBottom: 23, borderBottomLeftRadius: 29, borderBottomRightRadius: 29 }, title: { color: 'white', fontSize: 21, fontWeight: '700' }, scroll: { flexGrow: 1, paddingTop: 24 }, page: { width: '85%', maxWidth: 460, alignSelf: 'center' }, question: { color: '#8A65C7', fontSize: 20, lineHeight: 28, fontWeight: '700' }, heading: { fontSize: 17, fontWeight: '700', color: '#30213C' }, helper: { fontSize: 11, color: '#747C86', fontWeight: '400' }, factors: { marginTop: 6, marginBottom: 16 }, factor: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 }, checkbox: { width: 25, height: 25, borderWidth: 1.5, borderColor: '#E96B94', alignItems: 'center', justifyContent: 'center' }, factorText: { color: '#30213C', fontSize: 15, flexShrink: 1 }, comment: { flexDirection: 'row', backgroundColor: '#E1E5ED', borderRadius: 6, marginTop: 12, minHeight: 70, shadowColor: '#8A65C7', shadowRadius: 8, shadowOffset: { width: 0, height: 2 } }, input: { flex: 1, minWidth: 0, borderWidth: 0, backgroundColor: 'transparent', textAlignVertical: 'top', padding: 10, paddingLeft: 2, fontSize: 13, color: '#30213C' }, webInput: { outlineWidth: 0, outlineStyle: 'solid', outlineColor: 'transparent', boxShadow: 'none' }, button: { marginTop: 12, marginHorizontal: 15, minHeight: 43, backgroundColor: '#C91E50', borderRadius: 5, padding: 8 }, buttonText: { color: 'white', textAlign: 'center', fontSize: 18, fontWeight: '700' }, error: { color: '#C91E50', marginTop: 9, fontSize: 13 }, place: { color: '#747C86', marginBottom: 8, fontSize: 13 }, success: { gap: 15, paddingTop: 40 }, note: { color: '#747C86', fontSize: 15, lineHeight: 22 } });
