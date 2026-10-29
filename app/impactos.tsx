import {demonstrationImpactCounts} from "../features/presentation/content";
import { LoadingIndicator } from "../components/loading/LoadingIndicator";
import { ui, palette, typography, pageContent } from "../constants/theme";
import { impactStatus, isImpactStatus } from "../constants/impactStatus";
import { PageHeader } from "../components/shared/PageHeader";
import { DemoLabel } from "../components/DemoLabel";
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { ImpactStatCard } from "../components/impacts/ImpactStatCard";
import { ImprovementCard } from "../components/impacts/ImprovementCard";
import { ImprovementRequest } from "../components/impacts/ImprovementRequest";
import { router } from "expo-router";
import { type ImpactRow } from "../services/improvements";
import { useImpacts } from "../features/impacts/useImpacts";
import { TouchFeedback } from "../components/TouchFeedback";
function ImprovementList({ rows }: { rows: ImpactRow[] }) {
  return (
    <View style={styles.list}>
      {rows.map(
        (row) =>
          isImpactStatus(row.status) && (
            <ImprovementCard
              key={row.id}
              item={{
                title: row.titulo,
                description: row.descricao,
                status: row.status,
                propria: row.propria,
              }}
            />
          ),
      )}
    </View>
  );
}
export default function Impacts() {
  const { minhas, cidade, examples, loading, error, refresh } = useImpacts();
  const presentation = examples.length > 0 && !minhas.rows.length && !cidade.rows.length;
  const presentationCounts = demonstrationImpactCounts(examples);
  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <StatusBar style="light" />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refresh} />
        }
      >
        <PageHeader
          title="Impactos na cidade"
          onBack={() => router.navigate("/mapa")}
        >
          <Text style={styles.breadcrumb}>Mapa › Impactos</Text>
          <Text accessibilityRole="header" style={styles.scopeTitle}>
            {presentation ? "Acompanhamento de exemplo" : "Minhas solicitações"}
          </Text>
          {loading ? (
            <LoadingIndicator
              showLabel
              tone="light"
              label="Carregando seus números"
            />
          ) : (
            !error && (
              <View style={styles.stats}>
                {(
                  Object.keys(impactStatus) as (keyof typeof impactStatus)[]
                ).map((status, index) => (
                  <ImpactStatCard
                    key={status}
                    status={status}
                    total={presentation ? presentationCounts[status] : minhas.counts[status]}
                    delay={index * 80}
                  />
                ))}
              </View>
            )
          )}
          <Text style={styles.scope}>
{presentation ? "Demonstração: números fictícios para apresentar as etapas. Não são solicitações reais suas ou da cidade." : "Somente solicitações enviadas por você. Pedidos em análise ainda não são públicos."}
          </Text>
        </PageHeader>
        <View style={styles.content}>
          <ImprovementRequest onCreated={refresh} />
          {!!error && (
            <TouchFeedback
              label="Tentar carregar melhorias novamente"
              onPress={refresh}
            >
              <Text accessibilityRole="alert" style={styles.error}>
                {error} Toque para tentar novamente.
              </Text>
            </TouchFeedback>
          )}
          {!loading && !error && presentation && (
            <View style={styles.list}>
              <Text accessibilityRole="header" style={styles.section}>Como as melhorias são acompanhadas</Text>
              <DemoLabel />
              <Text style={styles.note}>Exemplos fictícios de cada etapa, sem obras ou entregas reais.</Text>
              {examples.map(row => row.estado && isImpactStatus(row.estado) ? <ImprovementCard key={row.id} item={{title: row.titulo, description: row.descricao, status: row.estado, demonstracao: true}} /> : null)}
              <TouchFeedback label="Ver minhas solicitações reais" onPress={() => router.push("/minhas-solicitacoes")}><Text style={styles.link}>Ver minhas solicitações reais</Text></TouchFeedback>
            </View>
          )}
          {!loading && !error && !presentation && (
            <>
              <Text accessibilityRole="header" style={styles.section}>
                Acompanhe suas solicitações
              </Text>
              <Text style={styles.note}>
                Até 20 solicitações mais recentes em análise, em andamento ou
                concluídas.
              </Text>
              <ImprovementList rows={minhas.rows} />
              {!minhas.rows.length && (
                <Text style={styles.note}>
                  Você ainda não enviou solicitações de melhoria.
                </Text>
              )}
              <TouchFeedback
                label="Ver todas as minhas solicitações"
                onPress={() => router.push("/minhas-solicitacoes")}
              >
                <Text style={styles.link}>
                  Ver todas as minhas solicitações
                </Text>
              </TouchFeedback>
              <Text accessibilityRole="header" style={styles.section}>
                Melhorias públicas na cidade
              </Text>
              <Text style={styles.note}>
                Solicitações da comunidade em andamento ou concluídas. Pedidos
                em análise não entram nestes números.
              </Text>
              <View style={styles.stats}>
                <ImpactStatCard
                  status="em_andamento"
                  total={cidade.counts.em_andamento}
                  delay={0}
                />
                <ImpactStatCard
                  status="concluida"
                  total={cidade.counts.concluida}
                  delay={80}
                />
              </View>
              <Text style={styles.note}>
                Até 20 melhorias públicas mais recentes.
              </Text>
              <ImprovementList rows={cidade.rows} />
              {!cidade.rows.length && (
                <Text style={styles.note}>
                  Ainda não há melhorias públicas em andamento ou concluídas.
                </Text>
              )}
              <TouchFeedback
                label="Ver histórico público de melhorias"
                onPress={() => router.push("/historico-impactos")}
              >
                <Text style={styles.link}>
                  Ver histórico público de melhorias
                </Text>
              </TouchFeedback>
              {!!examples.length && (
                <>
                  <Text accessibilityRole="header" style={styles.section}>
                    Como os impactos aparecem
                  </Text>
                  <DemoLabel />
                  <Text style={styles.note}>
                    Exemplos fictícios. Não representam obras reais nem entram
                    nos números acima.
                  </Text>
                  <View style={styles.list}>
                    {examples.map(
                      (row) =>
                        row.estado &&
                        isImpactStatus(row.estado) && (
                          <ImprovementCard
                            key={row.id}
                            item={{
                              title: row.titulo,
                              description: row.descricao,
                              status: row.estado,
                              demonstracao: true,
                            }}
                          />
                        ),
                    )}
                  </View>
                </>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ui.surface },
  scroll: { flexGrow: 1, paddingBottom: 54 },
  breadcrumb: {
    color: palette.surface,
    fontSize: typography.caption,
    marginTop: 4,
  },
  scopeTitle: {
    color: palette.surface,
    fontSize: typography.input,
    fontWeight: "700",
    marginTop: 20,
  },
  stats: { flexDirection: "row", gap: 10, marginVertical: 12 },
  scope: {
    color: palette.surface,
    fontSize: typography.caption,
    lineHeight: 19,
    marginTop: 6,
  },
  content: { ...pageContent },
  section: {
    color: ui.text,
    fontSize: typography.section,
    fontWeight: "700",
    marginTop: 20,
    marginBottom: 8,
  },
  note: {
    color: ui.muted,
    fontSize: typography.secondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  link: {
    color: ui.action,
    fontWeight: "600",
    fontSize: typography.body,
    paddingVertical: 12,
  },
  list: { gap: 8 },
  error: { color: palette.error, paddingVertical: 12 },
});
