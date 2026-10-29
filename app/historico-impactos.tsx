import { CollectionState } from "../components/shared/CollectionState";
import { impactStatus, isImpactStatus } from "../constants/impactStatus";
import { type Cursor } from "../lib/pagination";
import { palette } from "../constants/theme";
import { useCallback, useState } from "react";
import { FlatList, Text, View } from "react-native";
import { router } from "expo-router";
import { FeaturePage, Message, shared } from "../components/shared/FeaturePage";
import { TouchFeedback } from "../components/TouchFeedback";
import { improvementHistory } from "../services/improvements";
import { usePagedList } from "../features/profile/usePagedList";
import { statusLabels } from "../features/reports/records";
export default function ImprovementHistory() {
  const [status, setStatus] = useState(""),
    load = useCallback(
      (cursor: Cursor | null) => improvementHistory(cursor, status),
      [status],
    ),
    list = usePagedList(load, status);
  return (
    <FeaturePage title="Histórico de melhorias" scroll={false}>
      <Text style={shared.note}>
        Melhorias públicas da cidade em andamento ou concluídas. Acompanhe seus
        pedidos em análise em Minhas solicitações.
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {["", "em_andamento", "concluida"].map((s) => (
          <TouchFeedback
            key={s}
            selected={s === status}
            label={statusLabels[s] ?? "Todos"}
            onPress={() => setStatus(s)}
            style={[
              shared.chip,
              s === status && { backgroundColor: palette.brand },
            ]}
          >
            <Text style={{ color: s === status ? "white" : palette.brand }}>
              {statusLabels[s] ?? "Todas"}
            </Text>
          </TouchFeedback>
        ))}
      </View>
      <Message text={list.rows.length ? list.error : ""} error />
      <FlatList
        data={list.rows}
        keyExtractor={(r) => r.id}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={5}
        refreshing={list.loading}
        onRefresh={list.refresh}
        onEndReached={list.more}
        contentContainerStyle={{ gap: 12, paddingVertical: 6, paddingHorizontal: 2 }}
        ListEmptyComponent={
          <CollectionState
            loading={list.loading}
            error={list.error}
            title="Nenhuma melhoria neste filtro"
            message="Escolha outro filtro ou volte mais tarde para acompanhar as mudanças."
            skeleton="cards"
            onRetry={list.refresh}
          />
        }

        renderItem={({ item }) => (
          <TouchFeedback
            label={`Ver ${item.titulo}`}
            onPress={() =>
              router.push({
                pathname: "/registro",
                params: { kind: "melhoria", id: item.id },
              })
            }
            style={shared.card}
          >
            <Text style={shared.title}>{item.titulo}</Text>
            <Text style={shared.note}>{item.descricao}</Text>
            <Text
              style={[
                shared.label,
                {
                  color: isImpactStatus(item.status)
                    ? impactStatus[item.status].ink
                    : palette.muted,
                },
              ]}
            >
              {statusLabels[item.status]}
            </Text>
            <Text style={shared.note}>
              {new Date(item.criado_em).toLocaleDateString("pt-BR")}
            </Text>
          </TouchFeedback>
        )}
      />
    </FeaturePage>
  );
}
