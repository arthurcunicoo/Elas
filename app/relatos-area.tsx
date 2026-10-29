import { CollectionState } from "../components/shared/CollectionState";
import { useCallback } from "react";
import { FlatList, Text } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { FeaturePage, Message, shared } from "../components/shared/FeaturePage";
import { TouchFeedback } from "../components/TouchFeedback";
import { usePagedList } from "../features/profile/usePagedList";
import { reportsInBounds } from "../services/reports";
import type { Cursor } from "../lib/pagination";
export default function ReportsInArea() {
  const params = useLocalSearchParams<{
    south: string;
    west: string;
    north: string;
    east: string;
  }>();
  const south = Number(params.south),
    west = Number(params.west),
    north = Number(params.north),
    east = Number(params.east);
  const valid =
    [south, west, north, east].every(Number.isFinite) &&
    south < north &&
    west < east &&
    south >= -85 &&
    north <= 85 &&
    west >= -180 &&
    east <= 180 &&
    north - south <= 5 &&
    east - west <= 5;
  const load = useCallback(
    (cursor: Cursor | null) => {
      if (!valid)
        return Promise.reject(
          new Error("Área inválida. Volte ao mapa e abra um grupo de relatos."),
        );
      return reportsInBounds(cursor, { south, west, north, east });
    },
    [valid, south, west, north, east],
  );
  const list = usePagedList(load, `${south}:${west}:${north}:${east}`);
  return (
    <FeaturePage title="Relatos nesta área" scroll={false}>
      <Text style={shared.note}>
        Relatos verificados e seus próprios relatos pendentes, do mais recente
        ao mais antigo. A lista continua ao rolar.
      </Text>
      <Message text={list.rows.length ? list.error : ""} error />
      <FlatList
        data={list.rows}
        keyExtractor={(item) => item.id}
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
            title="Nenhum relato nesta área"
            message="Os relatos disponíveis para esta região aparecerão aqui."
            skeleton="cards"
            onRetry={list.refresh}
          />
        }

        renderItem={({ item }) => (
          <TouchFeedback
            label={`Abrir relato: ${item.local_texto}`}
            onPress={() =>
              router.push({
                pathname: "/registro",
                params: { kind: "relato", id: item.id },
              })
            }
            style={shared.card}
          >
            <Text style={shared.title}>{item.local_texto}</Text>
            <Text style={shared.note}>{item.categoria}</Text>
            <Text style={shared.note}>{item.descricao}</Text>
            <Text style={shared.label}>
              {item.status === "pendente"
                ? "Seu relato · aguardando verificação"
                : "Relato verificado"}
            </Text>
            {item.status === "pendente" && (
              <Text style={shared.note}>
                Visível apenas para você e para a equipe.
              </Text>
            )}
          </TouchFeedback>
        )}
      />
    </FeaturePage>
  );
}
