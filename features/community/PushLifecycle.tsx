import { useEffect } from "react";
import { AppState } from "react-native";
import { router } from "expo-router";
import { useSession } from "../auth/SessionProvider";
import { enablePush, listenPush } from "../../services/push";
export function PushLifecycle() {
  const { session } = useSession(),
    owner = session?.user.id;
  useEffect(() => {
    if (!owner) return;
    let active = true,
      dispose = () => {};
    const sync = () => {
      if (active) void enablePush(owner, false).catch(() => {});
    };
    sync();
    void listenPush(() => {
      if (active) router.push("/notificacoes");
    }, sync)
      .then((cleanup) => {
        if (active) dispose = cleanup;
        else cleanup();
      })
      .catch(() => {});
    const app = AppState.addEventListener("change", (state) => {
      if (state === "active") sync();
    });
    return () => {
      active = false;
      dispose();
      app.remove();
    };
  }, [owner]);
  return null;
}
