import { CollectionState } from "../../components/shared/CollectionState";
import { impactStatus, isImpactStatus } from "../../constants/impactStatus";
import { type Cursor } from "../../lib/pagination";
import { palette } from "../../constants/theme";
import { router } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, Text, View } from "react-native";
import { FeaturePage, Message, shared } from "../../components/shared/FeaturePage";
import { TouchFeedback } from "../../components/TouchFeedback";
import { usePagedList } from "../profile/usePagedList";
import { ownRecords, statusLabels } from "./records";
import { HistoryList } from "./HistoryList";
export function OwnRecordsScreen({ kind }: { kind: "relato" | "melhoria" }) {
  const [open, setOpen] = useState<string | null>(null),
    load = useCallback(
      (cursor: Cursor | null) => ownRecords(kind, cursor),
      [kind],
    ),
    list = usePagedList(load, kind);
  return (
    <FeaturePage
      title={kind === "relato" ? "Meus relatos" : "Minhas solicitações"}
      scroll={false}
    >
      <Message text={list.rows.length ? list.error : ""} error />
      <FlatList
        data={list.rows}
        keyExtractor={(r) => r.id}
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        windowSize={5}
        refreshing={list.loading}
        onRefresh={list.refresh}
        onEndReached={list.more}
        contentContainerStyle={{ paddingVertical: 6, paddingHorizontal: 2 }}
        ItemSeparatorComponent={() => <View style={{ height: 14 }} />}
        ListEmptyComponent={
          <CollectionState
            loading={list.loading}
            error={list.error}
            title="Você ainda não enviou registros"
            message="Suas contribuições e atualizações aparecerão aqui."
            skeleton="cards"
            onRetry={list.refresh}
          />
        }

        renderItem={({ item }) => (
          <View style={shared.card}>
            <Text style={shared.title}>
              {item.titulo ?? item.local_texto ?? item.categoria}
            </Text>
            {item.categoria && (
              <Text style={shared.note}>{item.categoria}</Text>
            )}
            <Text style={shared.note}>{item.descricao}</Text>
            <TouchFeedback
              label="Abrir detalhes do registro"
              onPress={() =>
                router.push({
                  pathname: "/registro",
                  params: { kind, id: item.id },
                })
              }
            >
              <Text style={{ color: palette.brand, fontWeight: "600" }}>
                Ver detalhes e gerenciar
              </Text>
            </TouchFeedback>
            <Text
              style={[
                shared.label,
                {
                  color:
                    kind === "melhoria" && isImpactStatus(item.status)
                      ? impactStatus[item.status].ink
                      : palette.brand,
                },
              ]}
            >
              {kind === "relato" && item.status === "pendente"
                ? "Seu relato · aguardando verificação"
                : (statusLabels[item.status] ?? item.status)}
            </Text>
            {((kind === "relato" && item.status === "pendente") ||
              (kind === "melhoria" && item.status === "solicitada")) && (
              <Text style={shared.note}>
                Visível apenas para você e para a equipe. Ainda não foi
                publicado para a cidade.
              </Text>
            )}
            <Text style={shared.note}>
              Atualizado em{" "}
              {new Date(item.atualizado_em).toLocaleString("pt-BR")}
            </Text>
            <TouchFeedback
              label={open === item.id ? "Fechar histórico" : "Ver histórico"}
              onPress={() => setOpen(open === item.id ? null : item.id)}
            >
              <Text style={{ color: palette.brand, fontWeight: "600" }}>
                {open === item.id
                  ? "Fechar histórico"
                  : "Acompanhar atualizações"}
              </Text>
            </TouchFeedback>
            {open === item.id && <HistoryList kind={kind} id={item.id} />}
          </View>
        )}
      />
    </FeaturePage>
  );
}
