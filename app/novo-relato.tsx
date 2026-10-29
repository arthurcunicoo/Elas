import { initialReportDraft } from "../features/reports/reportSubmission";
import { useReportSubmission } from "../features/reports/useReportSubmission";
import { pageContent, ui, palette, radius, typography } from "../constants/theme";
import { PrimaryButton } from "../components/shared/Buttons";

import { useLocation, type Coordinate } from "../features/map/LocationProvider";
import { PageHeader } from "../components/shared/PageHeader";

import { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import Ionicons from "../components/icons/Ionicon";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TouchFeedback } from "../components/TouchFeedback";
import { MotionReveal } from "../components/MotionReveal";
import { useSession } from "../features/auth/SessionProvider";
import { useCatalog } from "../features/map/CatalogProvider";
import { categories } from "../services/reports";
import { friendlyError } from "../lib/supabase";
import LocationCapture from "../components/LocationCapture";
import { Place } from "../constants/places";
import { useDraft } from "../features/reports/drafts";
import { Field } from "../components/shared/FeaturePage";
import { DraftGuard } from "../components/DraftGuard";
import { PlacePicker } from "../features/map/PlacePicker";
export default function NewReport() {
  const insets = useSafeAreaInsets();
  const { session } = useSession();
  const { userLocation, setUserLocation } = useLocation();
  const { ensurePlace } = useCatalog();
  const { placeId, correction } = useLocalSearchParams<{
    placeId?: string;
    correction?: string;
  }>();
  const [linked, setLinked] = useState<Place | null>(null);
  const appliedRoute = useRef(false);
  const draft = useDraft(`relato:${placeId ?? "livre"}`, initialReportDraft);
  const {
    ready: draftReady,
    restored: draftRestored,
    setValue: setDraftValue,
  } = draft;
  const { place, description, category, linkedId } = draft.value;
  const setPlace = (place: string) => draft.setValue((v) => ({ ...v, place }));
  const setDescription = (description: string) =>
    draft.setValue((v) => ({ ...v, description }));
  const setCategory = (category: string) =>
    draft.setValue((v) => ({ ...v, category }));
  const [attachLocation, setAttachLocation] = useState(false);
  const [capture, setCapture] = useState(false);
  const [location, setLocation] = useState<Coordinate | null>(userLocation);
  const [locationError, setLocationError] = useState("");
  const {busy,error,setError,attempted,done,sentId,send}=useReportSubmission({draft,owner:session?.user.id,correction:correction === "1",linkedId:linked?.id,attachLocation,location});
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    if (!draftReady) return;
    const target =
      linkedId ||
      (!appliedRoute.current && !draftRestored ? placeId : undefined);
    appliedRoute.current = true;
    if (target)
      void ensurePlace(target, controller.signal)
        .then((value) => {
          if (active && value) {
            setLinked(value);
            if (!draftRestored) {
              setDraftValue((v) => ({
                ...v,
                linkedId: value.id,
                place: value.name,
                ...(correction === "1"
                  ? {
                      category: "Outro",
                      description: "Correção dos dados do lugar: ",
                    }
                  : {}),
              }));
            }
          }
        })
        .catch((e) => {
          if (active) setError(friendlyError(e));
        });
    return () => {
      active = false;
      controller.abort();
    };
  }, [
    placeId,
    correction,
    ensurePlace,
    draftReady,
    linkedId,
    draftRestored,
    setDraftValue,
    setError,
  ]);
  function back() {
    if (router.canGoBack()) router.back();
    else router.replace("/alertas");
  }
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.root}
    >
      <DraftGuard
        onSave={draft.flush}
        saved={!draft.error}
        enabled={!done && !busy && !!(place || description)}
      />
      <StatusBar style="light" />
      <PageHeader title="Novo relato" onBack={back} />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          ...pageContent,
          paddingTop: 20,
          paddingBottom: insets.bottom + 30,
        }}
      >
        <MotionReveal duration={280} distance={14}>
          {done ? (
            <View style={styles.card}>
              <Ionicons
                name="checkmark-circle-outline"
                color={palette.brand}
                size={48}
              />
              <Text style={styles.heading}>Relato enviado</Text>
              <Text style={styles.note}>
                Seu relato está pendente de verificação. Acompanhe o registro no
                seu perfil; outras pessoas só verão relatos verificados.
              </Text>
              <TouchFeedback
                label="Acompanhar meu relato"
                onPress={() =>
                  router.replace({
                    pathname: "/registro",
                    params: { kind: "relato", id: sentId },
                  })
                }
                spring
                style={styles.button}
              >
                <Text style={styles.buttonText}>Acompanhar meu relato</Text>
              </TouchFeedback>
            </View>
          ) : (
            <View style={styles.card}>
              <Text style={styles.note}>
                Descreva uma observação. Não inclua nomes ou dados pessoais. A
                localização exata é opcional; indique a rua ou praça abaixo.
              </Text>
              <PlacePicker
                value={linked}
                disabled={busy || !draft.ready}
                onChange={(value) => {
                  setLinked(value);
                  draft.setValue((v) => ({
                    ...v,
                    linkedId: value?.id ?? "",
                    place: value?.name ?? v.place,
                  }));
                }}
              />
              <Field
                label="Local"
                accessibilityLabel="Local do relato"
                value={place}
                editable={!busy && draft.ready}
                onChangeText={(value) => {
                  setPlace(value);
                  if (linked && value !== linked.name) {
                    setLinked(null);
                    draft.setValue((v) => ({ ...v, linkedId: "" }));
                  }
                }}
                error={attempted && !place.trim() ? "Informe onde aconteceu." : undefined}
                placeholder="Nome da rua ou praça"
                placeholderTextColor={palette.muted}
                maxLength={120}
              />
              {linked && (
                <Text style={styles.note}>
                  Vinculado a {linked.name}. Editar o nome desvincula o
                  cadastro.
                </Text>
              )}
              <Text style={styles.note}>
                {draft.ready
                  ? draft.restored
                    ? "Rascunho recuperado neste aparelho."
                    : "Salvamento automático neste aparelho."
                  : "Recuperando rascunho…"}
              </Text>
              {!!draft.error && <Text style={styles.error}>{draft.error}</Text>}
              <Text style={styles.label}>Categoria</Text>
              <View style={styles.categories}>
                {categories.map((item) => (
                  <TouchFeedback
                    selected={category === item}
                    disabled={busy}
                    key={item}
                    label={item}
                    onPress={() => setCategory(item)}
                    style={[
                      styles.category,
                      category === item && styles.categorySelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.categoryText,
                        category === item && styles.categoryTextSelected,
                      ]}
                    >
                      {item}
                    </Text>
                  </TouchFeedback>
                ))}
              </View>
              {correction === "1" && (
                <>
                  <Text style={styles.label}>
                    Qual dado precisa de correção?
                  </Text>
                  <View style={styles.categories}>
                    {["Nome", "Endereço", "Foto", "Categoria", "Outro"].map(
                      (field) => (
                        <TouchFeedback
                          key={field}
                          label={field}
                          selected={draft.value.correctionField === field}
                          disabled={busy}
                          onPress={() =>
                            draft.setValue((v) => ({
                              ...v,
                              correctionField: field,
                            }))
                          }
                          style={[
                            styles.category,
                            draft.value.correctionField === field &&
                              styles.categorySelected,
                          ]}
                        >
                          <Text
                            style={[
                              styles.categoryText,
                              draft.value.correctionField === field &&
                                styles.categoryTextSelected,
                            ]}
                          >
                            {field}
                          </Text>
                        </TouchFeedback>
                      ),
                    )}
                  </View>
                  <Field
                    label="Informação correta proposta"
                    error={attempted && draft.value.proposal.trim().length < 3 ? "Informe a correção em pelo menos 3 caracteres." : undefined}
                    value={draft.value.proposal}
                    onChangeText={(proposal) =>
                      draft.setValue((v) => ({ ...v, proposal }))
                    }
                    editable={!busy && draft.ready}
                    maxLength={300}
                  />
                </>
              )}
              <Field
                label={
                  correction === "1"
                    ? "Observação que justifica a correção"
                    : "Relato"
                }
                accessibilityLabel="Descrição do relato"
                error={attempted && correction !== "1" && description.trim().length < 10 ? "Descreva o que aconteceu em pelo menos 10 caracteres." : undefined}
                editable={!busy && draft.ready}
                value={description}
                onChangeText={setDescription}
                placeholder="Descreva o que observou"
                placeholderTextColor={palette.muted}
                multiline
                maxLength={correction === "1" ? 500 : 1000}
              />
              <TouchFeedback
                disabled={capture || busy}
                label="Usar minha localização"
                onPress={() => {
                  setLocationError("");
                  setCapture(true);
                }}
                style={styles.location}
              >
                <Ionicons name="locate-outline" size={22} color={ui.action} />
                <Text style={styles.note}>
                  {capture
                    ? "Obtendo localização..."
                    : location
                      ? "Atualizar localização"
                      : "Usar minha localização (opcional)"}
                </Text>
              </TouchFeedback>
              {capture && (
                <LocationCapture
                  onLocation={(point) => {
                    setLocation(point);
                    setUserLocation(point);
                    setAttachLocation(true);
                    setCapture(false);
                  }}
                  onError={(message) => {
                    setLocationError(message);
                    setCapture(false);
                  }}
                />
              )}
              {!!locationError && (
                <Text accessibilityRole="alert" style={styles.error}>
                  {locationError}
                </Text>
              )}
              {location && (
                <TouchFeedback
                  role="checkbox"
                  checked={attachLocation}
                  label="Incluir localização aproximada"
                  onPress={() => setAttachLocation((value) => !value)}
                  style={styles.location}
                >
                  <Ionicons
                    name={attachLocation ? "checkbox" : "square-outline"}
                    size={22}
                    color={ui.action}
                  />
                  <Text style={styles.note}>
                    Incluir localização aproximada (cerca de 100 m)
                  </Text>
                </TouchFeedback>
              )}
              {!!error && (
                <Text accessibilityRole="alert" style={styles.error}>
                  {error}
                </Text>
              )}
              <PrimaryButton
                title="Enviar relato"
                disabled={!draft.ready}
                busy={busy}
                onPress={() => void send()}
              />
            </View>
          )}
        </MotionReveal>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.background },
  card: {
    width: "100%",
    alignSelf: "center",
    backgroundColor: "white",
    padding: 20,
    borderRadius: radius.large,
    gap: 12,
  },
  note: {
    color: palette.muted,
    fontSize: typography.body,
    lineHeight: 21,
    flexShrink: 1,
  },
  heading: { fontWeight: "700", fontSize: 20, color: palette.text },
  label: {
    color: palette.text,
    fontWeight: "600",
    fontSize: typography.card,
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: palette.icon,
    borderRadius: radius.medium,
    padding: 12,
    color: palette.text,
    fontSize: typography.card,
  },
  categories: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  category: {
    borderWidth: 1,
    borderColor: palette.icon,
    paddingHorizontal: 14,
    paddingVertical: 8,
    justifyContent: "center",
    minHeight: 44,
    borderRadius: radius.pill,
  },
  categorySelected: { backgroundColor: ui.action, borderColor: ui.action },
  categoryText: { color: ui.text, fontSize: typography.caption },
  categoryTextSelected: { color: "white", fontWeight: "700" },
  location: {
    flexDirection: "row",
    gap: 8,
    minHeight: 44,
    alignItems: "center",
  },
  button: {
    backgroundColor: ui.action,
    borderRadius: radius.pill,
    minHeight: 48,
    paddingHorizontal: 18,
    marginTop: 8,
  },
  buttonText: {
    textAlign: "center",
    color: "white",
    fontWeight: "700",
    padding: 10,
  },
  error: { color: palette.error, fontSize: typography.secondary },
});
