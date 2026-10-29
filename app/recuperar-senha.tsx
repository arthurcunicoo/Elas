import { createPasswordRecovery, requestPasswordRecovery } from "../services/account";
import { pageContent, colors, glassAuthCard, typography } from "../constants/theme";
import { useEffect, useRef, useState } from "react";
import { Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { InputField } from "../components/InputField";
import { PrimaryButton } from "../components/shared/Buttons";
import { TouchFeedback } from "../components/TouchFeedback";
import { validEmail } from "../lib/account";
import { backendConfigured, friendlyError } from "../lib/supabase";

import { getCityLayout } from "../constants/cityLayout";
import { completeOnboarding } from "../features/map/onboardingEvent";
import { MotionReveal } from "../components/MotionReveal";
type Step = "email" | "code" | "password" | "done";
export default function RecoverPassword() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { bottom: cityBottom } = getCityLayout(width, height);
  const [recovery] = useState(createPasswordRecovery);
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [again, setAgain] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const locked = useRef(false);
  const [cooldown, setCooldown] = useState(0);
  useEffect(() => {
    if (!cooldown) return;
    const timer = setTimeout(
      () => setCooldown((n) => Math.max(0, n - 1)),
      1000,
    );
    return () => clearTimeout(timer);
  }, [cooldown]);
  useEffect(
    () => () => {
      void recovery.close();
    },
    [recovery],
  );
  async function requestCode() {
    if (locked.current || cooldown > 0) return;
    if (!validEmail(email)) {
      setError("Informe um e-mail válido.");
      return;
    }
    if (!backendConfigured) {
      setError("Configure o projeto Supabase para recuperar uma conta real.");
      return;
    }
    locked.current = true;
    setBusy(true);
    setError("");
    Keyboard.dismiss();
    try {
      await requestPasswordRecovery(email);
      setCode("");
      setCooldown(60);
      setStep("code");
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  async function checkCode() {
    if (locked.current) return;
    if (!/^\d{6,8}$/.test(code.trim())) {
      setError("Digite o código recebido por e-mail.");
      return;
    }
    locked.current = true;
    setBusy(true);
    setError("");
    Keyboard.dismiss();
    try {
      await recovery.verify(email, code);
      setStep("password");
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  async function changePassword() {
    if (locked.current) return;
    if (password.length < 8) {
      setError("Use pelo menos 8 caracteres.");
      return;
    }
    if (password !== again) {
      setError("As senhas não coincidem.");
      return;
    }
    locked.current = true;
    setBusy(true);
    setError("");
    Keyboard.dismiss();
    try {
      await recovery.change(password);
      await recovery.close();
      setPassword("");
      setAgain("");
      setCode("");
      setStep("done");
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  function leave() {
    void recovery.close();
    completeOnboarding();
    router.replace("/login");
  }
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.root}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: Math.max(insets.top + 16, cityBottom),
          paddingBottom: Math.max(24, insets.bottom + 18),
        }}
      >
        <View style={styles.body}>
          <MotionReveal duration={280} distance={12}>
            <TouchFeedback label="Voltar ao login" onPress={leave}>
              <Text style={styles.back}>‹ Voltar ao login</Text>
            </TouchFeedback>
            <Text accessibilityRole="header" style={styles.title}>
              Recuperar senha
            </Text>
            {step === "email" && (
              <>
                <Text style={styles.copy}>
                  Enviaremos um código para o e-mail cadastrado.
                </Text>
                <InputField
                  testID="recovery-email"
                  label="Seu e-mail"
                  icon="mail-outline"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  onSubmitEditing={() => void requestCode()}
                />
                <PrimaryButton
                  title={
                    busy
                      ? "Enviando..."
                      : cooldown
                        ? `Enviar em ${cooldown}s`
                        : "Enviar código"
                  }
                  disabled={busy || cooldown > 0}
                  onPress={() => void requestCode()}
                />
              </>
            )}
            {step === "code" && (
              <>
                <Text style={styles.copy}>
                  Se existir uma conta para {email.trim()}, procure o código no
                  e-mail. Confira também a caixa de spam.
                </Text>
                <InputField
                  testID="recovery-code"
                  label="Código de recuperação"
                  value={code}
                  onChangeText={setCode}
                  keyboardType="number-pad"
                  maxLength={8}
                  autoComplete="one-time-code"
                  onSubmitEditing={() => void checkCode()}
                />
                <PrimaryButton
                  title={busy ? "Verificando..." : "Verificar código"}
                  disabled={busy}
                  onPress={() => void checkCode()}
                />
                <TouchFeedback
                  disabled={busy || cooldown > 0}
                  label={
                    cooldown
                      ? `Aguarde ${cooldown} segundos para reenviar`
                      : "Enviar outro código"
                  }
                  onPress={() => void requestCode()}
                >
                  <Text style={styles.back}>
                    {cooldown
                      ? `Reenviar em ${cooldown}s`
                      : "Enviar outro código"}
                  </Text>
                </TouchFeedback>
                <TouchFeedback
                  disabled={busy}
                  label="Corrigir e-mail"
                  onPress={() => {
                    setCode("");
                    setStep("email");
                    setError("");
                  }}
                >
                  <Text style={styles.back}>Corrigir e-mail</Text>
                </TouchFeedback>
              </>
            )}
            {step === "password" && (
              <>
                <Text style={styles.copy}>
                  Código confirmado. Escolha uma senha nova.
                </Text>
                <InputField
                  label="Nova senha"
                  icon="lock-closed-outline"
                  value={password}
                  onChangeText={setPassword}
                  password
                  autoCapitalize="none"
                  autoComplete="new-password"
                />
                <InputField
                  label="Repita a senha"
                  icon="lock-closed-outline"
                  value={again}
                  onChangeText={setAgain}
                  password
                  autoCapitalize="none"
                  autoComplete="new-password"
                  onSubmitEditing={() => void changePassword()}
                />
                <PrimaryButton
                  title={busy ? "Salvando..." : "Salvar senha"}
                  disabled={busy}
                  onPress={() => void changePassword()}
                />
              </>
            )}
            {step === "done" && (
              <>
                <Text style={styles.copy}>
                  Senha alterada. Volte ao login para entrar com a nova senha.
                </Text>
                <PrimaryButton title="Fazer login" onPress={leave} />
              </>
            )}
            {!!error && (
              <Text accessibilityRole="alert" style={styles.error}>
                {error}
              </Text>
            )}
          </MotionReveal>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1 },
  body: { ...pageContent, ...glassAuthCard },
  title: {
    color: colors.white,
    fontSize: 26,
    fontWeight: "700",
    marginTop: 12,
    marginBottom: 18,
  },
  copy: {
    color: colors.white,
    fontSize: typography.card,
    lineHeight: 23,
    marginBottom: 9,
  },
  back: {
    color: colors.white,
    fontWeight: "700",
    paddingVertical: 12,
    textDecorationLine: "underline",
  },
  error: {
    color: colors.white,
    fontSize: typography.body,
    lineHeight: 21,
    marginTop: 16,
  },
});
