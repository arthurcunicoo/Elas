import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "./icons/Ionicon";
import { TouchFeedback } from "./TouchFeedback";
import { PrimaryButton, SecondaryButton } from "./shared/Buttons";
import { Logo } from "./Logo";
import { MotionReveal } from "./MotionReveal";
import {
  cardShadow,
  colors,
  fonts,
  glass,
  glassPanel,
  pageContent,
  palette,
  radius,
  statusText,
  typography,
  ui,
} from "../constants/theme";
import { useReducedMotion } from "../hooks/useReducedMotion";

type StepId = "map" | "review" | "report" | "community";

type StepSpec = {
  id: StepId;
  shortLabel: string;
  eyebrow: string;
  title: string;
  description: string;
  icon: "location" | "heart" | "megaphone" | "sparkles";
  accentColor: string;
  tintColor: string;
  highlights: readonly string[];
};

const STEPS: readonly StepSpec[] = [
  {
    id: "map",
    shortLabel: "Mapa",
    eyebrow: "PASSO 1 DE 4 · MAPA COLABORATIVO",
    title: "Explore a cidade pela voz das mulheres",
    description:
      "Encontre parques, cafés, saúde e serviços no mapa com o resumo das percepções reais da comunidade sobre cada local.",
    icon: "location",
    accentColor: palette.brand,
    tintColor: palette.surfaceTint,
    highlights: ["Filtros por categoria", "Percepção coletiva", "Rotas a pé"],
  },
  {
    id: "review",
    shortLabel: "Avaliar",
    eyebrow: "PASSO 2 DE 4 · AVALIAÇÃO SEGURA",
    title: "Conte como você se sente em cada espaço",
    description:
      "Escolha o sentimento que resume sua experiência e marque fatores como iluminação, movimento ou acessibilidade com total privacidade.",
    icon: "heart",
    accentColor: palette.success,
    tintColor: palette.successTint,
    highlights: ["Autoria 100% privada", "4 níveis de percepção", "Fatores do local"],
  },
  {
    id: "report",
    shortLabel: "Relatos",
    eyebrow: "PASSO 3 DE 4 · ALERTAS EM 24H",
    title: "Registre situações que pedem atenção",
    description:
      "Viu iluminação apagada ou algo que precisa de cuidado? Envie um relato rápido. Após verificação da equipe, ele alerta a rede por 24h.",
    icon: "megaphone",
    accentColor: palette.warning,
    tintColor: palette.warningTint,
    highlights: ["Feed das últimas 24h", "Verificação da equipe", "GPS opcional"],
  },
  {
    id: "community",
    shortLabel: "Impactos",
    eyebrow: "PASSO 4 DE 4 · COMUNIDADE ATIVA",
    title: "Transforme seu bairro junto com a rede",
    description:
      "Participe de encontros, vote nas enquetes prioritárias da cidade, sugira melhorias públicas e desbloqueie conquistas no seu perfil.",
    icon: "sparkles",
    accentColor: palette.accent,
    tintColor: palette.infoTint,
    highlights: ["Eventos e enquetes", "Sugerir melhorias", "Conquistas"],
  },
];

