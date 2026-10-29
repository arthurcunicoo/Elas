import { useServiceTimeZone } from "../../hooks/useServiceTimeZone";
import { PrimaryButton } from "../shared/Buttons";
import { colors, glass, ui, statusText, palette, radius, typography } from "../../constants/theme";
import { StyleSheet, Text, View } from "react-native";
import Ionicons from "../icons/Ionicon";
import { AppSheet } from "../AppSheet";
import { DemoLabel } from "../DemoLabel";

import { eventSchedule } from "../../lib/eventPresentation";
export type EventDetailsItem = {
  id: string;
  titulo: string;
  descricao: string;
  local_texto: string;
  inicia_em: string;
  dateLabel?: string;
  demonstracao?: boolean;
  inscrito: boolean;
  cancelado: boolean;
};
export function EventDetailsSheet({
  event,
  onClose,
  onParticipate,
  busy = false,
  error = "",
}: {
  event: EventDetailsItem | null;
  onClose: () => void;
  onParticipate: () => void;
  busy?: boolean;
  error?: string;
}) {
  const timeZone = useServiceTimeZone();
  const schedule = eventSchedule(event?.inicia_em ?? "", event?.dateLabel, timeZone);
  const closed =
    !!event &&
    (event.cancelado ||
      (!!event.inicia_em && new Date(event.inicia_em).getTime() <= Date.now()));
  const label = event?.demonstracao
    ? "Fechar exemplo"
    : busy
      ? "Enviando…"
      : event?.inscrito
        ? "Cancelar inscrição"
        : closed
          ? "Evento encerrado"
          : "Quero participar";
  return (
    <AppSheet
      visible={!!event}
      title="Detalhes do evento"
      icon="calendar-outline"
      onClose={onClose}
      dismissible={!busy}
      footer={
        <>
          {!!error && (
            <Text accessibilityRole="alert" style={styles.error}>
              {error}
            </Text>
          )}
          <PrimaryButton
            title={label}
            onPress={event?.demonstracao ? onClose : onParticipate}
            disabled={!event?.demonstracao && closed && !event?.inscrito}
            busy={busy}
          />
        </>
      }
    >
      {!!event && (
        <View style={styles.content}>
          {!!event.demonstracao && <DemoLabel />}
          <Text accessibilityRole="header" style={styles.title}>
            {event.titulo}
          </Text>
          <View style={styles.details}>
            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <Ionicons
                  name="calendar-outline"
                  size={22}
                  color={colors.pink}
                />
              </View>
              <View style={styles.detailText}>
                <Text style={styles.detailLabel}>Quando</Text>
                <Text style={styles.detailValue}>
                  {schedule.date || "Data a confirmar"}
                </Text>
                {!!schedule.time && (
                  <Text style={styles.detailNote}>
                    Às {schedule.time} · horário de Brasília
                  </Text>
                )}
              </View>
            </View>
            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <Ionicons
                  name="location-outline"
                  size={22}
                  color={colors.pink}
                />
              </View>
              <View style={styles.detailText}>
                <Text style={styles.detailLabel}>Onde</Text>
                <Text style={styles.detailValue}>
                  {event.local_texto || "Local a confirmar"}
                </Text>
              </View>
            </View>
          </View>
          <View>
            <Text style={styles.sectionTitle}>Sobre o encontro</Text>
            <Text style={styles.description}>{event.descricao}</Text>
          </View>
          {!!event.demonstracao && (
            <View style={styles.info}>
              <Ionicons
                name="information-circle-outline"
                size={22}
                color={colors.wine}
              />
              <Text style={styles.infoText}>
                Este evento é um exemplo. A data e a programação são fictícias;
                não há inscrição ou encontro confirmado.
              </Text>
            </View>
          )}
          {!event.demonstracao && (event.inscrito || closed) && (
            <View style={styles.info}>
              <Ionicons
                name={closed ? "time-outline" : "checkmark-circle-outline"}
                size={22}
                color={closed ? ui.muted : statusText.safe}
              />
              <Text
                accessibilityLiveRegion="polite"
                style={[
                  styles.infoText,
                  { color: closed ? ui.muted : statusText.safe },
                ]}
              >
                {event.cancelado
                  ? "Este evento foi cancelado."
                  : closed
                    ? "Este evento já foi encerrado."
                    : "Sua inscrição está confirmada. Você pode cancelá-la por aqui."}
              </Text>
            </View>
          )}
        </View>
      )}
    </AppSheet>
  );
}
const styles = StyleSheet.create({
  content: { gap: 22 },
  title: { fontSize: 24, lineHeight: 31, fontWeight: "700", color: ui.text },
  details: {
    padding: 16,
    gap: 20,
    backgroundColor: glass.surface,
    borderWidth: 1,
    borderColor: glass.tintedBorder,
    borderRadius: radius.large,
  },
  detailRow: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  detailIcon: {
    width: 32,
    minHeight: 38,
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  detailText: { flex: 1, minWidth: 0 },
  detailLabel: {
    color: ui.muted,
    fontSize: typography.caption,
    lineHeight: 18,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: typography.card,
    lineHeight: 22,
    color: ui.text,
    fontWeight: "600",
  },
  detailNote: {
    fontSize: typography.caption,
    lineHeight: 19,
    color: ui.muted,
    marginTop: 3,
  },
  sectionTitle: {
    fontSize: typography.input,
    lineHeight: 23,
    fontWeight: "700",
    color: ui.text,
  },
  description: {
    fontSize: typography.card,
    lineHeight: 24,
    color: ui.muted,
    marginTop: 8,
  },
  info: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderRadius: radius.medium,
    backgroundColor: colors.cream,
    padding: 15,
  },
  infoText: {
    flex: 1,
    minWidth: 0,
    fontSize: typography.secondary,
    lineHeight: 21,
    color: colors.wine,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    minHeight: 54,
    borderRadius: radius.medium,
    backgroundColor: colors.pink,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  buttonText: {
    color: colors.white,
    fontSize: typography.input,
    fontWeight: "700",
    textAlign: "center",
  },
  error: {
    color: palette.error,
    fontSize: typography.secondary,
    lineHeight: 20,
  },
});
