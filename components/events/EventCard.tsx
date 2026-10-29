import { useServiceTimeZone } from "../../hooks/useServiceTimeZone";
import { cardSurface, colors, fonts, glass, ui, statusText, palette, radius, typography } from "../../constants/theme";
import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import Ionicons from "../icons/Ionicon";
import { DemoLabel } from "../DemoLabel";
import { TouchFeedback } from "../TouchFeedback";

import { eventSchedule } from "../../lib/eventPresentation";
export const EventCard = memo(function EventCard({
  event,
  demonstration = false,
  onOpen,
  registered = false,
  closed = false,
  cancelled = false,
}: {
  event: {
    title: string;
    description: string;
    date: string;
    startsAt?: string;
    place?: string;
  };
  onOpen: () => void;
  registered?: boolean;
  demonstration?: boolean;
  closed?: boolean;
  cancelled?: boolean;
}) {
  const timeZone = useServiceTimeZone();
  const schedule = eventSchedule(event.startsAt ?? "", event.date, timeZone);
  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <View style={styles.dateTile}>
          {schedule.day ? (
            <>
              <Text style={styles.month}>{schedule.month}</Text>
              <Text style={styles.day}>{schedule.day}</Text>
            </>
          ) : (
            <Ionicons name="calendar-outline" size={28} color={colors.pink} />
          )}
        </View>
        <View style={styles.body}>
          {demonstration && (
            <View style={styles.badge}>
              <DemoLabel />
            </View>
          )}
          <Text style={styles.title} numberOfLines={3}>
            {event.title}
          </Text>
          <Text style={styles.date}>
            {schedule.day
              ? `${schedule.date} · ${schedule.time}`
              : schedule.date}
          </Text>
        </View>
      </View>
      {!!event.place && (
        <View style={styles.placeRow}>
          <Ionicons name="location-outline" size={17} color={ui.muted} />
          <Text style={styles.place} numberOfLines={2}>
            {event.place}
          </Text>
        </View>
      )}
      <Text style={styles.description} numberOfLines={2}>
        {event.description}
      </Text>
      {(registered || closed) && (
        <Text
          style={[
            styles.status,
            { color: registered && !closed ? statusText.safe : ui.muted },
          ]}
        >
          {cancelled
            ? "Evento cancelado"
            : closed
              ? "Evento encerrado"
              : "Você está inscrita"}
          {closed && registered ? " · Você estava inscrita" : ""}
        </Text>
      )}
      <TouchFeedback
        label={`${demonstration ? "Ver exemplo" : "Ver detalhes"}: ${event.title}`}
        onPress={onOpen}
        style={styles.action}
      >
        <Text style={styles.actionText}>
          {demonstration ? "Ver exemplo" : "Ver detalhes"}
        </Text>
        <Ionicons name="arrow-forward" size={20} color={colors.pink} />
      </TouchFeedback>
    </View>
  );
});
const styles = StyleSheet.create({
  card: { ...cardSurface },
  top: { flexDirection: "row", alignItems: "flex-start", gap: 14 },
  dateTile: {
    width: 62,
    minHeight: 74,
    flexShrink: 0,
    borderRadius: radius.large,
    backgroundColor: glass.surfaceSoft,
    borderWidth: 1,
    borderColor: glass.tintedBorder,
    alignItems: "center",
    justifyContent: "center",
    gap: 1,
  },
  month: {
    fontSize: typography.caption,
    lineHeight: 16,
    letterSpacing: 1,
    color: colors.pink,
    fontWeight: "700",
  },
  day: { fontFamily: fonts.display, fontSize: 29, lineHeight: 34, fontWeight: "800", color: colors.wine },
  body: { flex: 1, minWidth: 0 },
  badge: { marginBottom: 7 },
  title: { fontFamily: fonts.display, fontSize: 17, lineHeight: 23, fontWeight: "800", letterSpacing: -0.3, color: ui.text },
  date: {
    fontSize: typography.caption,
    lineHeight: 19,
    color: ui.muted,
    marginTop: 6,
  },
  placeRow: {
    flexDirection: "row",
    gap: 6,
    alignItems: "flex-start",
    marginTop: 15,
  },
  place: {
    flex: 1,
    minWidth: 0,
    fontSize: typography.secondary,
    lineHeight: 19,
    color: ui.muted,
  },
  description: {
    color: ui.muted,
    fontSize: typography.body,
    lineHeight: 22,
    marginTop: 10,
  },
  status: {
    fontSize: typography.secondary,
    lineHeight: 20,
    fontWeight: "600",
    marginTop: 10,
  },
  action: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: palette.border,
    marginTop: 14,
    paddingTop: 6,
  },
  actionText: {
    color: colors.pink,
    fontSize: typography.card,
    fontWeight: "700",
  },
});
