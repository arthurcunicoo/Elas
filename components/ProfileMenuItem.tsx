import { colors, glass, ui, palette, radius, typography } from "../constants/theme";
import { ComponentProps, memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import Ionicons from "./icons/Ionicon";
import { TouchFeedback } from "./TouchFeedback";

export const ProfileMenuItem = memo(function ProfileMenuItem({
  title,
  icon,
  onPress,
  badge,
  last = false,
}: {
  title: string;
  icon: ComponentProps<typeof Ionicons>["name"];
  onPress: () => void;
  badge?: number | null;
  last?: boolean;
}) {
  return (
    <TouchFeedback
      label={badge ? `${title}, ${badge} não lidas` : title}
      onPress={onPress}
      style={styles.card}
    >
      <View style={[styles.row, !last && styles.divider]}>
        <View style={styles.icon}>
          <Ionicons name={icon} size={20} color={colors.pink} />
        </View>
        <Text style={styles.text}>{title}</Text>
        {!!badge && (
          <Text style={styles.badge}>{badge > 99 ? "99+" : badge}</Text>
        )}
        <Ionicons name="chevron-forward" size={18} color={ui.muted} />
      </View>
    </TouchFeedback>
  );
});
const styles = StyleSheet.create({
  card: { minHeight: 56, backgroundColor: "transparent" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  divider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.border,
  },
  icon: {
    width: 38,
    height: 38,
    flexShrink: 0,
    borderRadius: radius.medium,
    backgroundColor: glass.surfaceSoft,
    borderWidth: 1,
    borderColor: glass.tintedBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    flex: 1,
    minWidth: 0,
    color: ui.text,
    fontSize: typography.card,
    lineHeight: 21,
    fontWeight: "500",
  },
  badge: {
    color: colors.pink,
    backgroundColor: glass.surfaceSoft,
    borderWidth: 1,
    borderColor: glass.tintedBorder,
    borderRadius: radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 3,
    fontSize: typography.caption,
    fontWeight: "700",
  },
});
