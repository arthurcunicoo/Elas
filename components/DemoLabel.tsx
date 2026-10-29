import { colors, radius, typography } from "../constants/theme";
import { StyleSheet, Text, View } from "react-native";

export function DemoLabel() {
  return (
    <View style={styles.badge}>
      <Text style={styles.text}>DEMONSTRAÇÃO</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    borderRadius: radius.small,
    paddingVertical: 4,
    paddingHorizontal: 7,
    backgroundColor: colors.cream,
  },
  text: {
    color: colors.wine,
    fontSize: typography.caption,
    lineHeight: 18,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});
