import { signIn, signUp, resendConfirmation as sendConfirmation } from "../services/account";
import { pageContent, colors, fonts, glass, glassAuthCard, radius, typography } from "../constants/theme";
import { validEmail } from "../lib/account";
import { TouchFeedback } from "./TouchFeedback";
import { backendConfigured, friendlyError } from "../lib/supabase";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getCityLayout } from "../constants/cityLayout";
import { MotionReveal } from "./MotionReveal";
import { AccountLink } from "./AccountLink";
import { InputField } from "./InputField";
import { PrimaryButton } from "./shared/Buttons";
import { WelcomeOnboarding } from "./OnboardingTour";
import {
  completeOnboarding,
  isOnboardingCompleted,
  resetOnboarding,
  subscribeOnboardingState,
} from "../features/map/onboardingEvent";

export function AuthScreen({
  registration = false,
}: {
  registration?: boolean;
}) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [onboardingDone, setOnboardingDone] = useState(isOnboardingCompleted);
  useEffect(() => subscribeOnboardingState(setOnboardingDone), []);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [confirmationEmail, setConfirmationEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const leaving = useRef(false);
  const exitProgress = useRef(new Animated.Value(0)).current;
  useFocusEffect(
    useCallback(() => {
      leaving.current = false;
      setTransitioning(false);
      exitProgress.setValue(0);
      return () => {
        leaving.current = false;
        exitProgress.stopAnimation();
      };
    }, [exitProgress]),
  );
  const emailError = !email.trim()
    ? "Informe seu e-mail."
    : !validEmail(email)
      ? "Informe um e-mail válido."
      : undefined;
  async function submit() {
    if (leaving.current) return;
    setSubmitted(true);
    setMessage("");
    if (
      (registration && (!name.trim() || password.length < 8)) ||
      emailError ||
      !password
    )
      return;
    Keyboard.dismiss();
    leaving.current = true;
    setTransitioning(true);
    try {
      if (!backendConfigured) {
        router.replace(registration ? "/login" : "/perfil");
        return;
      }
      if (registration) {
        const data = await signUp(email, password, name);
        if (!data.session) {
          setConfirmationEmail(email.trim());
          setMessage(
            "Se houver um cadastro pendente, você receberá o link de confirmação. Depois, volte e faça login.",
          );
          setPassword("");
          return;
        }
      } else {
        await signIn(email, password);
      }
      // Stack.Protected switches to the signed-in app when the session arrives.
    } catch (error) {
      setMessage(friendlyError(error));
    } finally {
      leaving.current = false;
      setTransitioning(false);
    }
  }
  async function resendConfirmation() {
    if (!confirmationEmail || leaving.current) return;
    leaving.current = true;
    setTransitioning(true);
    setMessage("");
    try {
      await sendConfirmation(confirmationEmail);
      setMessage(
        "Se houver cadastro pendente, você receberá uma nova mensagem. Confira também a caixa de spam.",
      );
    } catch (e) {
      setMessage(friendlyError(e));
    } finally {
      leaving.current = false;
      setTransitioning(false);
    }
  }

  // Primeiro passo obrigatório antes do Login para novos acessos
  if (!onboardingDone) {
    return (
      <WelcomeOnboarding
        onContinue={() => {
          completeOnboarding();
          if (registration) router.replace("/login");
        }}
        onRegister={() => {
          completeOnboarding();
          if (!registration) router.push("/cadastro");
        }}
      />
    );
  }

  const { bottom: cityBottom } = getCityLayout(width, height, false);
  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: Math.max(
            insets.top + 14,
            cityBottom - (registration ? 26 : 6),
          ),
          paddingBottom: Math.max(24, insets.bottom + 18),
        }}
      >
        <Animated.View
          pointerEvents={transitioning ? "none" : "auto"}
          accessibilityState={{ busy: transitioning }}
          style={[
            styles.form,
            {
              opacity: exitProgress.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 0],
              }),
              transform: [
                {
                  translateY: exitProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -18],
                  }),
                },
              ],
            },
          ]}
        >
          <MotionReveal>
            <TouchFeedback
              label="Voltar para a apresentação inicial do ELAS"
              onPress={() => {
                resetOnboarding();
              }}
              style={styles.backToOnboarding}
            >
              <Text style={styles.backToOnboardingText}>
                ‹ Conheça o ELAS · Como funciona
              </Text>
            </TouchFeedback>
            <Text accessibilityRole="header" style={styles.title}>
              {confirmationEmail
                ? "Confirme seu e-mail"
                : registration
                  ? "Faça seu cadastro"
                  : "Faça seu Login"}
            </Text>
          </MotionReveal>
          {confirmationEmail ? (
            <>
              <Text style={styles.confirmation}>
                Confira {confirmationEmail}. Se receber um link de confirmação,
                abra-o e volte para fazer login.
              </Text>
              {!!message && (
                <Text accessibilityRole="alert" style={styles.confirmation}>
                  {message}
                </Text>
              )}
              <TouchFeedback
                disabled={transitioning}
                label="Reenviar confirmação"
                onPress={() => void resendConfirmation()}
              >
                <Text style={styles.auxiliary}>Reenviar confirmação</Text>
              </TouchFeedback>
              <AccountLink registration />
            </>
          ) : (
            <>
              {registration && (
                <MotionReveal delay={80}>
                  <InputField
                    label="Insira seu nome"
                    icon="person-outline"
                    value={name}
                    maxLength={100}
                    onChangeText={setName}
                    autoCapitalize="words"
                    autoComplete="name"
                    error={
                      submitted && !name.trim()
                        ? "Informe seu nome."
                        : undefined
                    }
                  />
                </MotionReveal>
              )}
              <MotionReveal delay={registration ? 160 : 100}>
                <InputField
                  label={
                    registration ? "Insira seu e-mail" : "Digite seu e-mail"
                  }
                  testID="auth-email"
                  icon="mail-outline"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  error={submitted ? emailError : undefined}
                />
              </MotionReveal>
              <MotionReveal delay={registration ? 240 : 180}>
                <InputField
                  label={registration ? "Insira sua senha" : "Digite sua senha"}
                  testID="auth-password"
                  icon="lock-closed-outline"
                  value={password}
                  onChangeText={setPassword}
                  password
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete={
                    registration ? "new-password" : "current-password"
                  }
                  returnKeyType="done"
                  onSubmitEditing={submit}
                  error={
                    submitted && !password
                      ? "Informe sua senha."
                      : submitted && registration && password.length < 8
                        ? "Use pelo menos 8 caracteres."
                        : undefined
                  }
                />
              </MotionReveal>
              {!!message && (
                <Text accessibilityRole="alert" style={styles.confirmation}>
                  {message}
                </Text>
              )}
              {!registration && (
                <TouchFeedback
                  role="link"
                  label="Esqueci minha senha"
                  onPress={() => router.push("/recuperar-senha")}
                  style={styles.auxiliaryTouch}
                >
                  <Text style={styles.auxiliary}>Esqueci minha senha</Text>
                </TouchFeedback>
              )}
              <MotionReveal delay={300}>
                <AccountLink registration={registration} />
              </MotionReveal>
              <MotionReveal delay={380}>
                <PrimaryButton
                  testID="auth-submit"
                  disabled={transitioning}
                  title={
                    transitioning
                      ? "Aguarde..."
                      : registration
                        ? "Cadastrar"
                        : "Entrar"
                  }
                  onPress={submit}
                  style={styles.submitButton}
                />
              </MotionReveal>
            </>
          )}
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1 },
  form: { ...pageContent, ...glassAuthCard, paddingVertical: 8 },
  backToOnboarding: {
    alignSelf: "flex-start",
    minHeight: 32,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: glass.pill,
    borderWidth: 1,
    borderColor: glass.pillBorder,
    marginBottom: 8,
  },
  backToOnboardingText: {
    color: colors.white,
    fontFamily: fonts.display,
    fontSize: typography.caption,
    fontWeight: "700",
  },
  title: {
    color: colors.white,
    fontFamily: fonts.display,
    fontSize: 24,
    fontWeight: "800",
    marginLeft: 4,
    marginBottom: 4,
  },
  submitButton: {
    width: "68%",
    maxWidth: 260,
    alignSelf: "center",
    borderRadius: radius.large,
    marginTop: 6,
  },
  confirmation: {
    color: "white",
    fontSize: typography.card,
    lineHeight: 22,
    marginVertical: 12,
  },
  auxiliaryTouch: {
    minHeight: 36,
    marginTop: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  auxiliary: {
    color: "white",
    textAlign: "center",
    textDecorationLine: "underline",
    paddingVertical: 4,
    fontSize: typography.body,
  },
});
