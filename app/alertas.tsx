import {listDemonstrations} from "../services/showcase";
import {demonstrationReports} from "../features/presentation/content";
import {localPage} from "../lib/pagination";
import { CollectionState } from "../components/shared/CollectionState";
import { type Cursor } from "../lib/pagination";
import { ui, palette, typography, pageContent } from "../constants/theme";
import { PrimaryButton, SecondaryButton } from "../components/shared/Buttons";
import { PageHeader } from "../components/shared/PageHeader";
import { useCallback } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { CriticalAlertCard, AlertLocationCard } from "../components/alerts/AlertCards";
import { listReports } from "../services/reports";
import { TouchFeedback } from "../components/TouchFeedback";
import { usePagedList } from "../features/profile/usePagedList";
export default function Reports() {
  const load = useCallback(
    async (cursor: Cursor | null) => {
      const page = await listReports(cursor, true);
      if (page.rows.length || cursor) return page;
      return localPage(demonstrationReports(await listDemonstrations("relato")));
    },
    [],
  );
  const list = usePagedList(load);
  const presentation = list.rows.some(report => report.demonstracao);
  const open = (id: string) => {
    const report = list.rows.find(row => row.id === id);
    if (report?.demonstracao) {
      if (report.lugar_id) router.navigate({pathname: "/mapa", params: {placeId: report.lugar_id}});
      return;
    }
    router.navigate({pathname: "/registro", params: {kind: "relato", id}});
  };
  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <PageHeader title="Relatos" />
      <View style={styles.page}>
        <View style={styles.actions}>
          <View style={styles.action}>
            <SecondaryButton
              title="Meus relatos"
              onPress={() => router.push("/meus-relatos")}
            />
          </View>
          <View style={styles.action}>
            <SecondaryButton
              title="Notificações"
              onPress={() => router.push("/notificacoes")}
            />
          </View>
        </View>
        <FlatList
          data={list.rows}
          keyExtractor={(report) => report.id}
          initialNumToRender={6}
          maxToRenderPerBatch={6}
          windowSize={5}
          contentContainerStyle={styles.scroll}
          refreshing={list.loading}
          onRefresh={list.refresh}
          onEndReached={list.more}
          ListHeaderComponent={
            <View style={styles.intro}>
              <Text accessibilityRole="header" style={styles.introTitle}>
                {presentation ? "Relatos de demonstração" : "Na cidade, nas últimas 24h"}
              </Text>
              <Text style={styles.introText}>
                {presentation ? "Exemplos fictícios para apresentar o aplicativo. Não são ocorrências verificadas nem alertas reais." : "Ocorrências verificadas da comunidade, da mais recente à mais antiga. A ordem não indica gravidade."}
              </Text>
              <Text style={styles.introText}>
                Seus relatos aguardando verificação ficam em Meus relatos.
              </Text>
              {!!list.error && list.rows.length > 0 && (
                <TouchFeedback
                  label="Tentar carregar relatos"
                  onPress={list.refresh}
                >
                  <Text accessibilityRole="alert" style={styles.error}>
                    {list.error} Toque para tentar novamente.
                  </Text>
                </TouchFeedback>
              )}
            </View>
          }
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          ListFooterComponent={
            <PrimaryButton
              title="Relatar uma situação"
              onPress={() => router.push("/novo-relato")}
              style={{ marginTop: 16 }}
            />
          }
          ListEmptyComponent={
            <CollectionState
              loading={list.loading}
              error={list.error}
              title="Nenhum relato público nas últimas 24 horas"
              message="Os relatos verificados da comunidade aparecerão aqui."
              onRetry={list.refresh}
            />
          }
          renderItem={({ item, index }) =>
            index === 0 ? (
              <>
                <CriticalAlertCard report={item} onMap={() => open(item.id)} />
                {list.rows.length > 1 && (
                  <Text accessibilityRole="header" style={styles.section}>
                    Outros relatos recentes
                  </Text>
                )}
              </>
            ) : (
              <AlertLocationCard report={item} onPress={() => open(item.id)} />
            )
          }
        />
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.background },
  page: { ...pageContent, flex: 1 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 16, marginBottom: 16 },
  action: { flexGrow: 1, flexBasis: 140 },
  intro: { gap: 5, marginBottom: 18, paddingHorizontal: 2 },
  introTitle: { color: ui.text, fontSize: typography.input, fontWeight: "600" },
  introText: {
    color: ui.muted,
    fontSize: typography.secondary,
    lineHeight: 20,
  },
  scroll: { flexGrow: 1, paddingHorizontal: 2, paddingTop: 4, paddingBottom: 54 },
  section: {
    color: ui.text,
    fontSize: typography.input,
    fontWeight: "600",
    marginTop: 22,
    marginBottom: 8,
  },
  error: { color: palette.error, lineHeight: 22 },
});
