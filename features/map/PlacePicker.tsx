import { LoadingIndicator } from "../../components/loading/LoadingIndicator";
import { colors, ui, palette, radius, typography } from "../../constants/theme";
import { useRef, useState } from "react";
import { FlatList, Keyboard, StyleSheet, Text, TextInput, View } from "react-native";
import Ionicons from "../../components/icons/Ionicon";
import { AppSheet } from "../../components/AppSheet";
import { Field } from "../../components/shared/FeaturePage";
import { TouchFeedback } from "../../components/TouchFeedback";

import type { Place } from "../../constants/places";
import { categoryForPlace } from "../../constants/placeCategories";
import { usePlaceSearch } from "./usePlaceSearch";

// A parent sheet can use this same search as its next step, avoiding stacked modals.
export function PlaceSearchContent({
  onSelect,
  enabled = true,
}: {
  onSelect: (place: Place) => void;
  enabled?: boolean;
}) {
  const [query, setQuery] = useState("");
  const input = useRef<TextInput>(null);
  const searching = query.trim().length >= 2;
  const search = usePlaceSearch(query, "all", enabled && searching);
  return (
    <View style={styles.searchContent}>
      <View style={styles.searchField}>
        <Field
          ref={input}
          label="Nome do lugar"
          value={query}
          onChangeText={setQuery}
          maxLength={100}
          placeholder="Praça, parque, shopping…"
          autoCapitalize="words"
          returnKeyType="search"
          onSubmitEditing={() => Keyboard.dismiss()}
          clearButtonMode="while-editing"
        />
      </View>
      <FlatList
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        data={search.rows}
        keyExtractor={(place) => place.id}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={5}
        style={styles.list}
        contentContainerStyle={styles.results}
        renderItem={({ item }) => {
          const category = categoryForPlace(item);
          return (
            <TouchFeedback
              label={`Selecionar ${item.name}, ${item.address}`}
              onPress={() => {
                Keyboard.dismiss();
                onSelect(item);
              }}
              style={styles.result}
            >
              <View
                style={[styles.resultIcon, { backgroundColor: category.tint }]}
              >
                <Ionicons name={category.icon} color={colors.pink} size={21} />
              </View>
              <View style={styles.resultText}>
                <Text style={styles.resultName}>{item.name}</Text>
                <Text numberOfLines={2} style={styles.address}>
                  {item.address}
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={palette.muted}
              />
            </TouchFeedback>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            {search.loading ? (
              <LoadingIndicator />
            ) : (
              <View style={styles.emptyIcon}>
                <Ionicons
                  name={
                    search.error ? "cloud-offline-outline" : "search-outline"
                  }
                  size={30}
                  color={colors.pink}
                />
              </View>
            )}
            <Text style={styles.emptyTitle}>
              {search.loading
                ? "Procurando lugares"
                : search.error
                  ? "Não foi possível buscar"
                  : searching
                    ? "Nenhum lugar encontrado"
                    : "Qual lugar você procura?"}
            </Text>
            <Text style={styles.emptyText}>
              {search.error ||
                (searching
                  ? "Tente outro nome. Você também pode informar uma referência na descrição."
                  : "Digite pelo menos 2 letras para encontrar um lugar da cidade.")}
            </Text>
            {!!search.error && (
              <TouchFeedback
                label="Tentar buscar lugares novamente"
                onPress={search.retry}
                style={styles.retry}
              >
                <Text style={styles.link}>Tentar novamente</Text>
              </TouchFeedback>
            )}
          </View>
        }
        ListFooterComponent={
          search.rows.length ? (
            <View style={styles.listFooter}>
              {search.loading ? (
                <LoadingIndicator />
              ) : search.hasMore ? (
                <TouchFeedback
                  label="Carregar mais lugares"
                  onPress={search.more}
                >
                  <Text style={styles.link}>Ver mais resultados</Text>
                </TouchFeedback>
              ) : (
                <Text style={styles.emptyText}>
                  Escolha um lugar para continuar.
                </Text>
              )}
            </View>
          ) : null
        }
      />
    </View>
  );
}
export function PlacePicker({
  value,
  onChange,
  disabled = false,
  onOpenPicker,
}: {
  value: Place | null;
  onChange: (place: Place | null) => void;
  disabled?: boolean;
  onOpenPicker?: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.group}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>Lugar</Text>
        <Text style={styles.optional}>Opcional</Text>
      </View>
      <View style={[styles.selection, value && styles.selected]}>
        <TouchFeedback
          label={value ? `Alterar lugar: ${value.name}` : "Adicionar um lugar"}
          disabled={disabled}
          onPress={() => (onOpenPicker ? onOpenPicker() : setOpen(true))}
          style={styles.choose}
        >
          <View style={styles.pin}>
            <Ionicons name="location-outline" size={22} color={colors.pink} />
          </View>
          <View style={styles.resultText}>
            <Text style={styles.selectionTitle}>
              {value?.name ?? "Adicionar um lugar"}
            </Text>
            <Text style={styles.address} numberOfLines={2}>
              {value?.address ?? "Encontre pelo nome na cidade"}
            </Text>
          </View>
          {!value && (
            <Ionicons name="chevron-forward" size={19} color={colors.pink} />
          )}
        </TouchFeedback>
        {!!value && (
          <TouchFeedback
            label="Remover lugar selecionado"
            disabled={disabled}
            onPress={() => onChange(null)}
            style={styles.remove}
          >
            <Ionicons name="close-circle-outline" size={23} color={ui.muted} />
          </TouchFeedback>
        )}
      </View>
      {!onOpenPicker && (
        <AppSheet
          visible={open}
          title="Escolher lugar"
          subtitle="Encontre um lugar da cidade"
          icon="location-outline"
          onClose={() => setOpen(false)}
          large
          scroll={false}
          footer={
            <TouchFeedback
              label="Continuar sem alterar o lugar"
              onPress={() => setOpen(false)}
              style={styles.skip}
            >
              <Text style={styles.link}>
                {value ? "Manter lugar atual" : "Continuar sem lugar"}
              </Text>
            </TouchFeedback>
          }
        >
          {open && (
            <PlaceSearchContent
              onSelect={(place) => {
                onChange(place);
                setOpen(false);
              }}
            />
          )}
        </AppSheet>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  group: { gap: 9 },
  labelRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  label: { fontSize: typography.body, fontWeight: "700", color: colors.wine },
  optional: { fontSize: typography.caption, color: ui.muted },
  selection: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radius.large,
    backgroundColor: palette.surface,
    paddingRight: 8,
  },
  selected: { backgroundColor: colors.cream },
  choose: {
    flex: 1,
    flexDirection: "row",
    gap: 12,
    padding: 12,
    minHeight: 76,
    alignItems: "center",
  },
  pin: {
    width: 38,
    height: 38,
    borderRadius: radius.medium,
    backgroundColor: colors.cream,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  selectionTitle: {
    fontSize: typography.card,
    fontWeight: "600",
    lineHeight: 21,
    color: ui.text,
  },
  remove: { width: 44, height: 48, alignItems: "center" },
  searchContent: { flex: 1, minHeight: 0 },
  searchField: { paddingHorizontal: 20, paddingBottom: 16 },
  list: { flex: 1 },
  results: { flexGrow: 1, paddingHorizontal: 20, paddingBottom: 16 },
  result: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 15,
    minHeight: 76,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  resultIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.medium,
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  resultText: { flex: 1, minWidth: 0 },
  resultName: {
    color: ui.text,
    fontSize: typography.card,
    lineHeight: 21,
    fontWeight: "600",
  },
  address: {
    color: ui.muted,
    fontSize: typography.caption,
    lineHeight: 18,
    marginTop: 3,
  },
  empty: {
    flex: 1,
    minHeight: 220,
    justifyContent: "center",
    alignItems: "center",
    padding: 18,
    gap: 12,
  },
  emptyIcon: {
    width: 68,
    height: 68,
    borderRadius: radius.large,
    backgroundColor: colors.cream,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    lineHeight: 23,
    textAlign: "center",
    color: ui.text,
  },
  emptyText: {
    fontSize: typography.body,
    lineHeight: 22,
    textAlign: "center",
    color: ui.muted,
  },
  listFooter: { paddingTop: 18, alignItems: "center" },
  link: {
    color: colors.pink,
    fontSize: typography.card,
    fontWeight: "600",
    textAlign: "center",
  },
  retry: { paddingHorizontal: 20 },
  skip: {
    minHeight: 50,
    alignItems: "center",
    borderRadius: radius.medium,
    backgroundColor: colors.cream,
  },
});
