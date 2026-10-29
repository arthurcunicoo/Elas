import { statusText, palette, typography } from "../../constants/theme";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";

import { TouchFeedback } from "../TouchFeedback";
const moods = [
  {
    label: "Segura",
    textColor: statusText.safe,
    color: palette.successFill,
    mouth: "happy",
  },
  {
    label: "Moderada",
    textColor: statusText.moderate,
    color: palette.warningFill,
    mouth: "neutral",
  },
  {
    label: "Atenção",
    textColor: statusText.attention,
    color: palette.attentionFill,
    mouth: "sad",
  },
  {
    label: "Cuidado",
    textColor: statusText.danger,
    color: palette.dangerFill,
    mouth: "open",
  },
] as const;
export function MoodSelector({
  value,
  onChange,
  disabled = false,
}: {
  value: string | null;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  const { width, fontScale } = useWindowDimensions();
  const compact = width < 350 || fontScale >= 1.3;
  return (
    <View style={[styles.row, compact && { flexWrap: "wrap", rowGap: 14 }]}>
      {moods.map((mood) => (
        <TouchFeedback
          disabled={disabled}
          key={mood.label}
          label={mood.label}
          selected={value === mood.label}
          spring
          onPress={() => onChange(mood.label)}
          style={[
            styles.option,
            compact && { flexBasis: "50%", flexGrow: 0, flexShrink: 0 },
          ]}
        >
          <View
            style={[
              styles.ring,
              {
                borderColor: value === mood.label ? mood.color : "transparent",
              },
            ]}
          >
            <View style={[styles.face, { backgroundColor: mood.color }]}>
              <View style={styles.eyes}>
                <View style={styles.eye} />
                <View style={styles.eye} />
              </View>
              <View
                style={[
                  styles.mouth,
                  mood.mouth === "happy"
                    ? styles.happy
                    : mood.mouth === "neutral"
                      ? styles.neutral
                      : mood.mouth === "sad"
                        ? styles.sad
                        : styles.open,
                ]}
              />
            </View>
          </View>
          <Text style={[styles.label, { color: mood.textColor }]}>
            {mood.label}
          </Text>
        </TouchFeedback>
      ))}
    </View>
  );
}
const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
    marginBottom: 18,
  },
  option: { flex: 1 },
  ring: { alignSelf: "center", padding: 3, borderWidth: 2, borderRadius: 40 },
  face: {
    width: 53,
    height: 53,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
  },
  eyes: { flexDirection: "row", gap: 13, marginBottom: 6 },
  eye: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: palette.warningTint,
  },
  mouth: { borderColor: palette.warningTint },
  happy: {
    width: 19,
    height: 10,
    backgroundColor: palette.warningTint,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  neutral: {
    width: 18,
    height: 3,
    backgroundColor: palette.warningTint,
    borderRadius: 2,
  },
  sad: {
    width: 18,
    height: 10,
    borderTopWidth: 3,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  open: {
    width: 17,
    height: 10,
    backgroundColor: palette.warningTint,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  label: {
    fontSize: typography.secondary,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 8,
  },
});
