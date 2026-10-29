import { useServiceTimeZone } from "../hooks/useServiceTimeZone";
import { CollectionState } from "../components/shared/CollectionState";
import { type Cursor } from "../lib/pagination";
import { palette } from "../constants/theme";
import { useCallback, useRef, useState } from "react";
import { FlatList, Text, View } from "react-native";
import { FeaturePage, Field, Action, Message, shared } from "../components/shared/FeaturePage";
import { TouchFeedback } from "../components/TouchFeedback";
import { ProfileDialog, ProfileNotice } from "../components/ProfileDialog";
import { CityDateTime } from "../components/CityDateTime";
import { cityDateParts, cityInstant } from "../features/community/dates";
import { Publication, publications, manage } from "../features/admin/publications";
import { useProfile } from "../features/profile/ProfileProvider";
import { usePagedList } from "../features/profile/usePagedList";
import { friendlyError } from "../lib/supabase";
export default function PublicationsScreen() {
  const { role } = useProfile();
  return (
    <FeaturePage title="Gerenciar publicações" scroll={false}>
      {role === "admin" ? (
        <Content />
      ) : (
        <Message text="Acesso exclusivo de administrador." />
      )}
    </FeaturePage>
  );
}
function Content() {
  const serviceTimeZone = useServiceTimeZone();
  const [editZone,setEditZone]=useState(serviceTimeZone);
  const [kind, setKind] = useState<"evento" | "enquete">("evento"),
    [selected, setSelected] = useState<Publication | null>(null),
    [title, setTitle] = useState(""),
    [description, setDescription] = useState(""),
    [place, setPlace] = useState(""),
    [date, setDate] = useState(""),
    [time, setTime] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState<ProfileNotice | null>(null);
  const lock = useRef(false),
    load = useCallback(
      (cursor: Cursor | null) => publications(kind, cursor),
      [kind],
    ),
    list = usePagedList(load, kind);
  function edit(row: Publication) {
    if (lock.current) return;
    setEditZone(serviceTimeZone);
    const parts = cityDateParts(row.inicia_em ?? row.encerra_em!, serviceTimeZone);
    setSelected(row);
    setTitle(row.titulo ?? row.pergunta!);
    setDescription(row.descricao ?? "");
    setPlace(row.local_texto ?? "");
    setDate(parts.date);
    setTime(parts.time);
    setError("");
  }
  async function run(row: Publication, action: string) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const payload: Record<string, string> =
        action === "editar"
          ? kind === "evento"
            ? {
                titulo: title,
                descricao: description,
                local_texto: place,
                inicia_em: cityInstant(date, time, editZone),
              }
            : { pergunta: title, encerra_em: cityInstant(date, time, editZone) }
          : {};
      await manage(kind, row, action, payload);
      setSelected(null);
      list.refresh();
    } catch (e) {
      setError(
        e instanceof Error && !("code" in e) ? e.message : friendlyError(e),
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  function confirm(row: Publication, action: string) {
    setNotice({
      title:
        action === "cancelar"
          ? "Cancelar evento?"
          : action === "encerrar"
            ? "Encerrar enquete?"
            : action === "ocultar"
              ? "Retirar publicação?"
              : "Publicar novamente?",
      message: "Inscrições, votos e histórico serão preservados.",
      confirmLabel: "Confirmar",
      confirm: () => void run(row, action),
    });
  }
  return (
    <>
      <Message text={error || list.error} error />
      <View style={shared.row}>
        {(["evento", "enquete"] as const).map((k) => (
          <TouchFeedback
            disabled={busy}
            label={k === "evento" ? "Eventos" : "Enquetes"}
            selected={kind === k}
            key={k}
            onPress={() => {
              setKind(k);
              setSelected(null);
            }}
            style={[
              shared.chip,
              kind === k && { backgroundColor: palette.brand },
            ]}
          >
            <Text style={{ color: kind === k ? "white" : palette.brand }}>
              {k === "evento" ? "Eventos" : "Enquetes"}
            </Text>
          </TouchFeedback>
        ))}
      </View>
      <FlatList
        data={list.rows}
        keyExtractor={(r) => r.id}
        refreshing={list.loading}
        onRefresh={list.refresh}
        onEndReached={list.more}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ gap: 14, paddingVertical: 6, paddingHorizontal: 2 }}
        ListEmptyComponent={
          <CollectionState
            loading={list.loading}
            error={list.error}
            title="Nenhuma publicação encontrada"
            message="Eventos e enquetes cadastrados aparecerão aqui."
            skeleton="cards"
            onRetry={list.refresh}
          />
        }

        renderItem={({ item }) => (
          <View style={shared.card}>
            <Text style={shared.title}>{item.titulo ?? item.pergunta}</Text>
            <Text style={shared.note}>
              {item.publicado ? "Publicado" : "Oculto"}
              {item.cancelado ? " · Cancelado" : ""} ·{" "}
              {new Date(item.inicia_em ?? item.encerra_em!).toLocaleString(
                "pt-BR",
                { timeZone: serviceTimeZone },
              )}
            </Text>
            {selected?.id === item.id ? (
              <>
                <Field
                  label={kind === "evento" ? "Título" : "Pergunta"}
                  value={title}
                  onChangeText={setTitle}
                  editable={!busy}
                  maxLength={kind === "evento" ? 100 : 200}
                />
                {kind === "evento" && (
                  <>
                    <Field
                      label="Descrição"
                      value={description}
                      onChangeText={setDescription}
                      editable={!busy}
                      multiline
                      maxLength={2000}
                    />
                    <Field
                      label="Local"
                      value={place}
                      onChangeText={setPlace}
                      editable={!busy}
                      maxLength={150}
                    />
                  </>
                )}
                <CityDateTime timeZone={editZone}
                  date={date}
                  time={time}
                  onDate={setDate}
                  onTime={setTime}
                  disabled={busy}
                />
                <Text style={shared.note}>
                  Enquetes com votos ou encerradas preservam a pergunta e as
                  opções. Os votos nunca são apagados.
                </Text>
                <Action
                  title="Salvar alterações"
                  busy={busy}
                  onPress={() => void run(item, "editar")}
                />
                <Action
                  secondary
                  title="Cancelar edição"
                  busy={busy}
                  onPress={() => setSelected(null)}
                />
              </>
            ) : (
              <>
                <Action
                  secondary
                  title="Editar publicação"
                  busy={busy}
                  onPress={() => edit(item)}
                />
                <Action
                  secondary
                  title={
                    item.publicado ? "Retirar publicação" : "Publicar novamente"
                  }
                  busy={busy}
                  onPress={() =>
                    confirm(item, item.publicado ? "ocultar" : "publicar")
                  }
                />
                {kind === "evento" && !item.cancelado && (
                  <Action
                    secondary
                    title="Cancelar evento"
                    busy={busy}
                    onPress={() => confirm(item, "cancelar")}
                  />
                )}
                {kind === "enquete" &&
                  new Date(item.encerra_em!).getTime() > Date.now() && (
                    <Action
                      secondary
                      title="Encerrar enquete agora"
                      busy={busy}
                      onPress={() => confirm(item, "encerrar")}
                    />
                  )}
              </>
            )}
          </View>
        )}
      />
      <ProfileDialog notice={notice} onClose={() => setNotice(null)} />
    </>
  );
}
