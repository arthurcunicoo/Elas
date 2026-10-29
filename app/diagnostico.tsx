import * as Sentry from "@sentry/react-native";
import { nativeApplicationVersion, nativeBuildVersion } from "expo-application";
import { Alert, Text, useWindowDimensions } from "react-native";
import { FeaturePage } from "../components/shared/FeaturePage";
import { Action } from "../components/shared/FormControls";
import { monitoringEnabled } from "../lib/monitoring";
// Deliberately unavailable in production; used only by a dedicated staging build.
export default function Diagnostics() {
  const { fontScale, width, height } = useWindowDimensions();
  const backendHost = new URL(
    process.env.EXPO_PUBLIC_SUPABASE_URL ?? "https://unconfigured.invalid",
  ).host;
  const enabled =
    process.env.EXPO_PUBLIC_APP_ENV === "staging" &&
    process.env.EXPO_PUBLIC_QA_DIAGNOSTICS === "1";
  if (!enabled)
    return (
      <FeaturePage title="Indisponível">
        <Text>Esta página não está disponível nesta versão.</Text>
      </FeaturePage>
    );
  return (
    <FeaturePage title="Diagnóstico QA">
      <Text testID="qa-backend">Backend: {backendHost}</Text>
      <Text testID="qa-build">
        App: {nativeApplicationVersion ?? "unknown"} | build:{" "}
        {nativeBuildVersion ?? "unknown"}
      </Text>
      <Text testID="qa-font-scale">
        Escala de fonte: {fontScale.toFixed(2)} · {width} × {height}
      </Text>
      <Text>
        {monitoringEnabled
          ? "Monitoramento configurado. Confira os eventos no projeto de staging."
          : "DSN de monitoramento ausente nesta build."}
      </Text>
      <Action
        title="Enviar exceção de teste"
        disabled={!monitoringEnabled}
        onPress={() => {
          Sentry.captureException(new Error("ELAS_QA_PROBE"));
        }}
      />
      <Action
        title="Testar crash nativo"
        disabled={!monitoringEnabled}
        onPress={() =>
          Alert.alert(
            "Encerrar app de teste?",
            "O aplicativo QA será encerrado. Reabra para conferir o envio do crash.",
            [
              { text: "Cancelar", style: "cancel" },
              {
                text: "Encerrar QA",
                style: "destructive",
                onPress: () => Sentry.nativeCrash(),
              },
            ],
          )
        }
      />
    </FeaturePage>
  );
}
