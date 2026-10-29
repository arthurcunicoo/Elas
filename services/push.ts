import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { isDevice } from "expo-device";
import { randomUUID } from "expo-crypto";
import { Platform } from "react-native";
import { backendConfigured, requireBackend } from "../lib/supabase";
import { isPushData, isPushToken, serialTasks } from "../lib/push";
import type { NotificationResponse } from "expo-notifications";
const installationKey = "elas.push.installation.v1",
  preferenceKey = "elas.push.preference.v1";
const serial = serialTasks();
export const pushSupported =
  Platform.OS !== "web" &&
  isDevice &&
  Constants.executionEnvironment !== "storeClient";
const projectId = () =>
  Constants.easConfig?.projectId ??
  (Constants.expoConfig?.extra?.eas?.projectId as string | undefined);
type Preference = { owner: string; enabled: boolean };
async function preference(): Promise<Preference | null> {
  try {
    return JSON.parse(
      (await AsyncStorage.getItem(preferenceKey)) ?? "null",
    ) as Preference | null;
  } catch {
    return null;
  }
}
async function installation(create = false) {
  let id = await AsyncStorage.getItem(installationKey);
  if (!id && create) {
    id = randomUUID();
    await AsyncStorage.setItem(installationKey, id);
  }
  return id;
}
async function readPushState() {
  if (!pushSupported || !backendConfigured || !projectId())
    return { disponivel: false, ativo: false };
  const { data, error } = await requireBackend().rpc("estado_push", {
    p_instalacao: (await installation()) ?? undefined,
  });
  if (error) throw error;
  const value = data as { disponivel?: boolean; ativo?: boolean };
  const permission =
    value.ativo === true
      ? await (await import("expo-notifications")).getPermissionsAsync()
      : null;
  return {
    disponivel: value.disponivel === true,
    ativo: value.ativo === true && permission?.granted === true,
  };
}
// Reads must wait for an ongoing registration/revocation as well.
export const pushState = () => serial(readPushState);
export const disablePush = () =>
  serial(async () => {
    if (!pushSupported || !backendConfigured) return;
    const id = await installation();
    if (id) {
      const { error } = await requireBackend().rpc("desativar_push", {
        p_instalacao: id,
      });
      if (error) throw error;
    }
    await AsyncStorage.removeItem(preferenceKey);
  });
export const enablePush = (owner: string, interactive = true) =>
  serial(async () => {
    if (!pushSupported || !projectId())
      throw new Error(
        "Push exige uma versão instalada em aparelho compatível.",
      );
    const saved = await preference();
    if (!interactive && (!saved?.enabled || saved.owner !== owner)) return;
    const state = await readPushState();
    if (!state.disponivel) {
      if (interactive)
        throw new Error("Push ainda não está disponível nesta versão.");
      return;
    }
    const notifications = await import("expo-notifications");
    if (Platform.OS === "android")
      await notifications.setNotificationChannelAsync("participacao", {
        name: "Atualizações das suas participações",
        importance: notifications.AndroidImportance.DEFAULT,
      });
    let permission = await notifications.getPermissionsAsync();
    if (!permission.granted && interactive && permission.canAskAgain)
      permission = await notifications.requestPermissionsAsync();
    if (!permission.granted) {
      const id = await installation();
      if (id) {
        const { error } = await requireBackend().rpc("desativar_push", {
          p_instalacao: id,
        });
        if (error) throw error;
      }
      await AsyncStorage.removeItem(preferenceKey);
      if (interactive)
        throw new Error(
          "Permita notificações nos ajustes do celular para receber atualizações.",
        );
      return;
    }
    const token = (
      await notifications.getExpoPushTokenAsync({ projectId: projectId()! })
    ).data;
    if (!isPushToken(token))
      throw new Error(
        "Não foi possível registrar notificações neste aparelho.",
      );
    const { error } = await requireBackend().rpc("registrar_push", {
      p_instalacao: (await installation(true))!,
      p_token: token,
      p_plataforma: Platform.OS,
      p_projeto: projectId()!,
      p_usuario: owner,
    });
    if (error) throw error;
    await AsyncStorage.setItem(
      preferenceKey,
      JSON.stringify({ owner, enabled: true }),
    );
  });
export async function listenPush(open: () => void, rotate: () => void) {
  if (!pushSupported || !projectId()) return () => {};
  const notifications = await import("expo-notifications");
  notifications.setNotificationHandler({
    handleNotification: async (notification) => ({
      shouldShowBanner: isPushData(notification.request.content.data),
      shouldShowList: isPushData(notification.request.content.data),
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
  let active = true;
  const seen = new Set<string>();
  const response = (value: NotificationResponse) => {
    if (
      !active ||
      !isPushData(value.notification.request.content.data) ||
      seen.has(value.notification.request.identifier)
    )
      return;
    seen.add(value.notification.request.identifier);
    open();
    void notifications.clearLastNotificationResponseAsync().catch(() => {});
  };
  const presses =
    notifications.addNotificationResponseReceivedListener(response);
  const tokens = notifications.addPushTokenListener(rotate);
  void notifications
    .getLastNotificationResponseAsync()
    .then((value) => {
      if (value) response(value);
    })
    .catch(() => {});
  return () => {
    active = false;
    presses.remove();
    tokens.remove();
  };
}
