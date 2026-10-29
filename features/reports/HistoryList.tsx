import { LoadingIndicator } from "../../components/loading/LoadingIndicator";
import { type Cursor } from "../../lib/pagination";
import { palette } from "../../constants/theme";
import { useCallback } from "react";
import { Text, View } from "react-native";
import { Action, Message, shared } from "../../components/shared/FeaturePage";
import { usePagedList } from "../profile/usePagedList";
import { history, RecordKind, statusLabels } from "./records";
export function HistoryList({ kind, id }: { kind: RecordKind; id: string }) {
  const load = useCallback(
      (cursor: Cursor | null) => history(kind, id, cursor),
      [kind, id],
    ),
    list = usePagedList(load, `${kind}:${id}`);
  return (
    <View style={{ gap: 10 }}>
      <Text style={shared.title}>Histórico de atualizações</Text>
      <Message text={list.error} error />
      {list.rows.map((row) => (
        <View
          key={row.id}
          style={{
            borderLeftWidth: 2,
            borderLeftColor: palette.brand,
            paddingLeft: 12,
            gap: 5,
          }}
        >
          <Text style={shared.label}>
            {statusLabels[row.anterior] ?? row.anterior} →{" "}
            {statusLabels[row.novo] ?? row.novo}
          </Text>
          <Text style={shared.note}>{row.motivo}</Text>
          <Text style={shared.note}>
            {row.responsavel} ·{" "}
            {new Date(row.criado_em).toLocaleString("pt-BR")}
          </Text>
        </View>
      ))}
      {!list.rows.length &&
        !list.error &&
        (list.loading ? (
          <LoadingIndicator showLabel label="Carregando histórico" />
        ) : (
          <Text style={shared.note}>Ainda não houve alteração de status.</Text>
        ))}
      {list.hasMore && (
        <Action
          secondary
          title="Carregar mais atualizações"
          busy={list.loading}
          onPress={list.more}
        />
      )}
    </View>
  );
}