function OnboardingArt({
  step,
  floatAnim,
}: {
  step: StepId;
  floatAnim: Animated.Value;
}) {
  const translateY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -5],
  });

  if (step === "map") {
    return (
      <View style={styles.artStage} accessible={false}>
        <View style={[styles.artGlow, { backgroundColor: palette.surfaceTint }]} />
        <View style={styles.mapCanvasMini}>
          <View style={styles.mapRoadHorizontal} />
          <View style={styles.mapRoadVertical} />
          <View style={styles.mapParkPatch} />
          <View style={styles.mapCategoryRow}>
            <View style={[styles.miniCategoryPill, { backgroundColor: colors.pink }]}>
              <Ionicons name="grid-outline" size={12} color={colors.white} />
              <Text style={styles.miniCategoryTextActive}>Todos</Text>
            </View>
            <View style={styles.miniCategoryPill}>
              <Ionicons name="leaf-outline" size={12} color={palette.success} />
              <Text style={styles.miniCategoryText}>Parques</Text>
            </View>
            <View style={styles.miniCategoryPill}>
              <Ionicons name="cafe-outline" size={12} color={colors.wine} />
              <Text style={styles.miniCategoryText}>Cafés</Text>
            </View>
          </View>
          <Animated.View
            style={[styles.mapCenterPinWrap, { transform: [{ translateY }] }]}
          >
            <View style={styles.mapPinPulse} />
            <View style={styles.mapPinBody}>
              <Ionicons name="heart" size={16} color={colors.white} />
            </View>
          </Animated.View>
          <View style={styles.mapFloatingBadge}>
            <Ionicons
              name="shield-checkmark"
              size={15}
              color={palette.success}
            />
            <Text style={styles.mapFloatingBadgeText}>
              Percepção favorável · 18 avaliações
            </Text>
          </View>
        </View>
      </View>
    );
  }

  if (step === "review") {
    const moods = [
      { label: "Segura", color: palette.successFill, icon: "happy-outline" as const },
      { label: "Moderada", color: palette.warningFill, icon: "remove-circle-outline" as const },
      { label: "Atenção", color: palette.attentionFill, icon: "alert-circle-outline" as const },
      { label: "Cuidado", color: palette.dangerFill, icon: "warning-outline" as const },
    ];
    return (
      <View style={styles.artStage} accessible={false}>
        <View style={[styles.artGlow, { backgroundColor: palette.successTint }]} />
        <View style={styles.artCard}>
          <Animated.View
            style={[styles.moodStrip, { transform: [{ translateY }] }]}
          >
            {moods.map((m, idx) => (
              <View
                key={m.label}
                style={[
                  styles.moodItem,
                  idx === 0 && styles.moodItemSelected,
                ]}
              >
                <View style={[styles.moodCircle, { backgroundColor: m.color }]}>
                  <Ionicons name={m.icon} size={16} color={colors.white} />
                </View>
                <Text style={styles.moodMiniLabel}>{m.label}</Text>
              </View>
            ))}
          </Animated.View>
          <View style={styles.factorMiniRow}>
            <View style={styles.factorMiniChipActive}>
              <Ionicons name="checkmark-circle" size={13} color={colors.pink} />
              <Text style={styles.factorMiniTextActive}>Boa iluminação</Text>
            </View>
            <View style={styles.factorMiniChipActive}>
              <Ionicons name="checkmark-circle" size={13} color={colors.pink} />
              <Text style={styles.factorMiniTextActive}>Movimento</Text>
            </View>
          </View>
          <View style={styles.privacyPill}>
            <Ionicons name="lock-closed" size={13} color={colors.wine} />
            <Text style={styles.privacyPillText}>
              Comentários e autoria ficam 100% privados
            </Text>
          </View>
        </View>
      </View>
    );
  }

  if (step === "report") {
    return (
      <View style={styles.artStage} accessible={false}>
        <View style={[styles.artGlow, { backgroundColor: palette.warningTint }]} />
        <View style={styles.artCard}>
          <Animated.View
            style={[styles.reportMiniCard, { transform: [{ translateY }] }]}
          >
            <View style={styles.reportMiniHeader}>
              <View style={styles.reportMiniIcon}>
                <Ionicons name="megaphone" size={15} color={colors.white} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.reportMiniTitle}>Iluminação na praça</Text>
                <Text style={styles.reportMiniMeta}>Há 12 min · Centro</Text>
              </View>
              <View style={styles.reportTimeBadge}>
                <Text style={styles.reportTimeBadgeText}>24h</Text>
              </View>
            </View>
            <View style={styles.reportVerifiedBanner}>
              <Ionicons
                name="checkmark-circle"
                size={15}
                color={palette.success}
              />
              <Text style={styles.reportVerifiedText}>
                Relato verificado pela equipe
              </Text>
            </View>
          </Animated.View>
          <View style={styles.privacyPill}>
            <Ionicons name="location-outline" size={14} color={colors.pink} />
            <Text style={styles.privacyPillText}>
              Localização aproximada é sempre opcional
            </Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.artStage} accessible={false}>
      <View style={[styles.artGlow, { backgroundColor: palette.infoTint }]} />
      <View style={styles.artCard}>
        <Animated.View
          style={[styles.communityMiniRow, { transform: [{ translateY }] }]}
        >
          <View style={styles.calendarMiniTile}>
            <Text style={styles.calendarMiniMonth}>OUT</Text>
            <Text style={styles.calendarMiniDay}>28</Text>
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={styles.reportMiniTitle}>Roda de conversa e caminhada</Text>
            <View style={styles.pollMiniTrack}>
              <View style={styles.pollMiniFill} />
            </View>
            <Text style={styles.reportMiniMeta}>
              Enquete ativa · 78% priorizam iluminação
            </Text>
          </View>
        </Animated.View>
        <View style={styles.achievementMiniBanner}>
          <Ionicons name="ribbon" size={16} color={palette.accent} />
          <Text style={styles.achievementMiniText}>
            Desbloqueie conquistas ao participar!
          </Text>
        </View>
      </View>
    </View>
  );
}

