import { AdminFilters, adminStatuses as statuses } from "./AdminFilters";
import { CollectionState } from "../../components/shared/CollectionState";
import { LoadingIndicator } from "../../components/loading/LoadingIndicator";
import { type Cursor } from "../../lib/pagination";
import { palette } from "../../constants/theme";
import { useCallback, useEffect, useRef, useState } from "react";
import { FlatList, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { FeaturePage, Action, Field, Message, shared } from "../../components/shared/FeaturePage";
import { TouchFeedback } from "../../components/TouchFeedback";
import { placeCategories } from "../../constants/placeCategories";
import { friendlyError } from "../../lib/supabase";
import { useProfile } from "../profile/ProfileProvider";
import { isAdministrator } from "../auth/authorization";
import { usePagedList } from "../profile/usePagedList";
import { HistoryList } from "../reports/HistoryList";
import { statusLabels } from "../reports/records";
import { AdminKind, AdminRow, adminList, adminSummary, classify, moderate } from "./admin";
const countLabels: Record<string, string> = {
  relatos_pendentes: "Relatos em análise",
  melhorias_solicitadas: "Melhorias solicitadas",
  perfis: "Cadastros",
  lugares: "Lugares",
  avaliacoes: "Avaliações",
  eventos: "Eventos",
  enquetes: "Enquetes",
};
export default function AdminScreen() {
  const { role } = useProfile();
  return (
    <FeaturePage title="Administração" scroll={false}>
      {!isAdministrator(role) ? (
        <Message text="Acesso exclusivo de administrador." />
      ) : (
        <AdminContent admin={role === "admin"} />
      )}
    </FeaturePage>
  );
}
function AdminContent({ admin }: { admin: boolean }) {
  const [kind, setKind] = useState<AdminKind>("relato"),
    [query, setQuery] = useState(""),
    [search, setSearch] = useState(""),
    [status, setStatus] = useState("pendente"),
    [summary, setSummary] = useState<Record<string, number>>({}),
    [error, setError] = useState(""),
    [selected, setSelected] = useState<AdminRow | null>(null),
    [nextStatus, setNextStatus] = useState(""),
    [reason, setReason] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [summaryVersion, setSummaryVersion] = useState(0);
  const lock = useRef(false);
  const loader = useCallback(
      (cursor: Cursor | null) => adminList(kind, search, status, cursor),
      [kind, search, status],
    ),
    list = usePagedList(loader, `${kind}:${search}:${status}`);
  useFocusEffect(
    useCallback(() => {
      void summaryVersion;
      let active = true;
      void adminSummary()
        .then((data) => {
          if (active) setSummary(data);
        })
        .catch((e) => {
          if (active) setError(friendlyError(e));
        });
      return () => {
        active = false;
      };
    }, [summaryVersion]),
  );
  useEffect(() => {
    const timer = setTimeout(() => setSearch(query.trim()), 350);
    return () => clearTimeout(timer);
  }, [query]);
  function changeKind(value: AdminKind) {
    if (lock.current) return;
    setKind(value);
    setStatus(
      value === "relato" || value === "avaliacao"
        ? "pendente"
        : value === "melhoria"
          ? "solicitada"
          : "",
    );
    setSelected(null);
    setReason("");
    setMessage("");
  }
  function select(row: AdminRow) {
    if (lock.current) return;
    setSelected(row);
    setNextStatus(kind === "lugar" ? (row.categoria_app ?? "") : "");
    setReason("");
    setError("");
    setMessage("");
  }
  async function save() {
    if (!selected || lock.current) return;
    if (kind !== "lugar" && (!nextStatus || nextStatus === selected.status)) {
      setError("Escolha explicitamente um status diferente.");
      return;
    }
    if (reason.trim().length < 5) {
      setError("Explique a decisão em pelo menos 5 caracteres.");
      return;
    }
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      if (kind === "lugar") await classify(selected, nextStatus, reason.trim());
      else if (kind !== "perfil")
        await moderate(kind, selected, nextStatus, reason.trim());
      setSelected(null);
      setMessage("Alteração salva com histórico.");
      list.refresh();
      setSummaryVersion((v) => v + 1);
    } catch (e) {
      setError(friendlyError(e));
      if ((e as { code?: string })?.code === "40001") {
        setSelected(null);
        setReason("");
        list.refresh();
        setMessage(
          "A lista foi recarregada. Revise o conteúdo atualizado antes de decidir.",
        );
      }
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  const header = (
    <View style={{ gap: 14, marginBottom: 14 }}>
      <Text style={shared.note}>
        {admin ? "Administrador" : "Moderador"} · decisões são registradas no
        histórico.
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {Object.entries(summary).map(([name, value]) => (
          <View
            key={name}
            style={[shared.card, { minWidth: 145, flexGrow: 1 }]}
          >
            <Text
              style={{ fontSize: 24, color: palette.brand, fontWeight: "800" }}
            >
              {value}
            </Text>
            <Text style={shared.note}>{countLabels[name] ?? name}</Text>
          </View>
        ))}
      </View>
      {admin && (
        <Action
          secondary
          title="Publicar evento ou enquete"
          onPress={() => router.push("/admin-publicar")}
        />
      )}
      {admin && (
        <Action
          secondary
          title="Gerenciar eventos e enquetes"
          onPress={() => router.push("/admin-publicacoes")}
        />
      )}
      {admin && (
        <Action secondary title="Gerenciar equipe e permissões" onPress={() => router.push("/admin-equipe")} />
      )}
      <AdminFilters
        admin={admin}
        kind={kind}
        query={query}
        status={status}
        busy={busy}
        onKind={changeKind}
        onQuery={setQuery}
        onStatus={(value) => {
          setStatus(value);
          setSelected(null);
          setError("");
        }}
        onClear={() => {
          setQuery("");
          setSearch("");
          setStatus("");
          setSelected(null);
          setError("");
        }}
      />
      <Message text={message} />
      <Message
        text={!selected ? error || (list.rows.length ? list.error : "") : ""}
        error
      />
      <Text style={shared.note}>
        {list.rows.length} registros carregados · mais recentes primeiro.
      </Text>
      {!!list.error && list.rows.length > 0 && (
        <Action
          secondary
          title="Tentar carregar novamente"
          onPress={list.refresh}
        />
      )}
    </View>
  );
  return (
    <FlatList
      data={list.rows}
      keyExtractor={(r) => r.id}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      ListHeaderComponent={header}
      refreshing={list.loading}
      onRefresh={list.refresh}
      onEndReached={list.more}
      ListFooterComponent={
        list.loading && list.rows.length ? (
          <LoadingIndicator
            label="Carregando mais registros"
            style={{ padding: 16 }}
          />
        ) : list.hasMore ? (
          <Action
            secondary
            title="Carregar mais registros"
            onPress={list.more}
          />
        ) : null
      }
      ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      ListEmptyComponent={
        <CollectionState
          loading={list.loading}
          error={list.error}
          title="Nenhum registro nesse filtro"
          message="Tente outro termo ou remova os filtros para ampliar a busca."
          onRetry={list.refresh}
          onClear={
            query || status
              ? () => {
                  setQuery("");
                  setSearch("");
                  setStatus("");
                  setSelected(null);
                  setError("");
                }
              : undefined
          }
        />
      }
      renderItem={({ item }) => (
        <View style={shared.card}>
          <Text style={shared.title}>
            {item.titulo ?? item.local_texto ?? item.categoria}
          </Text>
          <Text style={shared.note}>{item.descricao}</Text>
          {item.status && (
            <Text style={{ color: palette.brand, fontWeight: "600" }}>
              {statusLabels[item.status] ?? item.status}
              {item.sentimento ? ` · ${item.sentimento}` : ""}
            </Text>
          )}
          {kind === "lugar" && (
            <Text style={shared.note}>
              OSM: {item.categoria ?? "Sem categoria"} · Categoria do app:{" "}
              {item.categoria_app ?? "Automática"}
            </Text>
          )}
          <Text style={shared.note}>
            {new Date(item.criado_em).toLocaleDateString("pt-BR")}
          </Text>
          {admin && item.lugar_id && (
            <Action
              secondary
              title="Revisar cadastro do lugar vinculado"
              busy={busy}
              onPress={() =>
                router.push({
                  pathname: "/admin-lugar",
                  params: { id: item.lugar_id! },
                })
              }
            />
          )}
          {kind === "lugar" && (
            <Action
              secondary
              title="Corrigir dados do lugar"
              busy={busy}
              onPress={() =>
                router.push({
                  pathname: "/admin-lugar",
                  params: { id: item.id },
                })
              }
            />
          )}
          {kind !== "perfil" && item.status !== "retirado" && (
            <Action
              secondary
              title={
                kind === "lugar" ? "Revisar classificação" : "Atualizar status"
              }
              onPress={() => {
                if (!busy) select(item);
              }}
            />
           )}
          {selected?.id === item.id && (
            <View style={{ gap: 12, marginTop: 10 }}>
              <Text style={shared.title}>
                {kind === "lugar" ? "Categoria no app" : "Novo status"}
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {(kind === "lugar"
                  ? [
                      { id: "", label: "Automática" },
                      ...placeCategories.filter((c) => c.id !== "all"),
                    ]
                  : statuses[kind]!.map((s) => ({
                      id: s,
                      label: statusLabels[s],
                    }))
                ).map((option) => (
                  <TouchFeedback
                    key={option.id}
                    label={option.label}
                    selected={nextStatus === option.id}
                    disabled={busy}
                    onPress={() => setNextStatus(option.id)}
                    style={[
                      shared.chip,
                      nextStatus === option.id && {
                        backgroundColor: palette.brand,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color:
                          nextStatus === option.id ? "white" : palette.brand,
                      }}
                    >
                      {option.label}
                    </Text>
                  </TouchFeedback>
                ))}
              </View>
              <Field
                label="Motivo da decisão"
                value={reason}
                onChangeText={setReason}
                multiline
                maxLength={500}
              />
              <Message text={error} error />
              <Action
                title="Salvar decisão"
                busy={busy}
                onPress={() => void save()}
              />
              <Action
                secondary
                title="Cancelar"
                busy={busy}
                onPress={() => setSelected(null)}
              />
              <HistoryList
                kind={kind as "relato" | "melhoria" | "avaliacao" | "lugar"}
                id={item.id}
              />
            </View>
          )}
        </View>
      )}
    />
  );
}
