import { LoadingState } from "../components/loading/LoadingState";
import { withMonitoring, navigationIntegration, setMonitoringRoute } from "../lib/monitoring";
import { colors, typography } from "../constants/theme";
import { useEffect, useState } from "react";
import { ParticipationSheet } from "../components/ParticipationSheet";
import { PushLifecycle } from "../features/community/PushLifecycle";
import { showcaseEnabled } from "../lib/appMode";
import { SchemaGate } from "../features/auth/SchemaGate";
import { AppDataProvider } from "../providers/AppData";
import { backendConfigured, configError } from "../lib/supabase";
import { useSession } from "../features/auth/SessionProvider";
import { useProfile } from "../features/profile/ProfileProvider";
import { administrationScreens, isAdministrationPath, isAdministrator } from "../features/auth/authorization";
import { useCatalog } from "../features/map/CatalogProvider";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { BottomNavigation } from "../components/BottomNavigation";
import { DefaultTheme, ThemeProvider } from "@react-navigation/native";

import { Stack, router, usePathname, useGlobalSearchParams, useSegments, useNavigationContainerRef } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { CitySkyline } from "../components/CitySkyline";
import { WebFormStyles } from "../components/WebFormStyles";
const theme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: "transparent" },
};
function RootLayout() {
  return (
    <AppDataProvider>
      <RootContent />
    </AppDataProvider>
  );
}
function RootContent() {
  const { session, ready, error: sessionError } = useSession();
  const { role, ready: profileReady } = useProfile();
  const path = usePathname();
  const segments = useSegments(),
    navigationRef = useNavigationContainerRef();
  const routeKey = segments.join("/");
  useEffect(() => {
    navigationIntegration.registerNavigationContainer(navigationRef);
  }, [navigationRef]);
  useEffect(() => {
    setMonitoringRoute(routeKey.split("/"));
  }, [routeKey]);
  const reduced = useReducedMotion();
  const profileArea =
    path === "/perfil" ||
    path === "/conquistas" ||
    path === "/mapa" ||
    path === "/eventos" ||
    path === "/alertas" ||
    path === "/impactos";
  if (configError)
    return (
      <View style={{ flex: 1, justifyContent: "center", padding: 28 }}>
        <Text accessibilityRole="alert">{configError}</Text>
      </View>
    );
  if (!ready || (backendConfigured && !!session && isAdministrationPath(path) && !profileReady))
    return (
      <LoadingState
        fullScreen
        title="Abrindo seu ELAS"
        message="Sua cidade, com mais conexões e possibilidades."
      />
    );
  const authScreen = ["/", "/login", "/cadastro", "/recuperar-senha"].includes(
    path,
  );
  return (
    <SafeAreaProvider>
      <ThemeProvider value={theme}>
        <View style={styles.root}>
          <WebFormStyles />
          <StatusBar style="dark" />
          {authScreen && <CitySkyline />}
          <SchemaGate>
            <PushLifecycle />
            <View style={{ flex: 1 }}>
              <Stack
                key={session?.user.id ?? "signed-out"}
                screenOptions={{
                  headerShown: false,
                  animation: reduced ? "none" : "fade",
                  contentStyle: { backgroundColor: "transparent" },
                }}
              >
                <Stack.Protected guard={!backendConfigured || !session}>
                  {["index", "login", "cadastro", "recuperar-senha"].map(
                    (name) => (
                      <Stack.Screen key={name} name={name} />
                    ),
                  )}
                </Stack.Protected>
                <Stack.Protected guard={!backendConfigured || !!session}>
                  {[
                    "mapa",
                    "perfil",
                    "avaliar",
                    "conquistas",
                    "eventos",
                    "alertas",
                    "impactos",
                    "novo-relato",
                    "informacoes-pessoais",
                    "configuracoes",
                    "minhas-avaliacoes",
                    "favoritos",
                    "meus-relatos",
                    "relatos-area",
                    "minhas-solicitacoes",
                    "notificacoes",
                    "registro",
                    "foto-perfil",
                    "diagnostico",
                    "historico-impactos",
                  ].map((name) => (
                    <Stack.Screen key={name} name={name} />
                  ))}
                </Stack.Protected>
                <Stack.Protected guard={backendConfigured && !!session && profileReady && isAdministrator(role)}>
                  {administrationScreens.map((name) => (
                    <Stack.Screen key={name} name={name} />
                  ))}
                </Stack.Protected>
              </Stack>
            </View>
            {!!sessionError && (
              <Text
                accessibilityRole="alert"
                style={{
                  color: colors.wine,
                  padding: 12,
                  backgroundColor: colors.cream,
                }}
              >
                {sessionError}
              </Text>
            )}
            {!backendConfigured && (
              <Text
                style={{
                  textAlign: "center",
                  color: colors.wine,
                  padding: 5,
                  fontSize: typography.caption,
                }}
              >
                Demonstração — dados desta tela são fictícios.
              </Text>
            )}
            {showcaseEnabled && backendConfigured && (
              <Text
                style={{
                  textAlign: "center",
                  color: colors.wine,
                  padding: 7,
                  fontSize: typography.caption,
                }}
              >
                Apresentação · exemplos fictícios ativados
              </Text>
            )}
            {profileArea && <ContextNavigation />}
          </SchemaGate>
        </View>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
function ContextNavigation() {
  const [participate, setParticipate] = useState(false);
  const { places } = useCatalog(),
    path = usePathname();
  const { placeId } = useGlobalSearchParams<{ placeId?: string }>();
  const place =
    path === "/mapa" ? places.find((item) => item.id === placeId) : undefined;
  function onTab(label: string) {
    if (label === "Participar") {
      setParticipate(true);
      return;
    }
    const destination =
      label === "Mapa"
        ? "/mapa"
        : label === "Eventos"
          ? "/eventos"
          : label === "Relatos"
            ? "/alertas"
            : "/perfil";
    if (path !== destination) router.navigate(destination);
  }
  return (
    <>
      <BottomNavigation
        active={
          path === "/mapa" || path === "/impactos"
            ? "Mapa"
            : path === "/eventos"
              ? "Eventos"
              : path === "/alertas"
                ? "Relatos"
                : "Perfil"
        }
        addLabel="Participar"
        addAccessibilityLabel="Participar: avaliar um lugar ou relatar uma situação"
        onAction={onTab}
      />
      <ParticipationSheet
        visible={participate}
        placeName={place?.name}
        onClose={() => setParticipate(false)}
        onChoose={(kind) => {
          setParticipate(false);
          const pathname = kind === "review" ? "/avaliar" : "/novo-relato";
          if (place) router.push({ pathname, params: { placeId: place.id } });
          else router.push(pathname);
        }}
      />
    </>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream, overflow: "hidden" },
});

export default withMonitoring(RootLayout);
