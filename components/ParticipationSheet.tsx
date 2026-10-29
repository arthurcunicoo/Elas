import { cardShadow, colors, glass, ui, radius, typography } from "../constants/theme";
import { StyleSheet, Text, View } from "react-native";
import Ionicons from "./icons/Ionicon";
import { AppSheet } from "./AppSheet";
import { TouchFeedback } from "./TouchFeedback";

export function ParticipationSheet({
  visible,
  placeName,
  onClose,
  onChoose,
}: {
  visible: boolean;
  placeName?: string;
  onClose: () => void;
  onChoose: (kind: "review" | "report") => void;
}) {
  return (
    <AppSheet
      visible={visible}
      title="Como você quer participar?"
      subtitle={placeName ?? "Sua voz ajuda a transformar a cidade"}
      onClose={onClose}
    >
      <View style={styles.options}>
        <TouchFeedback
          label="Avaliar um lugar"
          onPress={() => onChoose("review")}
          style={styles.option}
        >
          <View style={styles.icon}>
            <Ionicons name="heart-outline" color={colors.pink} size={25} />
          </View>
          <View style={styles.body}>
            <Text style={styles.title}>Avaliar um lugar</Text>
            <Text style={styles.note}>
              Conte como você se sente nesse espaço.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.pink} />
        </TouchFeedback>
        <TouchFeedback
          label="Relatar uma situação"
          onPress={() => onChoose("report")}
          style={styles.option}
        >
          <View style={styles.icon}>
            <Ionicons name="megaphone-outline" color={colors.pink} size={25} />
          </View>
          <View style={styles.body}>
            <Text style={styles.title}>Relatar uma situação</Text>
            <Text style={styles.note}>
              Registre algo que precisa de atenção.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.pink} />
        </TouchFeedback>
      </View>
    </AppSheet>
  );
}
const styles = StyleSheet.create({
  options: { gap: 12 },
  option: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    padding: 16,
    borderRadius: radius.large,
    backgroundColor: glass.surface,
    borderWidth: 1,
    borderColor: glass.tintedBorder,
    minHeight: 96,
    ...cardShadow,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: radius.medium,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: glass.surfaceSoft,
    borderWidth: 1,
    borderColor: glass.tintedBorder,
    flexShrink: 0,
  },
  body: { flex: 1, minWidth: 0 },
  title: {
    fontSize: typography.input,
    lineHeight: 23,
    fontWeight: "700",
    color: ui.text,
  },
  note: {
    fontSize: typography.secondary,
    lineHeight: 21,
    color: ui.muted,
    marginTop: 3,
  },
});
