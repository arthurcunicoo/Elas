import { StyleSheet, Text } from "react-native";
import { AppSheet } from "../../components/AppSheet";
import { TouchFeedback } from "../../components/TouchFeedback";
import { palette, radius, typography } from "../../constants/theme";
import type { ServiceArea } from "../../services/serviceAreas";
export function ServiceAreaSelector({
  visible,
  rows,
  selected,
  onChoose,
  onClose,
}: {
  visible: boolean;
  rows: ServiceArea[];
  selected: string;
  onChoose: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <AppSheet
      visible={visible}
      title="Escolher cidade"
      subtitle="Áreas disponíveis no ELAS"
      onClose={onClose}
    >
      {rows.map((area) => (
        <TouchFeedback
          key={area.id}
          label={`Explorar ${area.nome}, ${area.estado}`}
          selected={area.id === selected}
          onPress={() => {
            onChoose(area.id);
            onClose();
          }}
          style={[styles.row, area.id === selected && styles.active]}
        >
          <Text style={styles.title}>
            {area.nome} · {area.estado}
          </Text>
        </TouchFeedback>
      ))}
    </AppSheet>
  );
}
const styles = StyleSheet.create({
  row: {
    padding: 16,
    minHeight: 48,
    borderRadius: radius.medium,
    marginBottom: 8,
  },
  active: { backgroundColor: palette.surfaceTint },
  title: { color: palette.text, fontSize: typography.input, fontWeight: "600" },
});
