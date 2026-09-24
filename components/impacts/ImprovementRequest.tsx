import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Keyboard, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { TouchFeedback } from '../TouchFeedback';
import { MotionReveal } from '../MotionReveal';
import { useReducedMotion } from '../../hooks/useReducedMotion';
export function ImprovementRequest() {
  const [text, setText] = useState('');
  const [state, setState] = useState<'idle' | 'loading' | 'success'>('idle');
  const [error, setError] = useState(false);
  const reduced = useReducedMotion();
  const focus = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const busy = useRef(false);
  useFocusEffect(useCallback(() => () => { if (timer.current) clearTimeout(timer.current); focus.stopAnimation(); focus.setValue(0); busy.current = false; setState('idle'); }, [focus]));
  function animateFocus(toValue: number) { Animated.timing(focus, { toValue, duration: reduced ? 0 : 180, useNativeDriver: false }).start(); }
  function send() {
    if (busy.current) return;
    if (!text.trim()) { setError(true); return; }
    busy.current = true; setError(false); Keyboard.dismiss(); setState('loading');
    timer.current = setTimeout(() => {
      setText(''); setState('success');
      timer.current = setTimeout(() => { busy.current = false; setState('idle'); }, 2200);
    }, 600);
  }
  return <View style={styles.root}><Text style={styles.heading}>Deseja solicitar alguma melhoria? <Text style={styles.optional}>(Opcional)</Text></Text>
    <Animated.View style={[styles.inputBox, { shadowOpacity: focus.interpolate({ inputRange: [0, 1], outputRange: [0, .22] }), elevation: focus.interpolate({ inputRange: [0, 1], outputRange: [0, 4] }) }]}>
      <Ionicons name="create-outline" size={18} color="#747079" style={styles.pencil} /><TextInput accessibilityLabel="Solicitar uma melhoria" value={text} onChangeText={value => { setText(value); setError(false); }} onFocus={() => animateFocus(1)} onBlur={() => animateFocus(0)} underlineColorAndroid="transparent" selectionColor="#C91E50" multiline maxLength={1000} editable={state === 'idle'} placeholder="Digite aqui..." placeholderTextColor="#747079" style={[styles.input, Platform.OS === 'web' && styles.webInput]} />
    </Animated.View>
    {error && <Text accessibilityRole="alert" style={styles.error}>Descreva a melhoria antes de enviar.</Text>}
    <TouchFeedback disabled={state !== 'idle'} busy={state === 'loading'} label={state === 'loading' ? 'Enviando solicitação' : state === 'success' ? 'Solicitação enviada' : 'Enviar solicitação'} onPress={send} spring style={styles.button}><View style={styles.buttonRow}>{state === 'loading' ? <ActivityIndicator color="white" size="small" /> : state === 'success' ? <Ionicons name="checkmark-circle-outline" size={22} color="white" /> : null}<Text style={styles.buttonText}>{state === 'loading' ? 'Enviando...' : state === 'success' ? 'Solicitação enviada!' : 'Enviar solicitação'}</Text></View></TouchFeedback>
    {state === 'success' && <MotionReveal duration={220} distance={5}><Text accessibilityLiveRegion="polite" style={styles.confirmation}>Envio simulado. Nenhum dado foi transmitido.</Text></MotionReveal>}
  </View>;
}
const styles = StyleSheet.create({ root: { marginTop: 20 }, heading: { fontSize: 17, lineHeight: 23, color: '#30213C', fontWeight: '700', marginBottom: 4 }, optional: { fontSize: 11, color: '#747079', fontWeight: '400' }, inputBox: { backgroundColor: '#E3E7EF', borderRadius: 5, flexDirection: 'row', minHeight: 70, shadowColor: '#8A65C7', shadowRadius: 8, shadowOffset: { width: 0, height: 2 } }, pencil: { marginLeft: 12, marginTop: 13 }, webInput: { outlineWidth: 0, outlineStyle: 'solid', outlineColor: 'transparent', boxShadow: 'none' }, input: { borderWidth: 0, backgroundColor: 'transparent', flex: 1, padding: 12, paddingLeft: 7, fontSize: 13, color: '#30213C', textAlignVertical: 'top', minHeight: 70 }, button: { marginTop: 12, marginHorizontal: 22, borderRadius: 6, backgroundColor: '#C91E50', minHeight: 44 }, buttonRow: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', paddingVertical: 7, paddingHorizontal: 8 }, buttonText: { color: 'white', fontWeight: '700', fontSize: 12 }, error: { color: '#C91E50', fontSize: 12, marginTop: 7 }, confirmation: { color: '#49A789', textAlign: 'center', marginTop: 10, fontSize: 12 } });
