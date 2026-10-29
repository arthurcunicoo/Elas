import { useCallback, useRef, useState } from "react";
import { AppState, Linking, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { AccountAction, AccountMessage, accountStyles } from "../../components/AccountForm";
import { friendlyError } from "../../lib/supabase";
import { disablePush, enablePush, pushState } from "../../services/push";
import { useSession } from "../auth/SessionProvider";
export function PushSettings() {
  const { session } = useSession();
  const [state, setState] = useState({ disponivel: false, ativo: false }),
    [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  const mounted = useRef(false),
    lock = useRef(false),
    generation = useRef(0);
  useFocusEffect(
    useCallback(() => {
      mounted.current = true;
      let active = true;
      const refresh = () => {
        const current = ++generation.current;
        void pushState()
          .then((value) => {
            if (active && current === generation.current) setState(value);
          })
          .catch((e) => {
            if (active && current === generation.current)
              setError(friendlyError(e));
          })
          .finally(() => {
            if (active && current === generation.current) setLoading(false);
          });
      };
      refresh();
      const app = AppState.addEventListener("change", (value) => {
        if (value === "active") refresh();
      });
      return () => {
        active = false;
        ++generation.current;
        mounted.current = false;
        app.remove();
      };
    }, []),
  );
  async function toggle() {
    if (!session || lock.current) return;
    const current = ++generation.current;
    lock.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (state.ativo) await disablePush();
      else await enablePush(session.user.id);
      const next = await pushState();
      if (mounted.current && current === generation.current) {
        setState(next);
        setMessage(
          next.ativo
            ? "Notificações ativadas neste aparelho."
            : "Notificações desativadas neste aparelho.",
        );
      }
    } catch (e) {
      if (mounted.current && current === generation.current)
        setError(friendlyError(e));
    } finally {
      lock.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  return (
    <View style={accountStyles.card}>
      <Text style={accountStyles.section}>Notificações no celular</Text>
      <Text style={accountStyles.detail}>
        Receba atualizações dos seus relatos, avaliações e solicitações. Você
        escolhe se quer receber neste aparelho.
      </Text>
      <Text style={accountStyles.detail}>
        {loading
          ? "Verificando disponibilidade…"
          : state.ativo
            ? "Ativadas neste aparelho"
            : state.disponivel
              ? "Desativadas neste aparelho"
              : "Push ainda indisponível nesta versão. Suas atualizações continuam na caixa de notificações do app."}
      </Text>
      <AccountMessage text={message} />
      <AccountMessage text={error} error />
      {(state.disponivel || state.ativo) && (
        <AccountAction
          title={state.ativo ? "Desativar notificações" : "Ativar notificações"}
          busy={busy}
          disabled={loading || busy}
          onPress={() => void toggle()}
        />
      )}
      {state.disponivel && (
        <AccountAction
          title="Abrir ajustes do celular"
          secondary
          onPress={() =>
            void Linking.openSettings().catch(() =>
              setError("Não foi possível abrir os ajustes."),
            )
          }
        />
      )}
    </View>
  );
}
