import { ScrollView, StyleSheet, Text, View } from "react-native";
import { palette, radius, typography } from "../../constants/theme";
import { Field, shared } from "../../components/shared/FeaturePage";
import { TouchFeedback } from "../../components/TouchFeedback";
import { TextButton } from "../../components/shared/Buttons";
import { statusLabels } from "../reports/records";
import type { AdminKind } from "./admin";
export const adminKinds: { id: AdminKind; label: string }[] = [
  { id: "relato", label: "Relatos" },
  { id: "melhoria", label: "Melhorias" },
  { id: "avaliacao", label: "Avaliações" },
  { id: "lugar", label: "Lugares" },
  { id: "perfil", label: "Cadastros" },
];
export const adminStatuses: Partial<Record<AdminKind, string[]>> = {
  relato: ["pendente", "verificado", "resolvido"],
  melhoria: ["solicitada", "em_andamento", "concluida"],
  avaliacao: ["pendente", "aprovada", "rejeitada"],
};
export function AdminFilters({
  admin,
  kind,
  query,
  status,
  busy,
  onKind,
  onQuery,
  onStatus,
  onClear,
}: {
  admin: boolean;
  kind: AdminKind;
  query: string;
  status: string;
  busy: boolean;
  onKind: (value: AdminKind) => void;
  onQuery: (value: string) => void;
  onStatus: (value: string) => void;
  onClear: () => void;
}) {
  return (
    <View style={styles.group}>
      <Text accessibilityRole="header" style={shared.label}>
        Tipo de registro
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.options}
      >
        {adminKinds
          .filter(
            (item) => admin || item.id === "relato" || item.id === "melhoria",
          )
          .map((item) => (
            <TouchFeedback
              key={item.id}
              label={item.label}
              selected={kind === item.id}
              disabled={busy}
              onPress={() => onKind(item.id)}
              style={[shared.chip, kind === item.id && styles.selected]}
            >
              <Text
                style={[
                  styles.optionText,
                  kind === item.id && styles.selectedText,
                ]}
              >
                {kind === item.id ? "✓ " : ""}{item.label}
              </Text>
            </TouchFeedback>
          ))}
      </ScrollView>
      <Field
        editable={!busy}
        label="Buscar registros"
        value={query}
        onChangeText={onQuery}
        maxLength={100}
        returnKeyType="search"
        autoCorrect={false}
      />
      {adminStatuses[kind] && (
        <View style={styles.group}>
          <Text style={shared.label}>Status</Text>
          <View style={styles.options}>
            {["", ...adminStatuses[kind]!].map((value) => (
              <TouchFeedback
                key={value}
                label={statusLabels[value] ?? "Todos os status"}
                selected={status === value}
                disabled={busy}
                onPress={() => onStatus(value)}
                style={[shared.chip, status === value && styles.selected]}
              >
                <Text
                  style={[
                    styles.optionText,
                    status === value && styles.selectedText,
                  ]}
                >
                  {status === value ? "✓ " : ""}{statusLabels[value] ?? "Todos"}
                </Text>
              </TouchFeedback>
            ))}
          </View>
        </View>
      )}
      {!!(query || status) && (
        <View style={styles.active}>
          <Text accessibilityLiveRegion="polite" style={shared.note}>
            Filtros ativos
          </Text>
          {!!query && (
            <TextButton
              disabled={busy}
              title={`Remover busca: ${query}`}
              onPress={() => onQuery("")}
            />
          )}
          {!!status && (
            <TextButton
              disabled={busy}
              title={`Remover status: ${statusLabels[status] ?? status}`}
              onPress={() => onStatus("")}
            />
          )}
          <TextButton
            disabled={busy}
            title="Limpar todos os filtros"
            onPress={onClear}
          />
        </View>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  group: { gap: 10 },
  options: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingVertical: 4, paddingHorizontal: 2 },
  selected: { backgroundColor: palette.brand },
  optionText: {
    color: palette.brand,
    fontSize: typography.secondary,
    fontWeight: "600",
  },
  selectedText: { color: palette.surface },
  active: {
    padding: 12,
    borderRadius: radius.medium,
    backgroundColor: palette.surfaceTint,
    gap: 4,
  },
});
