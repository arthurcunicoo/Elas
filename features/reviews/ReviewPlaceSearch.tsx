import { LoadingIndicator } from "../../components/loading/LoadingIndicator";
import { ui, palette, radius, typography, pageContent } from "../../constants/theme";
import { useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import Ionicons from "../../components/icons/Ionicon";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Field } from "../../components/shared/FeaturePage";
import { MotionReveal } from "../../components/MotionReveal";
import { TouchFeedback } from "../../components/TouchFeedback";
import { Place, normalizePlaceQuery, places as demoPlaces } from "../../constants/places";
import { categoryForPlace } from "../../constants/placeCategories";

import { backendConfigured } from "../../lib/supabase";
import { usePlaceSearch } from "../map/usePlaceSearch";

export function ReviewPlaceSearch({
  onSelect,
}: {
  onSelect: (place: Place) => void;
}) {
  const [query, setQuery] = useState("");
  const term = normalizePlaceQuery(query),
    enabled = term.length >= 2;
  const search = usePlaceSearch(query, "all", backendConfigured && enabled);
  const insets = useSafeAreaInsets();
  const rows = backendConfigured
    ? search.rows
    : enabled
      ? demoPlaces.filter((place) =>
          normalizePlaceQuery(`${place.name} ${place.address}`).includes(term),
        )
      : [];
  const resolved = !backendConfigured || search.resolved;
  return (
    <FlatList
      data={rows}
      keyExtractor={(place) => place.id}
      initialNumToRender={8}
      maxToRenderPerBatch={8}
      windowSize={5}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      contentContainerStyle={[
        styles.page,
        { paddingBottom: insets.bottom + 28 },
      ]}
      ListHeaderComponent={
        <View style={styles.header}>
          <MotionReveal duration={280} distance={10}>
            <Text accessibilityRole="header" style={styles.question}>
              Qual lugar você quer avaliar?
            </Text>
            <Text style={styles.note}>
              Digite o nome e escolha um lugar abaixo. Depois, faça sua
              avaliação aqui mesmo.
            </Text>
          </MotionReveal>
          <Field
            label="Nome do lugar"
            value={query}
            onChangeText={setQuery}
            placeholder="Ex.: Praça Nereu Ramos"
            maxLength={100}
            returnKeyType="search"
            autoCorrect={false}
          />
          {search.loading && <LoadingIndicator label="Buscando lugares" />}
          {!!search.error && (
            <View>
              <Text accessibilityRole="alert" style={styles.error}>
                {search.error}
              </Text>
              <TouchFeedback
                label="Tentar buscar novamente"
                onPress={search.retry}
              >
                <Text style={styles.link}>Tentar novamente</Text>
              </TouchFeedback>
            </View>
          )}
          {rows.length > 0 && (
            <Text accessibilityLiveRegion="polite" style={styles.note}>
              Escolha o lugar para continuar:
            </Text>
          )}
        </View>
      }
      renderItem={({ item }) => {
        const category = categoryForPlace(item);
        return (
          <TouchFeedback
            label={`Avaliar ${item.name}, ${item.address}`}
            onPress={() => onSelect(item)}
            style={styles.result}
          >
            <Ionicons name={category.icon} size={23} color={category.color} />
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.address}>
                {category.singular} · {item.address}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={ui.action} />
          </TouchFeedback>
        );
      }}
      ListEmptyComponent={
        !search.error && !search.loading ? (
          <Text accessibilityLiveRegion="polite" style={styles.note}>
            {!enabled
              ? "Digite pelo menos 2 letras para buscar."
              : resolved
                ? "Não encontramos esse lugar. Tente outro nome, bairro ou endereço."
                : ""}
          </Text>
        ) : null
      }
      ListFooterComponent={
        <View style={styles.footer}>
          {enabled && resolved && search.hasMore && (
            <TouchFeedback
              busy={search.loading}
              disabled={search.loading}
              label="Mostrar mais lugares"
              onPress={search.more}
              style={styles.more}
            >
              <Text style={styles.link}>Mostrar mais lugares</Text>
            </TouchFeedback>
          )}
          <TouchFeedback
            label="Procurar lugar no mapa"
            onPress={() => router.navigate("/mapa")}
          >
            <Text style={styles.link}>Procurar no mapa</Text>
          </TouchFeedback>
          <View style={styles.report}>
            <Text style={styles.note}>
              Quer contar o que aconteceu em uma rua ou lugar?
            </Text>
            <TouchFeedback
              label="Criar um relato"
              onPress={() => router.push("/novo-relato")}
            >
              <Text style={styles.link}>Criar um relato</Text>
            </TouchFeedback>
          </View>
        </View>
      }
    />
  );
}
const styles = StyleSheet.create({
  page: {
    flexGrow: 1,
    ...pageContent,
    paddingTop: 24,
  },
  header: { gap: 16, marginBottom: 16 },
  question: {
    color: palette.accent,
    fontSize: 20,
    lineHeight: 28,
    fontWeight: "700",
  },
  note: {
    color: palette.muted,
    fontSize: typography.secondary,
    lineHeight: 20,
    marginTop: 8,
  },
  result: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "white",
    borderRadius: radius.medium,
    padding: 14,
    marginBottom: 8,
    minHeight: 64,
  },
  name: { color: palette.text, fontWeight: "700", fontSize: typography.card },
  address: {
    color: palette.muted,
    fontSize: typography.caption,
    lineHeight: 18,
    marginTop: 4,
  },
  footer: { gap: 8, marginTop: 12 },
  link: { color: ui.action, fontSize: typography.body, fontWeight: "600" },
  more: {
    alignItems: "center",
    borderRadius: radius.small,
    backgroundColor: palette.surfaceTint,
    padding: 10,
  },
  report: {
    borderTopWidth: 1,
    borderTopColor: palette.border,
    paddingTop: 8,
    marginTop: 8,
  },
  error: { color: ui.action, fontSize: typography.secondary, lineHeight: 20 },
});
