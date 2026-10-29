import { LoadingIndicator } from "../loading/LoadingIndicator";
import { colors, glass, statusText, ui, palette, radius, typography } from "../../constants/theme";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { communityMoods, type ReviewSummary } from "../../constants/community";

import { TouchFeedback } from "../TouchFeedback";
const moodColors = {
  Segura: statusText.safe,
  Moderada: statusText.moderate,
  Atenção: statusText.attention,
  Cuidado: statusText.danger,
};
export function CommunityReviewSummary({
  summary,
  unavailable,
  expanded,
  onExpand,
  onRefresh,
}: {
  summary?: ReviewSummary;
  unavailable?: boolean;
  expanded: boolean;
  onExpand: () => void;
  onRefresh?: (signal?: AbortSignal) => Promise<unknown>;
}) {
  const [method, setMethod] = useState(false),
    [refreshing, setRefreshing] = useState(false),
    [error, setError] = useState(false);
  const active = useRef(true);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
      controller.current?.abort();
    };
  }, []);
  async function refresh() {
    if (!onRefresh || refreshing) return;
    controller.current = new AbortController();
    setRefreshing(true);
    setError(false);
    try {
      await onRefresh(controller.current.signal);
    } catch {
      if (active.current) setError(true);
    } finally {
      if (active.current) setRefreshing(false);
    }
  }
  const total = summary?.total ?? 0;
  if (!expanded)
    return (
      <TouchFeedback
        label={
          unavailable
            ? "Ver estado das avaliações"
            : `Ver ${total} avaliações aprovadas`
        }
        onPress={onExpand}
        style={styles.preview}
      >
        <View style={styles.previewRow}>
          <Text style={styles.action}>
            {unavailable
              ? "Avaliações indisponíveis agora"
              : total
                ? `${total} ${total === 1 ? "avaliação aprovada" : "avaliações aprovadas"}`
                : "Ainda sem avaliações aprovadas"}
          </Text>
          <Text style={styles.previewHint}>Ver tudo ›</Text>
        </View>
      </TouchFeedback>
    );
  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={styles.title}>
        Avaliações da comunidade
      </Text>
      {unavailable || error ? (
        <Text accessibilityRole="alert" style={styles.note}>
          Não foi possível atualizar as percepções. Tente novamente.
        </Text>
      ) : !summary ? (
        <LoadingIndicator showLabel label="Carregando percepções" />
      ) : (
        <>
          <Text style={styles.total}>
            {total}{" "}
            {total === 1 ? "avaliação aprovada" : "avaliações aprovadas"} nos
            últimos {summary.windowDays} dias
          </Text>
          {summary.distribution ? (
            <View style={styles.distribution}>
              {communityMoods.map((mood) => {
                const count = summary.distribution![mood],
                  percentage = Math.round((count / total) * 100);
                return (
                  <View
                    key={mood}
                    accessible
                    accessibilityLabel={`${mood}: ${count} avaliações, ${percentage} por cento`}
                    style={styles.moodRow}
                  >
                    <Text style={styles.mood}>{mood}</Text>
                    <View style={styles.track}>
                      <View
                        style={[
                          styles.bar,
                          {
                            width: `${percentage}%`,
                            backgroundColor: moodColors[mood],
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.count}>{count}</Text>
                  </View>
                );
              })}
            </View>
          ) : (
            <Text style={styles.note}>
              {total
                ? `A distribuição será mostrada a partir de ${summary.minimum} contribuições aprovadas no período.`
                : "Este lugar ainda não tem avaliações aprovadas neste período. Sua participação pode ajudar."}
            </Text>
          )}
          <Text style={styles.note}>
            São percepções da comunidade; não garantem segurança. Comentários e
            autoria ficam privados.
          </Text>
          <TouchFeedback
            label={
              method ? "Ocultar método do resumo" : "Como o resumo é calculado"
            }
            onPress={() => setMethod((value) => !value)}
          >
            <Text style={styles.action}>
              {method ? "Ocultar método" : "Como o resumo é calculado"}
            </Text>
          </TouchFeedback>
          {method && <Text style={styles.note}>{summary.method}</Text>}
        </>
      )}
      {!!onRefresh && (
        <TouchFeedback
          label="Atualizar avaliações"
          busy={refreshing}
          onPress={() => void refresh()}
        >
          <Text style={styles.action}>
            {refreshing ? "Atualizando…" : "Atualizar avaliações"}
          </Text>
        </TouchFeedback>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  section: {
    marginVertical: 14,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: palette.border,
    paddingTop: 14,
  },
  title: { fontSize: typography.input, fontWeight: "700", color: ui.text },
  total: {
    fontSize: typography.body,
    fontWeight: "600",
    lineHeight: 21,
    color: ui.text,
  },
  note: { fontSize: typography.secondary, lineHeight: 21, color: ui.muted },
  action: {
    color: colors.pink,
    fontSize: typography.secondary,
    lineHeight: 20,
    fontWeight: "700",
    flex: 1,
  },
  preview: {
    alignSelf: "stretch",
    minHeight: 44,
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: radius.medium,
    backgroundColor: glass.surfaceSoft,
    borderWidth: 1,
    borderColor: glass.tintedBorder,
    marginTop: 2,
  },
  previewRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  previewHint: {
    color: colors.wine,
    fontSize: typography.caption,
    fontWeight: "600",
  },
  distribution: { gap: 12 },
  moodRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  mood: { width: 72, fontSize: typography.secondary, color: ui.text },
  track: {
    flex: 1,
    height: 7,
    backgroundColor: palette.surfaceTint,
    borderRadius: radius.small,
    overflow: "hidden",
  },
  bar: { height: 7, borderRadius: radius.small },
  count: {
    width: 26,
    textAlign: "right",
    fontSize: typography.secondary,
    fontWeight: "600",
    color: ui.muted,
  },
});
