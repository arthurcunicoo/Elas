import { OfflinePlaces } from "../map/OfflinePlaces";
import { LoadingState } from "../../components/loading/LoadingState";
import { signOut } from "../../services/account";
import { palette } from "../../constants/theme";
import { checkBackendSchema, backendMessages, type BackendState } from "../../services/backendSchema";
import { clearAccountDrafts } from "../reports/drafts";
import { ReactNode, useEffect, useState } from "react";
import { Text, View } from "react-native";
import { Action, shared } from "../../components/shared/FeaturePage";
import { useSession } from "./SessionProvider";
import { backendConfigured, friendlyError } from "../../lib/supabase";
export function SchemaGate({ children }: { children: ReactNode }) {
  const { session } = useSession(),
    id = session?.user.id;
  const [state, setState] = useState<{
      owner?: string;
      ready: boolean;
      status: BackendState;
    }>({ ready: false, status: "unavailable" }),
    [retry, setRetry] = useState(0);
  const [exitError, setExitError] = useState("");
  const [offlineOwner, setOfflineOwner] = useState("");
  useEffect(() => {
    void retry;
    let active = true;
    if (!backendConfigured || !id) return;
    setState({ owner: id, ready: false, status: "unavailable" });
    void checkBackendSchema().then((status) => {
      if (active) setState({ owner: id, ready: true, status });
    });
    return () => {
      active = false;
    };
  }, [id, retry]);
  if (!backendConfigured || !id) return children;
  if (state.owner !== id || !state.ready)
    return (
      <LoadingState
        fullScreen
        title="Quase tudo pronto"
        message="Conectando você à sua comunidade."
      />
    );
  if (state.status === "available") return children;
  if (
    offlineOwner === id &&
    ["connection", "timeout", "unavailable"].includes(state.status)
  )
    return (
      <OfflinePlaces
        owner={id}
        onReconnect={() => {
          setOfflineOwner("");
          setRetry((v) => v + 1);
        }}
      />
    );
  const message = backendMessages[state.status];
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        padding: 24,
        gap: 18,
        backgroundColor: palette.surfaceTint,
      }}
    >
      <Text accessibilityRole="header" style={shared.title}>
        {message.title}
      </Text>
      <Text style={shared.note}>{message.message}</Text>
      {["connection", "timeout", "unavailable"].includes(state.status) && (
        <Action
          secondary
          title="Consultar lugares salvos offline"
          onPress={() => setOfflineOwner(id)}
        />
      )}
      <Action
        title="Verificar novamente"
        onPress={() => setRetry((v) => v + 1)}
      />
      {!!exitError && (
        <Text accessibilityRole="alert" style={shared.note}>
          {exitError}
        </Text>
      )}
      <Action
        secondary
        title="Sair da conta"
        onPress={() => {
          setExitError("");
          void signOut()
            .then(async () => {
              if (id) await clearAccountDrafts(id);
            })
            .catch((error) => setExitError(friendlyError(error)));
        }}
      />
    </View>
  );
}
