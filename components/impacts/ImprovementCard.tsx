import { cardSurface, ui, palette, radius, typography } from "../../constants/theme";
import { impactStatus, type ImpactStatus } from "../../constants/impactStatus";
import { memo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Ionicons from "../icons/Ionicon";

import { ProfileDialog } from "../ProfileDialog";
import { TouchFeedback } from "../TouchFeedback";
export type Improvement = {
  title: string;
  description: string;
  status: ImpactStatus;
  propria?: boolean;
  demonstracao?: boolean;
};
export const ImprovementCard = memo(function ImprovementCard({ item }: { item: Improvement }) {
  const [open, setOpen] = useState(false);
  const { label, ink, tint } = impactStatus[item.status];
  const scope = item.demonstracao
    ? "Exemplo fictício"
    : item.propria
      ? "Sua solicitação"
      : "Melhoria pública da cidade";
  return (
    <>
      <TouchFeedback
        label={`${item.title}. ${item.description}. ${label}. ${scope}`}
        onPress={() => setOpen(true)}
        pressedScale={0.98}
        style={styles.card}
      >
        <View style={styles.row}>
          <View style={[styles.icon, { backgroundColor: tint }]}>
            <Ionicons
              name={
                item.status === "concluida"
                  ? "checkmark-done-outline"
                  : "megaphone-outline"
              }
              size={21}
              color={ink}
            />
          </View>
          <Text style={styles.title}>{item.title}</Text>
          <Ionicons name="chevron-forward" size={18} color={palette.muted} />
        </View>
        <Text style={styles.scope}>{scope}</Text>
        <Text numberOfLines={2} style={styles.description}>
          {item.description}
        </Text>
        <View style={[styles.status, { backgroundColor: tint }]}>
          <Text style={[styles.statusText, { color: ink }]}>{label}</Text>
        </View>
      </TouchFeedback>
      <ProfileDialog
        notice={
          open
            ? {
                title: item.title,
                message: `${scope}\n\n${item.description}\n\nStatus: ${label}.${!item.demonstracao && item.propria && item.status === "solicitada" ? " Sua solicitação está visível apenas para você e para a equipe." : ""}`,
              }
            : null
        }
        onClose={() => setOpen(false)}
      />
    </>
  );
});
const styles = StyleSheet.create({
  card: { ...cardSurface },
  row: { flexDirection: "row", gap: 12, alignItems: "center" },
  icon: {
    width: 40,
    height: 40,
    flexShrink: 0,
    borderRadius: radius.medium,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    flex: 1,
    minWidth: 0,
    fontSize: typography.input,
    lineHeight: 22,
    fontWeight: "700",
    color: ui.text,
  },
  scope: { color: ui.muted, fontSize: typography.caption, fontWeight: "600" },
  description: { fontSize: typography.body, lineHeight: 22, color: ui.muted },
  status: {
    alignSelf: "flex-start",
    borderRadius: radius.medium,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusText: {
    fontSize: typography.caption,
    lineHeight: 18,
    fontWeight: "600",
  },
});
