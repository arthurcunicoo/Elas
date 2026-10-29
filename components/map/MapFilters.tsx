import { colors, glass, glassPanel, radius, typography } from "../../constants/theme";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import Ionicons from "../icons/Ionicon";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CategoryId, placeCategories } from "../../constants/placeCategories";
import { TouchFeedback } from "../TouchFeedback";
import { useReducedMotion } from "../../hooks/useReducedMotion";
export type MapFilter = CategoryId;
export function MapFilters({
  visible,
  value,
  counts,
  onChange,
  onClose,
}: {
  visible: boolean;
  value: MapFilter;
  counts: Partial<Record<CategoryId, number>>;
  onChange: (value: MapFilter) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets(),
    reduced = useReducedMotion(),
    { height } = useWindowDimensions();
  return (
    <Modal
      transparent
      visible={visible}
      animationType={reduced ? "none" : "slide"}
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel="Fechar filtros"
        />
        <View
          accessibilityViewIsModal
          style={[styles.sheet, { paddingBottom: insets.bottom + 22 }]}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={[styles.title, { flex: 1 }]}>Filtrar locais</Text>
            <TouchFeedback
              label="Fechar filtros"
              onPress={onClose}
              style={{
                width: 48,
                minHeight: 48,
                alignItems: "center",
                flexShrink: 0,
              }}
            >
              <Ionicons name="close" size={24} color={colors.pink} />
            </TouchFeedback>
          </View>
          <Text style={styles.subtitle}>
            Categorias dos locais na área visível. Não indicam segurança.
          </Text>
          <ScrollView
            style={{
              maxHeight: Math.max(
                100,
                height - insets.top - insets.bottom - 190,
              ),
            }}
          >
            {placeCategories.map((option) => (
              <TouchFeedback
                key={option.id}
                label={`${option.label}, ${counts[option.id] ?? 0} locais nesta área`}
                selected={value === option.id}
                onPress={() => {
                  onChange(option.id);
                  onClose();
                }}
                style={[
                  styles.option,
                  value === option.id && { backgroundColor: colors.cream },
                ]}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <Ionicons name={option.icon} size={22} color={option.color} />
                  <Text style={[styles.label, { flex: 1 }]}>
                    {option.label}
                  </Text>
                  <Text style={styles.label}>
                    {counts[option.id] ?? 0}
                    {value === option.id ? "  ✓" : ""}
                  </Text>
                </View>
              </TouchFeedback>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: glass.overlay,
    justifyContent: "flex-end",
  },
  sheet: {
    ...glassPanel,
    borderTopLeftRadius: radius.large,
    borderTopRightRadius: radius.large,
    padding: 24,
  },
  title: { fontSize: typography.page, fontWeight: "700", color: colors.wine },
  subtitle: {
    color: colors.wine,
    marginTop: 8,
    marginBottom: 10,
    fontSize: typography.secondary,
  },
  option: {
    minHeight: 48,
    borderRadius: radius.medium,
    paddingHorizontal: 14,
    marginTop: 5,
  },
  label: { color: colors.pink, fontSize: typography.input, fontWeight: "600" },
});
