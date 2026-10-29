import { LoadingState } from "../components/loading/LoadingState";
import { useCallback, useRef, useState } from "react";
import { Text, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { FeaturePage, Action, Field, Message, shared } from "../components/shared/FeaturePage";
import { recordDetail, updateRecord, RecordDetail, statusLabels } from "../features/reports/records";
import { HistoryList } from "../features/reports/HistoryList";
import { friendlyError } from "../lib/supabase";
export default function RecordScreen() {
  const { kind, id } = useLocalSearchParams<{ kind: string; id: string }>();
  const valid =
    kind === "relato" || kind === "melhoria" || kind === "avaliacao";
  const [row, setRow] = useState<RecordDetail | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [edit, setEdit] = useState(false),
    [confirm, setConfirm] = useState(false),
    [title, setTitle] = useState(""),
    [text, setText] = useState(""),
    [busy, setBusy] = useState(false),
    [version, setVersion] = useState(0);
  const lock = useRef(false);
  useFocusEffect(
    useCallback(() => {
      void version;
      let active = true;
      setLoading(true);
      setError("");
      setRow(null);
      if (!valid || !id) {
        setLoading(false);
        setError("Registro inválido.");
        return;
      }
      void recordDetail(kind, id)
        .then((value) => {
          if (active) {
            setRow(value);
            setTitle(value?.titulo ?? "");
            setText(value?.descricao ?? "");
          }
        })
        .catch((e) => {
          if (active) setError(friendlyError(e));
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
    }, [kind, id, valid, version]),
  );
  async function save(withdraw: boolean) {
    if (!row || lock.current || (kind !== "relato" && kind !== "melhoria"))
      return;
    if (
      !withdraw &&
      (text.trim().length < (kind === "relato" ? 10 : 5) ||
        (kind === "melhoria" && title.trim().length < 3))
    ) {
      setError("Preencha o título e a descrição com mais detalhes.");
      return;
    }
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await updateRecord(
        kind,
        row,
        { descricao: text.trim(), titulo: title.trim() },
        withdraw,
      );
      setEdit(false);
      setConfirm(false);
      setVersion((v) => v + 1);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  const pending =
    row?.proprio && (row.status === "pendente" || row.status === "solicitada");
  return (
    <FeaturePage
      title={
        kind === "relato"
          ? "Detalhes do relato"
          : kind === "melhoria"
            ? "Detalhes da solicitação"
            : "Detalhes da avaliação"
      }
    >
      <Message text={error} error />
      {loading ? (
        <LoadingState
          title="Cada história conta"
          message="Buscando os detalhes deste registro."
        />
      ) : !row ? (
        <View style={shared.card}>
          <Text style={shared.title}>Registro indisponível</Text>
          <Text style={shared.note}>
            Ele pode ter sido excluído ou não estar acessível para esta conta.
          </Text>
          <Action
            secondary
            title="Tentar novamente"
            onPress={() => setVersion((v) => v + 1)}
          />
        </View>
      ) : (
        <View style={shared.card}>
          <Text style={shared.title}>
            {row.titulo ?? row.local_texto ?? row.categoria}
          </Text>
          <Text style={shared.label}>
            {row.sentimento ?? row.categoria} ·{" "}
            {statusLabels[row.status] ?? row.status}
          </Text>
          {pending && (
            <Text style={shared.note}>
              {kind === "relato"
                ? "Seu relato · aguardando verificação"
                : "Sua solicitação · aguardando análise"}
              . Visível apenas para você e para a equipe, ainda não publicado
              para a cidade.
            </Text>
          )}
          <Text style={shared.note}>{row.descricao || "Sem comentário."}</Text>
          <Text style={shared.note}>
            Atualizado em {new Date(row.atualizado_em).toLocaleString("pt-BR")}
          </Text>
          {(row.lugar_id || row.latitude != null) && (
            <Action
              secondary
              title={
                row.lugar_id
                  ? "Ver lugar no mapa"
                  : "Ver localização aproximada"
              }
              onPress={() =>
                router.navigate({
                  pathname: "/mapa",
                  params: row.lugar_id
                    ? { placeId: row.lugar_id, reportId: "" }
                    : { reportId: row.id, placeId: "" },
                })
              }
            />
          )}
          {kind === "avaliacao" && row.lugar_id && (
            <Action
              title="Editar avaliação"
              onPress={() =>
                router.push({
                  pathname: "/avaliar",
                  params: { placeId: row.lugar_id! },
                })
              }
            />
          )}
          {pending && !edit && (
            <Action
              secondary
              title="Corrigir meu registro"
              busy={busy}
              onPress={() => setEdit(true)}
            />
          )}
          {edit && (
            <>
              <Text style={shared.note}>
                Você pode corrigir o texto enquanto o registro aguarda análise.
                O local vinculado permanece o mesmo.
              </Text>
              {kind === "melhoria" && (
                <Field
                  label="Título"
                  value={title}
                  onChangeText={setTitle}
                  editable={!busy}
                  maxLength={100}
                />
              )}
              <Field
                label="Descrição"
                value={text}
                onChangeText={setText}
                editable={!busy}
                multiline
                maxLength={1000}
              />
              <Action
                title="Salvar correção"
                busy={busy}
                onPress={() => void save(false)}
              />
              <Action
                secondary
                title="Cancelar edição"
                busy={busy}
                onPress={() => setEdit(false)}
              />
            </>
          )}
          {pending && !edit && (
            <Action
              secondary
              title="Retirar meu registro"
              busy={busy}
              onPress={() => setConfirm(true)}
            />
          )}
          {confirm && (
            <>
              <Text style={shared.note}>
                Retirar este registro? O histórico será preservado e ele sairá
                da fila de análise.
              </Text>
              <Action
                title="Confirmar retirada"
                busy={busy}
                onPress={() => void save(true)}
              />
              <Action
                secondary
                title="Manter registro"
                busy={busy}
                onPress={() => setConfirm(false)}
              />
            </>
          )}
          {row.proprio && valid && (
            <HistoryList key={version} kind={kind} id={row.id} />
          )}
        </View>
      )}
    </FeaturePage>
  );
}
