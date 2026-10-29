import { CityPulse } from "../loading/CityPulse";
import { colors, glass, glassPanel, ui, palette, radius, typography } from "../../constants/theme";
import { useEffect, useState } from "react";
import { Modal, ScrollView, StyleSheet, Text, View } from "react-native";
import Ionicons from "../icons/Ionicon";

import { TouchFeedback } from "../TouchFeedback";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function MapLoadingPopup({
  visible,
  mapReady,
  placesReady,
  error,
  onClose,
  onRetry,
}: {
  visible: boolean;
  mapReady: boolean;
  placesReady: boolean;
  error: string;
  onClose: () => void;
  onRetry: () => void;
}) {
  const reduced = useReducedMotion(),
    insets = useSafeAreaInsets();
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    setSlow(false);
    if (!visible) return;
    const timer = setTimeout(() => setSlow(true), 8000);
    return () => clearTimeout(timer);
  }, [visible]);
  return (
    <Modal
      visible={visible}
      transparent
      animationType={reduced ? "none" : "fade"}
      onRequestClose={onClose}
    >
      <View
        style={[
          styles.backdrop,
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
        ]}
      >
        <View accessibilityViewIsModal style={styles.dialog}>
          <ScrollView contentContainerStyle={styles.content}>
            {error ? (
              <View style={styles.errorArt}>
                <Ionicons
                  name="cloud-offline-outline"
                  size={38}
                  color={colors.pink}
                />
              </View>
            ) : (
              <CityPulse active={visible} />
            )}
            <Text accessibilityRole="header" style={styles.title}>
              {error ? "Não foi possível concluir" : "Preparando seu mapa"}
            </Text>
            <Text
              accessibilityRole={error ? "alert" : "text"}
              accessibilityLiveRegion="polite"
              style={styles.subtitle}
            >
              {error ||
                (slow
                  ? "Está demorando um pouco. Você pode continuar enquanto carregamos."
                  : "Reunindo os lugares da sua cidade.")}
            </Text>
            {!error && (
              <View style={styles.steps}>
                {[
                  { title: "Mapa da cidade", ready: mapReady },
                  { title: "Lugares próximos", ready: placesReady },
                ].map((step) => (
                  <View key={step.title} style={styles.step}>
                    {step.ready ? (
                      <Ionicons
                        name="checkmark-circle"
                        color={palette.success}
                        size={21}
                      />
                    ) : (
                      <View style={styles.pendingDot} />
                    )}
                    <Text style={styles.stepText}>{step.title}</Text>
                    <Text style={styles.stepState}>
                      {step.ready ? "Pronto" : "Carregando"}
                    </Text>
                  </View>
                ))}
              </View>
            )}
            {!!error && (
              <TouchFeedback
                label="Tentar carregar o mapa novamente"
                onPress={onRetry}
                style={styles.retry}
              >
                <Text style={styles.retryText}>Tentar novamente</Text>
              </TouchFeedback>
            )}
            <TouchFeedback
              label="Continuar no app enquanto o mapa carrega"
              onPress={onClose}
              style={styles.continue}
            >
              <Text style={styles.continueText}>
                {error ? "Continuar no app" : "Continuar enquanto carrega"}
              </Text>
            </TouchFeedback>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: glass.overlay,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  dialog: {
    width: "100%",
    maxWidth: 360,
    maxHeight: "90%",
    alignSelf: "center",
    borderRadius: radius.large,
    ...glassPanel,
    overflow: "hidden",
  },
  content: { padding: 20 },
  errorArt: { alignItems: "center", padding: 24, marginBottom: 16 },
  pendingDot: {
    width: 21,
    height: 21,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: palette.border,
  },
  title: {
    fontSize: typography.page,
    fontWeight: "700",
    textAlign: "center",
    color: ui.text,
  },
  subtitle: {
    marginTop: 9,
    lineHeight: 21,
    fontSize: typography.body,
    color: ui.muted,
    textAlign: "center",
  },
  steps: {
    marginTop: 20,
    padding: 14,
    gap: 17,
    borderRadius: radius.medium,
    backgroundColor: palette.background,
  },
  step: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    flexWrap: "wrap",
  },
  stepText: {
    flex: 1,
    color: ui.text,
    fontSize: typography.secondary,
    minWidth: 96,
  },
  stepState: { color: ui.muted, fontSize: typography.caption },
  retry: {
    backgroundColor: colors.pink,
    borderRadius: radius.medium,
    marginTop: 20,
    minHeight: 46,
    alignItems: "center",
  },
  retryText: {
    color: colors.white,
    fontWeight: "700",
    fontSize: typography.body,
  },
  continue: { minHeight: 46, marginTop: 14, alignItems: "center" },
  continueText: {
    color: colors.pink,
    fontWeight: "600",
    textAlign: "center",
    fontSize: typography.secondary,
  },
});
