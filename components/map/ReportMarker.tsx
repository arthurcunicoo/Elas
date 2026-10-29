import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import Ionicons from "../icons/Ionicon";
import { palette, radius, typography } from "../../constants/theme";
import type { ReportMapNode } from "../../services/reports";
// Shared semantic symbol on web and native. Counts describe occurrences, not severity.
export const ReportMarker = memo(function ReportMarker({
  node,
  selected = false,
}: {
  node: ReportMapNode;
  selected?: boolean;
}) {
  const ink =
    node.report?.status === "pendente" ? palette.accent : palette.brand;
  return (
    <View
      pointerEvents="none"
      style={[
        styles.marker,
        { backgroundColor: ink },
        selected && styles.selected,
      ]}
    >
      <Ionicons
        name="document-text-outline"
        size={node.count > 1 ? 17 : 23}
        color={palette.surface}
      />
      {node.count > 1 && (
        <Text adjustsFontSizeToFit numberOfLines={1} style={styles.count}>
          {node.count.toLocaleString("pt-BR")}
        </Text>
      )}
    </View>
  );
});
const styles = StyleSheet.create({
  marker: {
    minWidth: 42,
    maxWidth: 70,
    height: 46,
    borderRadius: radius.medium,
    borderWidth: 2,
    borderColor: palette.surface,
    paddingHorizontal: 7,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: palette.text,
    shadowOpacity: 0.18,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  selected: { borderWidth: 4 },
  count: {
    color: palette.surface,
    fontSize: typography.caption,
    fontWeight: "800",
    lineHeight: 16,
  },
});
