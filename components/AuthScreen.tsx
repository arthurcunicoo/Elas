import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Animated, Easing, Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getCityLayout } from '../constants/cityLayout';
import { MotionReveal } from './MotionReveal';
import { AccountLink } from './AccountLink';
import { InputField } from './InputField';
import { PrimaryButton } from './PrimaryButton';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { colors } from '../constants/theme';
export function AuthScreen({ registration = false }: { registration?: boolean }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const leaving = useRef(false);
  const exitProgress = useRef(new Animated.Value(0)).current;
  const reduced = useReducedMotion();
  useFocusEffect(useCallback(() => {
    leaving.current = false;
    setTransitioning(false);
    exitProgress.setValue(0);
    return () => { leaving.current = false; exitProgress.stopAnimation(); };
  }, [exitProgress]));
  const emailError = !email.trim() ? 'Informe seu e-mail.' : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ? 'Informe um e-mail válido.' : undefined;
  function submit() {
    if (leaving.current) return;
    setSubmitted(true);
    if ((registration && !name.trim()) || emailError || !password.trim()) return;
    // Frontend preview only. This does not authenticate or create an account.
    Keyboard.dismiss();
    if (!registration) { router.replace('/perfil'); return; }
    leaving.current = true;
    setTransitioning(true);
    Animated.timing(exitProgress, {
      toValue: 1, duration: reduced ? 0 : 260,
      easing: Easing.inOut(Easing.cubic), useNativeDriver: Platform.OS !== 'web',
    }).start(({ finished }) => {
      if (finished && leaving.current) router.replace('/login');
    });
  }
  const { bottom: cityBottom } = getCityLayout(width, height);
  return <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={{ flexGrow: 1, paddingTop: Math.max(insets.top + 24, cityBottom), paddingBottom: Math.max(28, insets.bottom + 16) }}>
      <Animated.View pointerEvents={transitioning ? 'none' : 'auto'} accessibilityState={{ busy: transitioning }} style={[styles.form, {
        opacity: exitProgress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
        transform: [{ translateY: exitProgress.interpolate({ inputRange: [0, 1], outputRange: [0, -18] }) }],
      }]}>
        <MotionReveal><Text accessibilityRole="header" style={styles.title}>{registration ? 'Faça seu cadastro' : 'Faça seu Login'}</Text></MotionReveal>
        {registration && <MotionReveal delay={80}><InputField label="Insira seu nome" value={name} onChangeText={setName} autoCapitalize="words" autoComplete="name" error={submitted && !name.trim() ? 'Informe seu nome.' : undefined} /></MotionReveal>}
        <MotionReveal delay={registration ? 160 : 100}><InputField label={registration ? 'Insira seu e-mail' : 'Digite seu e-mail'} icon={registration ? undefined : 'mail-outline'} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" error={submitted ? emailError : undefined} /></MotionReveal>
        <MotionReveal delay={registration ? 240 : 180}><InputField label={registration ? 'Insira sua senha' : 'Digite sua senha'} icon={registration ? undefined : 'lock-closed-outline'} value={password} onChangeText={setPassword} password autoCapitalize="none" autoCorrect={false} autoComplete={registration ? 'new-password' : 'current-password'} returnKeyType="done" onSubmitEditing={submit} error={submitted && !password.trim() ? 'Informe sua senha.' : undefined} /></MotionReveal>
        <MotionReveal delay={300}><AccountLink registration={registration} /></MotionReveal>
        <MotionReveal delay={380}><PrimaryButton disabled={transitioning} title={registration ? 'Cadastrar' : 'Entrar'} onPress={submit} /></MotionReveal>
      </Animated.View>
    </ScrollView>
  </KeyboardAvoidingView>;
}
const styles = StyleSheet.create({ root: { flex: 1 }, form: { width: '80%', maxWidth: 400, alignSelf: 'center' }, title: { color: colors.white, fontSize: 26, fontWeight: '600', marginLeft: 4, marginBottom: 4 } });
