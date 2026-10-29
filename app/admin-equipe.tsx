import {useCallback, useEffect, useRef, useState} from "react";
import {FlatList, Text, View} from "react-native";
import {FeaturePage, Field, Action, Message, shared} from "../components/shared/FeaturePage";
import {CollectionState} from "../components/shared/CollectionState";
import {ProfileDialog, type ProfileNotice} from "../components/ProfileDialog";
import {useProfile} from "../features/profile/ProfileProvider";
import {useSession} from "../features/auth/SessionProvider";
import {isAdministrator, type UserRole} from "../features/auth/authorization";
import {usePagedList} from "../features/profile/usePagedList";
import {changeRole, rolePage, type RoleRecord} from "../services/adminRoles";
import {friendlyError} from "../lib/supabase";
import type {Cursor} from "../lib/pagination";
const labels: Record<UserRole, string> = {usuario: "Usuário", moderador: "Moderador", admin: "Administrador"};
export default function TeamScreen() {
  const {role} = useProfile();
  return <FeaturePage title="Equipe e permissões" scroll={false}>
    {isAdministrator(role) ? <TeamContent /> : <Message text="Acesso exclusivo de administrador." />}
  </FeaturePage>;
}
function TeamContent() {
  const {session} = useSession(), {refresh} = useProfile();
  const [query,setQuery] = useState(""), [search,setSearch] = useState(""), [history,setHistory] = useState(false);
  const [selected,setSelected] = useState<RoleRecord | null>(null), [reason,setReason] = useState("");
  const [busy,setBusy] = useState(false), [error,setError] = useState(""), [message,setMessage] = useState("");
  const [notice,setNotice] = useState<ProfileNotice | null>(null), lock = useRef(false);
  useEffect(() => {const timer = setTimeout(() => setSearch(query.trim()),350); return () => clearTimeout(timer);}, [query]);
  const load = useCallback((cursor: Cursor | null) => rolePage(history ? "" : search, history, cursor), [history,search]);
  const list = usePagedList(load, `roles:${history}:${search}`);
  async function save(row: RoleRecord, role: UserRole, justification: string) {
    if (lock.current) return;
    lock.current = true;setBusy(true);setError("");setMessage("");
    try {
      await changeRole(row,role,justification);
      setSelected(null);setReason("");setMessage("Permissão atualizada e registrada no histórico.");
      list.refresh();await refresh();
    } catch (cause) {
      setError(friendlyError(cause));
      if ((cause as {code?: string})?.code === "40001") {setSelected(null);list.refresh();}
    } finally {lock.current = false;setBusy(false);}
  }
  function confirm(row: RoleRecord, role: UserRole) {
    if (reason.trim().length < 5) {setError("Explique a alteração em pelo menos 5 caracteres.");return;}
    const justification = reason.trim();
    setNotice({title: "Alterar permissão?", message: `${row.nome}: de ${labels[row.papel!]} para ${labels[role]}. A decisão ficará no histórico.`,
      confirmLabel: "Confirmar alteração", confirm: () => void save(row,role,justification)});
  }
  const header = <View style={{gap: 12,marginBottom: 14}}>
    <Text style={shared.note}>Conceda acesso apenas a integrantes da equipe. O último administrador não pode ser removido.</Text>
    <Action secondary title={history ? "Ver contas" : "Ver histórico de permissões"} busy={busy} onPress={() => {setHistory(!history);setSelected(null);setError("");}} />
    {!history && <Field label="Buscar pelo nome" value={query} onChangeText={setQuery} maxLength={100} editable={!busy} />}
    <Message text={error || list.error} error /><Message text={message} />
  </View>;
  return <>
    <FlatList data={list.rows} keyExtractor={row => row.id} keyboardShouldPersistTaps="handled" ListHeaderComponent={header}
      refreshing={list.loading} onRefresh={list.refresh} onEndReached={list.more} contentContainerStyle={{gap: 12}}
      ListEmptyComponent={<CollectionState loading={list.loading} error={list.error} title={history ? "Sem alterações registradas" : "Nenhuma conta encontrada"}
        message={history ? "As próximas alterações de permissão aparecerão aqui." : "Tente outro nome ou limpe a busca."} onRetry={list.refresh} onClear={search ? () => setQuery("") : undefined} />}
      ListFooterComponent={list.hasMore ? <Action secondary title="Carregar mais" busy={list.loading || busy} onPress={list.more} /> : null}
      renderItem={({item}) => <View style={shared.card}>
        <Text style={shared.title}>{item.nome}{!history && item.id === session?.user.id ? " · Você" : ""}</Text>
        {history ? <>
          <Text style={shared.note}>{labels[item.anterior!]} → {labels[item.novo!]}</Text>
          <Text style={shared.note}>{item.motivo}</Text>
          <Text style={shared.note}>{item.responsavel} · {new Date(item.criado_em!).toLocaleString("pt-BR")}</Text>
        </> : <>
          <Text style={shared.note}>{labels[item.papel!]}</Text>
          <Action secondary title={selected?.id === item.id ? "Cancelar alteração" : "Alterar permissão"} busy={busy} onPress={() => {setSelected(selected?.id === item.id ? null : item);setReason("");setError("");}} />
          {selected?.id === item.id && <>
            <Field label="Motivo da alteração" value={reason} onChangeText={setReason} maxLength={500} multiline editable={!busy} />
            {(["usuario","moderador","admin"] as const).filter(role => role !== item.papel).map(role =>
              <Action key={role} secondary title={role === "usuario" ? "Remover acesso da equipe" : `Tornar ${labels[role].toLowerCase()}`} busy={busy} onPress={() => confirm(item,role)} />)}
          </>}
        </>}
      </View>} />
    <ProfileDialog notice={notice} onClose={() => setNotice(null)} />
  </>;
}
