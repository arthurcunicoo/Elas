import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { palette, typography } from "../../constants/theme";
import { CityPulse } from "./CityPulse";

/** Compact version for searches/pagination; leaves the existing content in place. */
export function LoadingIndicator({
  label = "Carregando",
  showLabel = false,
  tone = "brand",
  active = true,
  style,
}: {
  label?: string;
  showLabel?: boolean;
  tone?: "brand" | "light";
  active?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityState={{ busy: true }}
      accessibilityLiveRegion="polite"
      style={[styles.row, style]}
    >
      <CityPulse compact active={active} tone={tone} />
      {showLabel && (
        <Text
          style={[styles.label, tone === "light" && { color: palette.surface }]}
        >
          {label}
        </Text>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  label: {
    color: palette.muted,
    fontSize: typography.secondary,
    flexShrink: 1,
  },
});
