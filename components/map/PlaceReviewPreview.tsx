import { colors, glass, statusText, ui, palette, radius, typography } from "../../constants/theme";
import { CommunityReviewSummary } from "./CommunityReviewSummary";
import type { ReviewSummary } from "../../constants/community";
import { demoMode, showcaseEnabled } from "../../lib/appMode";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { listDemonstrations, ShowcaseRow } from "../../services/showcase";
import { useSession } from "../../features/auth/SessionProvider";
import { DemoLabel } from "../DemoLabel";
import { TouchFeedback } from "../TouchFeedback";

const moodColors: Record<string, string> = {
  Segura: statusText.safe,
  Moderada: statusText.moderate,
  Atenção: statusText.attention,
  Cuidado: statusText.danger,
};
export function PlaceReviewPreview({
  placeId,
  expanded,
  onExpand,
  summary,
  unavailable,
  onRefresh,
}: {
  placeId: string;
  expanded: boolean;
  onExpand: () => void;
  summary?: ReviewSummary;
  unavailable?: boolean;
  onRefresh?: (signal?: AbortSignal) => Promise<unknown>;
}) {
  const { session } = useSession();
  const userId = session?.user.id;
  const key = `${userId}:${placeId}`;
  const [state, setState] = useState<{
    key: string;
    rows: ShowcaseRow[];
    error: boolean;
  }>({ key, rows: [], error: false });
  useEffect(() => {
    if (!showcaseEnabled || !userId) return;
    let active = true;
    void listDemonstrations("avaliacao", placeId)
      .then((rows) => {
        if (active) setState({ key, rows, error: false });
      })
      .catch(() => {
        if (active) setState({ key, rows: [], error: true });
      });
    return () => {
      active = false;
    };
  }, [key, placeId, userId]);
  const rows = state.key === key ? state.rows : [];
  if (
    !showcaseEnabled ||
    unavailable ||
    (summary?.total ?? 0) > 0 ||
    !rows.length
  ) {
    if (demoMode) return null;
    return (
      <CommunityReviewSummary
        summary={summary}
        unavailable={unavailable}
        expanded={expanded}
        onExpand={onExpand}
        onRefresh={onRefresh}
      />
    );
  }
  if (!expanded)
    return (
      <TouchFeedback
        label={`Ver ${rows.length} avaliações de demonstração`}
        onPress={onExpand}
        style={styles.preview}
      >
        <View style={styles.previewRow}>
          <Text style={styles.previewText}>
            {rows.length} avaliações de demonstração
          </Text>
          <Text style={styles.previewHint}>Ver tudo ›</Text>
        </View>
      </TouchFeedback>
    );
  return (
    <View style={styles.section}>
      <View style={styles.heading}>
        <Text style={styles.title}>Avaliações</Text>
        <DemoLabel />
      </View>
      <Text style={styles.note}>
        Exemplos fictícios. Não representam a segurança ou a condição real deste
        lugar.
      </Text>
      {rows.map((row) => (
        <View key={row.id} style={styles.review}>
          <View style={styles.heading}>
            <Text style={styles.author}>{row.nome_exibicao}</Text>
            <Text
              style={[
                styles.mood,
                { color: moodColors[row.sentimento ?? ""] ?? colors.wine },
              ]}
            >
              {row.sentimento}
            </Text>
          </View>
          <Text style={styles.body}>{row.descricao}</Text>
        </View>
      ))}
    </View>
  );
}
const styles = StyleSheet.create({
  section: { marginVertical: 14, gap: 9 },
  heading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    flexWrap: "wrap",
  },
  title: { color: ui.text, fontSize: typography.input, fontWeight: "700" },
  note: { color: ui.muted, fontSize: typography.caption, lineHeight: 18 },
  review: {
    padding: 12,
    borderRadius: radius.medium,
    backgroundColor: glass.surface,
    borderWidth: 1,
    borderColor: glass.border,
    gap: 6,
  },
  author: { color: ui.muted, fontSize: typography.caption },
  mood: { fontSize: typography.caption, fontWeight: "700" },
  body: { color: ui.text, fontSize: typography.secondary, lineHeight: 20 },
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
  previewText: {
    color: colors.pink,
    fontSize: typography.secondary,
    lineHeight: 20,
    fontWeight: "700",
    flex: 1,
  },
  previewHint: {
    color: colors.wine,
    fontSize: typography.caption,
    fontWeight: "600",
  },
});
