import { StyleSheet, View } from "react-native";
import { palette, radius } from "../../constants/theme";
// Static placeholders leave the single compact CityPulse as the motion cue.
export function ListSkeleton({
  variant = "cards",
}: {
  variant?: "cards" | "places" | "notifications";
}) {
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={styles.list}
    >
      {[0, 1, 2].map((index) => (
        <View key={index} style={styles.card}>
          {variant !== "cards" && (
            <View
              style={[
                styles.icon,
                variant === "notifications" && styles.roundIcon,
              ]}
            />
          )}
          <View style={styles.lines}>
            <View style={styles.title} />
            <View style={styles.line} />
            {variant === "cards" && <View style={styles.short} />}
          </View>
        </View>
      ))}
    </View>
  );
}
const styles = StyleSheet.create({
  list: { width: "100%", gap: 12 },
  card: {
    padding: 16,
    borderRadius: radius.large,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    flexDirection: "row",
    gap: 12,
  },
  roundIcon: { borderRadius: radius.pill },
  icon: {
    width: 40,
    height: 40,
    borderRadius: radius.medium,
    backgroundColor: palette.surfaceTint,
  },
  lines: { flex: 1, gap: 9 },
  title: {
    height: 16,
    width: "65%",
    borderRadius: radius.small,
    backgroundColor: palette.border,
  },
  line: {
    height: 12,
    width: "100%",
    borderRadius: radius.small,
    backgroundColor: palette.background,
  },
  short: {
    height: 12,
    width: "80%",
    borderRadius: radius.small,
    backgroundColor: palette.background,
  },
});
