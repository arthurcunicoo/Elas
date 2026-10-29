import { cardSurface, colors, fonts, glass, radius, typography, ui } from "../constants/theme";
import { StyleSheet, Text, View } from "react-native";
import MaterialCommunityIcons from "./icons/CommunityIcon";

import { Achievement, achievements } from "../constants/achievements";
import { AchievementProgressBar } from "./AchievementProgressBar";
import { TouchFeedback } from "./TouchFeedback";
export function AchievementCard({
  onMore,
  count,
  items = achievements,
}: {
  count?: number | null;
  items?: readonly Achievement[];
  onMore: () => void;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <Text accessibilityRole="header" style={styles.heading}>
          Conquistas
        </Text>
        <View style={styles.summary}>
          <Text style={styles.number}>
            {count === undefined ? 7 : (count ?? "—")}
          </Text>
          <Text style={styles.reviews}>avaliações</Text>
        </View>
      </View>
      {items
        .filter((item) => !item.completed)
        .slice(0, 2)
        .map((item) => (
          <View key={item.title} style={styles.row}>
            <View style={styles.iconBadge}>
              <MaterialCommunityIcons
                name={item.icon}
                size={24}
                color={item.color}
              />
            </View>
            <View style={styles.detail}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.description}>{item.description}</Text>
              <AchievementProgressBar
                compact
                value={item.value}
                total={item.total}
              />
            </View>
          </View>
        ))}
      <TouchFeedback
        label="Ver todas as conquistas"
        onPress={onMore}
        style={styles.more}
      >
        <Text style={styles.moreText}>Ver todas as conquistas ›</Text>
      </TouchFeedback>
    </View>
  );
}
const styles = StyleSheet.create({
  card: { ...cardSurface, padding: 18 },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
    marginBottom: 14,
  },
  summary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: glass.surfaceSoft,
    borderWidth: 1,
    borderColor: glass.tintedBorder,
    borderRadius: radius.pill,
    paddingHorizontal: 11,
    paddingVertical: 4,
  },
  number: {
    color: colors.wine,
    fontFamily: fonts.display,
    fontSize: typography.input,
    fontWeight: "800",
  },
  reviews: {
    color: colors.wine,
    fontFamily: fonts.sans,
    fontSize: typography.caption,
    fontWeight: "600",
  },
  heading: {
    color: ui.text,
    fontFamily: fonts.display,
    fontSize: typography.section,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: radius.medium,
    backgroundColor: glass.surfaceSoft,
    borderWidth: 1,
    borderColor: glass.tintedBorder,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  detail: { flex: 1, minWidth: 0 },
  title: {
    color: ui.text,
    fontFamily: fonts.display,
    fontSize: typography.card,
    lineHeight: 20,
    fontWeight: "700",
  },
  description: {
    color: ui.muted,
    fontFamily: fonts.sans,
    fontSize: typography.caption,
    lineHeight: 18,
    marginTop: 1,
  },
  more: {
    alignSelf: "stretch",
    minHeight: 44,
    marginTop: 2,
    paddingHorizontal: 14,
    borderRadius: radius.medium,
    backgroundColor: glass.surfaceSoft,
    borderWidth: 1,
    borderColor: glass.tintedBorder,
  },
  moreText: {
    color: colors.pink,
    fontFamily: fonts.display,
    fontSize: typography.secondary,
    fontWeight: "700",
    textAlign: "center",
  },
});