export function OnboardingCardDeck({
  onLogin,
  onRegister,
  compact = false,
}: {
  onLogin: () => void;
  onRegister: () => void;
  compact?: boolean;
}) {
  const [index, setIndex] = useState(0);
  const reduced = useReducedMotion();
  const transition = useRef(new Animated.Value(1)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const current = STEPS[index];
  const isLastStep = index === STEPS.length - 1;

  useEffect(() => {
    if (reduced) {
      floatAnim.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: Platform.OS !== "web",
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: Platform.OS !== "web",
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [floatAnim, reduced]);

  function goToStep(next: number) {
    const clamped = Math.max(0, Math.min(STEPS.length - 1, next));
    if (clamped === index) return;
    setIndex(clamped);
    if (reduced) {
      transition.setValue(1);
      return;
    }
    transition.setValue(0.88);
    Animated.spring(transition, {
      toValue: 1,
      stiffness: 290,
      damping: 20,
      mass: 0.7,
      useNativeDriver: Platform.OS !== "web",
    }).start();
  }

  return (
    <View style={[styles.deck, compact && styles.deckCompact]}>
      <View style={styles.stepTabsRow}>
        {STEPS.map((item, idx) => {
          const active = idx === index;
          return (
            <TouchFeedback
              key={item.id}
              role="tab"
              selected={active}
              label={`Passo ${idx + 1}: ${item.shortLabel}`}
              onPress={() => goToStep(idx)}
              style={[styles.stepTab, active && styles.stepTabActive]}
            >
              <Ionicons
                name={item.icon}
                size={14}
                color={active ? colors.white : colors.pink}
              />
              <Text
                style={[
                  styles.stepTabText,
                  active && styles.stepTabTextActive,
                ]}
              >
                {item.shortLabel}
              </Text>
            </TouchFeedback>
          );
        })}
      </View>

      <Animated.View
        style={{
          opacity: transition,
          transform: [{ scale: transition }],
        }}
      >
        <OnboardingArt step={current.id} floatAnim={floatAnim} />

        <View style={styles.copyBlock}>
          <View style={styles.eyebrowPill}>
            <Ionicons name={current.icon} size={13} color={colors.pink} />
            <Text style={styles.eyebrowText}>{current.eyebrow}</Text>
          </View>
          <Text accessibilityRole="header" style={styles.title}>
            {current.title}
          </Text>
          <Text style={styles.description}>{current.description}</Text>

          <View style={styles.highlightsRow}>
            {current.highlights.map((tag) => (
              <View key={tag} style={styles.highlightChip}>
                <Ionicons
                  name="checkmark-circle"
                  size={13}
                  color={colors.pink}
                />
                <Text style={styles.highlightText}>{tag}</Text>
              </View>
            ))}
          </View>
        </View>
      </Animated.View>

      <View style={styles.controlsRow}>
        <TouchFeedback
          label="Passo anterior"
          disabled={index === 0}
          onPress={() => goToStep(index - 1)}
          style={[styles.arrowBtn, index === 0 && styles.arrowBtnDisabled]}
        >
          <Ionicons
            name="chevron-back"
            size={18}
            color={index === 0 ? palette.muted : colors.pink}
          />
          <Text
            style={[
              styles.arrowBtnText,
              index === 0 && { color: palette.muted },
            ]}
          >
            Anterior
          </Text>
        </TouchFeedback>

        <View style={styles.dotsRow}>
          {STEPS.map((s, idx) => (
            <Pressable
              key={s.id}
              accessibilityRole="button"
              accessibilityLabel={`Ir para passo ${idx + 1}`}
              onPress={() => goToStep(idx)}
              style={[styles.dot, idx === index && styles.dotActive]}
            />
          ))}
        </View>

        {!isLastStep ? (
          <TouchFeedback
            label="Próximo passo"
            onPress={() => goToStep(index + 1)}
            style={styles.nextBtn}
          >
            <Text style={styles.nextBtnText}>Próximo</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.white} />
          </TouchFeedback>
        ) : (
          <TouchFeedback
            label="Recomeçar apresentação"
            onPress={() => goToStep(0)}
            style={styles.arrowBtn}
          >
            <Ionicons name="refresh" size={16} color={colors.pink} />
            <Text style={styles.arrowBtnText}>Rever</Text>
          </TouchFeedback>
        )}
      </View>

      {isLastStep && !compact && (
        <View style={styles.stepFourActions}>
          <TouchFeedback
            label="Criar conta"
            onPress={onRegister}
            style={styles.stepFourSecondaryBtn}
          >
            <Ionicons name="person-add-outline" size={17} color={colors.pink} />
            <Text style={styles.stepFourSecondaryText}>Criar conta</Text>
          </TouchFeedback>
          <TouchFeedback
            label="Já tenho conta · Entrar"
            onPress={onLogin}
            style={styles.stepFourPrimaryBtn}
          >
            <Text style={styles.stepFourPrimaryText}>
              Já tenho conta · Entrar
            </Text>
            <Ionicons name="arrow-forward" size={17} color={colors.white} />
          </TouchFeedback>
        </View>
      )}
    </View>
  );
}

/** 1º passo antes do Login/Cadastro para novos acessos */
export function WelcomeOnboarding({
  onContinue,
  onRegister,
}: {
  onContinue: () => void;
  onRegister: () => void;
}) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        flexGrow: 1,
        paddingTop: Math.max(insets.top + 14, 20),
        paddingBottom: Math.max(insets.bottom + 20, 26),
        justifyContent: "center",
        gap: 16,
      }}
    >
      <View style={styles.welcomeTopBar}>
        <View
          accessible
          accessibilityLabel="ELAS na cidade"
          style={styles.welcomeLogoWrap}
        >
          <MotionReveal distance={-12}>
            <Logo width={Math.min(width * 0.34, 134)} />
          </MotionReveal>
        </View>
        <MotionReveal delay={30} distance={-8}>
          <TouchFeedback
            label="Pular apresentação e ir para o login"
            onPress={onContinue}
            style={styles.skipPill}
          >
            <Text style={styles.skipPillText}>Pular ›</Text>
          </TouchFeedback>
        </MotionReveal>
      </View>

      <View style={styles.deckContainer}>
        <MotionReveal delay={50} distance={14}>
          <OnboardingCardDeck
            compact
            onLogin={onContinue}
            onRegister={onRegister}
          />
        </MotionReveal>
      </View>

      <View style={styles.welcomeActions}>
        <MotionReveal delay={90}>
          <View style={styles.dualButtonsRow}>
            <View style={styles.dualButtonCol}>
              <SecondaryButton
                title="Criar conta"
                onPress={onRegister}
                style={styles.welcomeActionBtn}
              />
            </View>
            <View style={styles.dualButtonCol}>
              <PrimaryButton
                title="Começar"
                onPress={onContinue}
                style={styles.welcomeActionBtn}
              />
            </View>
          </View>
        </MotionReveal>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  welcomeTopBar: {
    ...pageContent,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  welcomeLogoWrap: {
    flexShrink: 1,
  },
  skipPill: {
    minHeight: 38,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: glass.surfaceStrong,
    borderWidth: 1,
    borderColor: glass.tintedBorder,
    alignItems: "center",
    justifyContent: "center",
    ...cardShadow,
  },
  skipPillText: {
    color: colors.pink,
    fontFamily: fonts.display,
    fontSize: typography.caption,
    fontWeight: "800",
  },
  deckContainer: {
    ...pageContent,
  },
  welcomeActions: {
    ...pageContent,
    paddingTop: 2,
  },
  welcomeActionBtn: {
    minHeight: 50,
    paddingVertical: 12,
  },
  dualButtonsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  dualButtonCol: {
    flex: 1,
    minWidth: 140,
  },
  deck: {
    ...glassPanel,
    borderRadius: radius.large,
    padding: 18,
    gap: 14,
  },
  deckCompact: {
    padding: 16,
    gap: 14,
  },
  stepTabsRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  stepTab: {
    flex: 1,
    minWidth: 68,
    minHeight: 38,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: glass.surfaceSoft,
    borderWidth: 1,
    borderColor: glass.tintedBorder,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  stepTabActive: {
    backgroundColor: colors.pink,
    borderColor: colors.pink,
  },
  stepTabText: {
    color: colors.wine,
    fontFamily: fonts.display,
    fontSize: typography.caption,
    fontWeight: "700",
  },
  stepTabTextActive: {
    color: colors.white,
  },
  artStage: {
    minHeight: 152,
    borderRadius: radius.large,
    backgroundColor: glass.surfaceSoft,
    borderWidth: 1,
    borderColor: glass.tintedBorder,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
  },
  artGlow: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: radius.pill,
    opacity: 0.7,
  },
  mapCanvasMini: {
    width: "100%",
    minHeight: 132,
    borderRadius: radius.medium,
    backgroundColor: glass.surfaceStrong,
    borderWidth: 1,
    borderColor: glass.border,
    padding: 10,
    gap: 10,
    justifyContent: "space-between",
    overflow: "hidden",
  },
  mapRoadHorizontal: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "52%",
    height: 8,
    backgroundColor: palette.surfaceTint,
  },
  mapRoadVertical: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: "48%",
    width: 8,
    backgroundColor: palette.surfaceTint,
  },
  mapParkPatch: {
    position: "absolute",
    right: 14,
    top: 28,
    width: 48,
    height: 36,
    borderRadius: radius.medium,
    backgroundColor: palette.successTint,
  },
  mapCategoryRow: {
    flexDirection: "row",
    gap: 6,
    zIndex: 2,
  },
  miniCategoryPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: glass.surfaceSoft,
    borderWidth: 1,
    borderColor: glass.tintedBorder,
  },
  miniCategoryTextActive: {
    color: colors.white,
    fontFamily: fonts.display,
    fontSize: typography.caption,
    fontWeight: "700",
  },
  miniCategoryText: {
    color: ui.text,
    fontFamily: fonts.display,
    fontSize: typography.caption,
    fontWeight: "600",
  },
  mapCenterPinWrap: {
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 3,
  },
  mapPinPulse: {
    position: "absolute",
    width: 46,
    height: 46,
    borderRadius: radius.pill,
    backgroundColor: glass.tintedBorder,
  },
  mapPinBody: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: colors.pink,
    borderWidth: 2,
    borderColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    ...cardShadow,
  },
  mapFloatingBadge: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: palette.successTint,
    borderWidth: 1,
    borderColor: glass.border,
    zIndex: 2,
  },
  mapFloatingBadgeText: {
    color: statusText.safe,
    fontFamily: fonts.sans,
    fontSize: typography.caption,
    fontWeight: "700",
  },
  artCard: {
    width: "100%",
    minHeight: 132,
    borderRadius: radius.medium,
    backgroundColor: glass.surfaceStrong,
    borderWidth: 1,
    borderColor: glass.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    justifyContent: "space-between",
  },
  moodStrip: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  moodItem: {
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: radius.medium,
  },
  moodItemSelected: {
    backgroundColor: palette.successTint,
  },
  moodCircle: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  moodMiniLabel: {
    fontFamily: fonts.display,
    fontSize: typography.caption,
    fontWeight: "700",
    color: ui.text,
  },
  factorMiniRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  factorMiniChipActive: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: glass.surfaceSoft,
    borderWidth: 1,
    borderColor: glass.tintedBorder,
  },
  factorMiniTextActive: {
    color: colors.wine,
    fontFamily: fonts.sans,
    fontSize: typography.caption,
    fontWeight: "600",
  },
  privacyPill: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: glass.surfaceSoft,
  },
  privacyPillText: {
    color: colors.wine,
    fontFamily: fonts.sans,
    fontSize: typography.caption,
    fontWeight: "600",
  },
  reportMiniCard: {
    borderRadius: radius.medium,
    backgroundColor: glass.surfaceSoft,
    borderWidth: 1,
    borderColor: glass.tintedBorder,
    padding: 9,
    gap: 6,
  },
  reportMiniHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  reportMiniIcon: {
    width: 28,
    height: 28,
    borderRadius: radius.medium,
    backgroundColor: colors.pink,
    alignItems: "center",
    justifyContent: "center",
  },
  reportMiniTitle: {
    color: ui.text,
    fontFamily: fonts.display,
    fontSize: typography.secondary,
    fontWeight: "700",
  },
  reportMiniMeta: {
    color: ui.muted,
    fontFamily: fonts.sans,
    fontSize: typography.caption,
  },
  reportTimeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
  },
  reportTimeBadgeText: {
    color: colors.pink,
    fontFamily: fonts.display,
    fontSize: typography.caption,
    fontWeight: "800",
  },
  reportVerifiedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  reportVerifiedText: {
    color: statusText.safe,
    fontFamily: fonts.sans,
    fontSize: typography.caption,
    fontWeight: "700",
  },
  communityMiniRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: glass.surfaceSoft,
    borderRadius: radius.medium,
    padding: 8,
  },
  calendarMiniTile: {
    width: 44,
    height: 48,
    borderRadius: radius.medium,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: glass.tintedBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  calendarMiniMonth: {
    color: colors.pink,
    fontFamily: fonts.display,
    fontSize: typography.caption,
    fontWeight: "800",
  },
  calendarMiniDay: {
    color: colors.wine,
    fontFamily: fonts.display,
    fontSize: typography.input,
    fontWeight: "800",
  },
  pollMiniTrack: {
    height: 7,
    borderRadius: radius.pill,
    backgroundColor: palette.border,
    overflow: "hidden",
  },
  pollMiniFill: {
    width: "78%",
    height: "100%",
    borderRadius: radius.pill,
    backgroundColor: colors.achievement,
  },
  achievementMiniBanner: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: palette.infoTint,
  },
  achievementMiniText: {
    color: palette.accent,
    fontFamily: fonts.display,
    fontSize: typography.caption,
    fontWeight: "700",
  },
  copyBlock: {
    marginTop: 14,
    gap: 8,
  },
  eyebrowPill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: glass.surfaceSoft,
    borderWidth: 1,
    borderColor: glass.tintedBorder,
  },
  eyebrowText: {
    color: colors.pink,
    fontFamily: fonts.display,
    fontSize: typography.caption,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  title: {
    color: ui.text,
    fontFamily: fonts.display,
    fontSize: 19,
    lineHeight: 24,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  description: {
    color: ui.muted,
    fontFamily: fonts.sans,
    fontSize: typography.secondary,
    lineHeight: 19,
  },
  highlightsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 4,
  },
  highlightChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: glass.surface,
    borderWidth: 1,
    borderColor: palette.border,
  },
  highlightText: {
    color: colors.wine,
    fontFamily: fonts.sans,
    fontSize: typography.caption,
    fontWeight: "600",
  },
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginTop: 2,
  },
  arrowBtn: {
    minHeight: 40,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: glass.surfaceSoft,
    borderWidth: 1,
    borderColor: glass.tintedBorder,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  arrowBtnDisabled: {
    opacity: 0.45,
  },
  arrowBtnText: {
    color: colors.pink,
    fontFamily: fonts.display,
    fontSize: typography.caption,
    fontWeight: "700",
  },
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: palette.icon,
    opacity: 0.45,
  },
  dotActive: {
    width: 22,
    backgroundColor: colors.pink,
    opacity: 1,
  },
  nextBtn: {
    minHeight: 40,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.pink,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    ...cardShadow,
  },
  nextBtnText: {
    color: colors.white,
    fontFamily: fonts.display,
    fontSize: typography.caption,
    fontWeight: "700",
  },
  stepFourActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 2,
  },
  stepFourSecondaryBtn: {
    flex: 1,
    minWidth: 125,
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: glass.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.pink,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  stepFourSecondaryText: {
    color: colors.pink,
    fontFamily: fonts.display,
    fontSize: typography.secondary,
    fontWeight: "800",
  },
  stepFourPrimaryBtn: {
    flex: 1.3,
    minWidth: 165,
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.pink,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    ...cardShadow,
  },
  stepFourPrimaryText: {
    color: colors.white,
    fontFamily: fonts.display,
    fontSize: typography.secondary,
    fontWeight: "800",
  },
});
