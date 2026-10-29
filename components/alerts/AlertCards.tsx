import { fonts, glass, ui, typography, cardSurface, palette, radius } from "../../constants/theme";
import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import Ionicons from "../icons/Ionicon";

import { TouchFeedback } from "../TouchFeedback";
import { Report } from "../../services/reports";
import { displayTime } from "../../lib/displayTime";
export const alertColors = {
  pink: ui.action,
  text: ui.text,
  muted: ui.muted,
  red: palette.error,
};
export const CriticalAlertCard = memo(function CriticalAlertCard({
  report,
  onMap,
}: {
  report: Report;
  onMap: () => void;
}) {
  return (
    <View style={styles.critical}>
      <View style={styles.metaRow}>
        <Text style={styles.criticalTitle}>{report.demonstracao ? "DEMONSTRAÇÃO" : "Relato mais recente"}</Text>
        <Text style={styles.time}>{displayTime(report.criado_em)}</Text>
      </View>
      <View style={styles.address}>
        <Text style={styles.name}>{report.local_texto}</Text>
        <Text style={styles.subtitle}>{report.categoria}</Text>
      </View>
      <View style={styles.reasons}>
        <View style={styles.reason}>
          <View style={styles.badge}>
            <Ionicons name="megaphone-outline" size={15} color="white" />
          </View>
          <Text style={styles.reasonText} numberOfLines={3}>
            {report.descricao}
          </Text>
        </View>
        <View style={styles.verification}>
          <Ionicons
            name={
              report.status === "pendente"
                ? "time-outline"
                : "checkmark-circle-outline"
            }
            size={16}
            color={
              report.status === "pendente" ? palette.accent : palette.success
            }
          />
          <Text
            style={[
              styles.subtitle,
              {
                color:
                  report.status === "pendente"
                    ? palette.accent
                    : palette.success,
              },
            ]}
          >
            {report.demonstracao ? "Exemplo fictício · sem verificação real" : report.status === "pendente"
              ? "Aguardando verificação"
              : "Relato verificado pela equipe"}
          </Text>
        </View>
      </View>
      {
        <TouchFeedback
          label={`${report.demonstracao ? "Ver local do exemplo" : "Abrir relato"} de ${report.local_texto}`}
          onPress={onMap}
          style={styles.button}
          spring
        >
          <Text style={styles.buttonText}>{report.demonstracao ? "Ver local do exemplo" : "Abrir relato"}</Text>
        </TouchFeedback>
      }
    </View>
  );
});
export const AlertLocationCard = memo(function AlertLocationCard({
  report,
  onPress,
}: {
  report: Report;
  onPress: () => void;
}) {
  return (
    <TouchFeedback
      label={`${report.demonstracao ? "Demonstração. " : ""}${report.local_texto}, ${report.categoria}. ${report.demonstracao ? "Exemplo fictício" : report.status === "pendente" ? "Pendente" : "Verificado"}`}
      onPress={onPress}
      style={styles.location}
      spring
      pressedScale={0.98}
    >
      <View style={styles.locationRow}>
        <View style={styles.locationIcon}>
          <Ionicons name="location-outline" size={24} color={ui.action} />
        </View>
        <View style={styles.locationText}>
          <Text style={styles.locationName} numberOfLines={2}>
            {report.local_texto}
          </Text>
          <Text style={styles.description}>{report.categoria}</Text>
          <Text
            style={[
              styles.attention,
              {
                color:
                  report.status === "pendente"
                    ? palette.accent
                    : palette.success,
              },
            ]}
          >
            {report.demonstracao ? "Exemplo fictício · sem verificação real" : report.status === "pendente"
              ? "Aguardando verificação"
              : "Verificado"}
            {report.latitude == null ? " · sem ponto no mapa" : ""}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={ui.muted} />
      </View>
    </TouchFeedback>
  );
});
const styles = StyleSheet.create({
  critical: { ...cardSurface },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    flexWrap: "wrap",
  },
  time: { fontSize: typography.caption, color: ui.muted },
  verification: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  criticalTitle: {
    fontFamily: fonts.display,
    fontSize: typography.caption,
    fontWeight: "800",
    color: ui.action,
    backgroundColor: glass.surfaceSoft,
    borderWidth: 1,
    borderColor: glass.tintedBorder,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  address: { marginTop: 16 },
  name: {
    fontFamily: fonts.display,
    fontSize: 19,
    lineHeight: 25,
    fontWeight: "800",
    letterSpacing: -0.3,
    color: alertColors.text,
  },
  subtitle: {
    fontSize: typography.secondary,
    lineHeight: 19,
    color: alertColors.muted,
  },
  reasons: { marginTop: 18, gap: 14, marginBottom: 18 },
  reason: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  badge: {
    width: 28,
    height: 28,
    flexShrink: 0,
    borderRadius: radius.medium,
    backgroundColor: ui.action,
    alignItems: "center",
    justifyContent: "center",
  },
  reasonText: {
    flex: 1,
    fontSize: typography.body,
    lineHeight: 21,
    color: alertColors.text,
  },
  button: {
    minHeight: 46,
    borderRadius: radius.pill,
    backgroundColor: ui.action,
    shadowColor: alertColors.pink,
    shadowOpacity: 0.24,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  buttonText: {
    textAlign: "center",
    paddingVertical: 8,
    color: "white",
    fontSize: typography.body,
    fontWeight: "600",
  },
  location: { ...cardSurface, minHeight: 76 },
  locationIcon: {
    width: 40,
    height: 40,
    flexShrink: 0,
    borderRadius: radius.medium,
    backgroundColor: palette.surfaceTint,
    alignItems: "center",
    justifyContent: "center",
  },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  locationText: { flex: 1, minWidth: 0 },
  locationName: {
    fontSize: typography.card,
    lineHeight: 21,
    fontWeight: "600",
    color: alertColors.text,
  },
  description: {
    fontSize: typography.caption,
    color: alertColors.muted,
    marginTop: 1,
  },
  attention: {
    fontSize: typography.caption,
    color: palette.error,
    marginTop: 2,
  },
});
