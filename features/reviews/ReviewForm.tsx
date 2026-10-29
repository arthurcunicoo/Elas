import { LoadingIndicator } from "../../components/loading/LoadingIndicator";
import { readOwnReview, saveReview } from "../../services/reviews";
import { ui, palette, radius, typography, pageContent } from "../../constants/theme";
import { Field } from "../../components/shared/FormControls";
import { PrimaryButton } from "../../components/shared/Buttons";

import { useCallback, useRef, useState } from "react";
import { Keyboard, ScrollView, StyleSheet, Text, View } from "react-native";
import Ionicons from "../../components/icons/Ionicon";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MotionReveal } from "../../components/MotionReveal";
import { TouchFeedback } from "../../components/TouchFeedback";
import { MoodSelector } from "../../components/reviews/MoodSelector";
import { useDraft } from "../reports/drafts";
import { DraftGuard } from "../../components/DraftGuard";
import { ProfileDialog, ProfileNotice } from "../../components/ProfileDialog";
import type { Place } from "../../constants/places";
import { useSession } from "../auth/SessionProvider";
import { useCatalog } from "../map/CatalogProvider";
import { backendConfigured, friendlyError } from "../../lib/supabase";
export function ReviewForm({ placeId }: { placeId: string }) {
  const { session } = useSession();
  const {
    places,
    factors,
    loading,
    error: dataError,
    reload,
    ensureFactors,
    ensurePlace,
  } = useCatalog();
  const insets = useSafeAreaInsets();
  const [loadedPlace, setLoadedPlace] = useState<Place | null>(null);
  const place = places.find((item) => item.id === placeId) ?? loadedPlace;
  const draft = useDraft(`avaliacao:${placeId}`, {
    mood: "",
    selected: [] as string[],
    comment: "",
  });
  const {
    ready: draftReady,
    restored: draftRestored,
    setValue: setDraftValue,
  } = draft;
  const mood = draft.value.mood || null,
    selected = draft.value.selected,
    comment = draft.value.comment;
  const setMood = (mood: string | null) =>
    draft.setValue((v) => ({ ...v, mood: mood ?? "" }));
  const setComment = (comment: string) =>
    draft.setValue((v) => ({ ...v, comment }));
  const setSelected = (update: (current: string[]) => string[]) =>
    draft.setValue((v) => ({ ...v, selected: update(v.selected) }));
  const [existing, setExisting] = useState(false),
    [baseline, setBaseline] = useState(""),
    [notice, setNotice] = useState<ProfileNotice | null>(null);
  const [error, setError] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const active = useRef(false),
    initialized = useRef(false);
  const [initialLoading, setInitialLoading] = useState(backendConfigured);
  const [loadFailed, setLoadFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const busy = useRef(false);
  const unsaved =
    draft.ready && !initialLoading && baseline !== JSON.stringify(draft.value);
  useFocusEffect(
    useCallback(() => {
      void ensureFactors();
    }, [ensureFactors]),
  );
  useFocusEffect(
    useCallback(() => {
      void retry;
      if (!draftReady) return;
      active.current = true;
      let current = true;
      if (backendConfigured && placeId) {
        setInitialLoading(true);
        setLoadFailed(false);
        setError("");
        (async () => {
          try {
            const [resolvedPlace, data] = await Promise.all([
              ensurePlace(placeId),
              readOwnReview(placeId, session?.user.id ?? ""),
            ]);
            if (!resolvedPlace) throw new Error("place_unavailable");
            if (current) {
              const saved = {
                mood: data?.sentimento ?? "",
                selected:
                  data?.avaliacao_fatores.map((item) => item.fator_id) ?? [],
                comment: data?.comentario ?? "",
              };
              setLoadedPlace(resolvedPlace);
              setExisting(!!data);
              setBaseline(JSON.stringify(saved));
              if (!draftRestored && !initialized.current) setDraftValue(saved);
              initialized.current = true;
            }
          } catch (e) {
            if (current) {
              setError(
                e instanceof Error && e.message === "place_unavailable"
                  ? "Este lugar não está disponível. Escolha outro para avaliar."
                  : friendlyError(e),
              );
              setLoadFailed(true);
            }
          } finally {
            if (current) setInitialLoading(false);
          }
        })();
      } else setInitialLoading(false);
      return () => {
        current = false;
        active.current = false;
      };
    }, [
      placeId,
      retry,
      session?.user.id,
      ensurePlace,
      draftReady,
      draftRestored,
      setDraftValue,
    ]),
  );
  async function send() {
    if (busy.current || initialLoading || loadFailed || !draft.ready) return;
    if (!place) {
      setError("Escolha um lugar válido antes de avaliar.");
      return;
    }
    if (!mood || !selected.length) {
      setError("Selecione como se sente e ao menos uma opção.");
      return;
    }
    busy.current = true;
    setError("");
    Keyboard.dismiss();
    setState("loading");
    try {
      if (backendConfigured) {
        await saveReview(place.id, mood, comment, selected);
      }
      if (active.current) setState("done");
      await draft.clear();
    } catch (e) {
      if (active.current) {
        setError(friendlyError(e));
        setState("idle");
      }
    } finally {
      busy.current = false;
    }
  }
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[
        styles.scroll,
        { paddingBottom: insets.bottom + 28 },
      ]}
    >
      <View style={styles.page}>
        <DraftGuard
        onSave={draft.flush}
          saved={!draft.error}
          enabled={unsaved && state === "idle"}
        />
        <ProfileDialog notice={notice} onClose={() => setNotice(null)} />
        {state === "done" ? (
          <MotionReveal duration={260} distance={12}>
            <View style={styles.success}>
              <Ionicons
                name="checkmark-circle"
                size={54}
                color={palette.successFill}
              />
              <Text style={styles.question}>Avaliação concluída!</Text>
              <Text style={styles.note}>
                {backendConfigured
                  ? "Sua avaliação foi salva e aguarda análise. Depois de aprovada, sua percepção entra no resumo coletivo do lugar. Autoria e comentário continuam privados."
                  : "Demonstração local. Nenhum dado foi enviado ou armazenado."}
              </Text>
              <TouchFeedback
                label="Concluir e voltar"
                onPress={back}
                spring
                style={styles.button}
              >
                <Text style={styles.buttonText}>Concluir</Text>
              </TouchFeedback>
            </View>
          </MotionReveal>
        ) : (
          <>
            {initialLoading || loading ? (
              <LoadingIndicator showLabel label="Carregando local" />
            ) : (
              !!dataError && (
                <Text accessibilityRole="alert" style={styles.error}>
                  {dataError}
                </Text>
              )
            )}
            {!!dataError && (
              <TouchFeedback
                label="Tentar novamente"
                onPress={() => void reload()}
              >
                <Text>Tentar novamente</Text>
              </TouchFeedback>
            )}
            <View style={selectionStyles.card}>
              {place && (
                <>
                  <Text style={selectionStyles.name}>{place.name}</Text>
                  <Text style={styles.place}>{place.address}</Text>
                </>
              )}
              <TouchFeedback
                label="Trocar lugar da avaliação"
                disabled={state !== "idle"}
                onPress={() => {
                  const change = () => {
                    void draft
                      .clear()
                      .then(() => router.setParams({ placeId: "" }));
                  };
                  if (unsaved)
                    setNotice({
                      title: "Trocar de lugar?",
                      message:
                        "O rascunho atual será descartado. A avaliação já enviada permanece salva.",
                      confirmLabel: "Trocar lugar",
                      confirm: change,
                    });
                  else change();
                }}
              >
                <Text style={selectionStyles.change}>Trocar lugar</Text>
              </TouchFeedback>
            </View>
            <Text style={styles.note}>
              {existing
                ? "Você já avaliou este lugar. Enviar novamente atualiza sua avaliação."
                : "Esta avaliação será vinculada ao lugar selecionado."}
            </Text>
            <Text style={styles.helper}>
              Após aprovação, sua percepção entra no resumo coletivo do lugar.
              Sua autoria e seu comentário ficam privados.
            </Text>
            <Text style={styles.helper}>
              Conquistas refletem seus registros atuais. Excluir avaliações pode
              reduzir o progresso.
            </Text>
            {!!draft.error && <Text style={styles.error}>{draft.error}</Text>}
            <MotionReveal duration={280} distance={10}>
              <Text style={styles.question}>
                Como você se sente nesse{"\n"}local?
              </Text>
              <MoodSelector
                disabled={
                  state !== "idle" || initialLoading || loadFailed || !place
                }
                value={mood}
                onChange={(value) => {
                  if (state === "idle") {
                    setMood(value);
                    setError("");
                  }
                }}
              />
            </MotionReveal>
            <MotionReveal duration={300} delay={80} distance={10}>
              <Text style={styles.heading}>
                O que influenciou a sua avaliação?
              </Text>
              <Text style={styles.helper}>(Selecione uma ou mais opções)</Text>
              <View style={styles.factors}>
                {factors.map(({ id: factor, nome }) => (
                  <TouchFeedback
                    key={factor}
                    label={nome}
                    role="checkbox"
                    checked={selected.includes(factor)}
                    disabled={state !== "idle" || initialLoading || loadFailed}
                    onPress={() => {
                      setSelected((current) =>
                        current.includes(factor)
                          ? current.filter((item) => item !== factor)
                          : [...current, factor],
                      );
                      setError("");
                    }}
                    style={{ minHeight: 44 }}
                  >
                    <View style={styles.factor}>
                      <View style={styles.checkbox}>
                        {selected.includes(factor) && (
                          <Ionicons
                            name="checkmark"
                            size={23}
                            color={palette.brand}
                          />
                        )}
                      </View>
                      <Text style={styles.factorText}>{nome}</Text>
                    </View>
                  </TouchFeedback>
                ))}
              </View>
            </MotionReveal>
            <MotionReveal duration={300} delay={160} distance={10}>
              <Field
                label="Comentário (opcional)"
                accessibilityLabel="Comentário opcional"
                value={comment}
                onChangeText={setComment}
                editable={state === "idle" && !initialLoading && !loadFailed}
                multiline
                maxLength={1000}
                placeholder="Escreva algo sobre sua experiência..."
              />
              {initialLoading && (
                <LoadingIndicator label="Carregando sua avaliação" />
              )}
              {loadFailed && (
                <TouchFeedback
                  label="Recarregar avaliação"
                  onPress={() => setRetry((value) => value + 1)}
                >
                  <Text style={styles.error}>Tentar carregar novamente</Text>
                </TouchFeedback>
              )}
              {!!error && (
                <Text accessibilityRole="alert" style={styles.error}>
                  {error}
                </Text>
              )}
              <PrimaryButton
                title="Avaliar lugar"
                disabled={
                  state !== "idle" ||
                  initialLoading ||
                  loadFailed ||
                  !place ||
                  !factors.length ||
                  loading
                }
                busy={state === "loading"}
                onPress={send}
                style={{ marginTop: 16 }}
              />
            </MotionReveal>
          </>
        )}
      </View>
    </ScrollView>
  );
}
function back() {
  if (router.canGoBack()) router.back();
  else router.replace("/mapa");
}
const selectionStyles = StyleSheet.create({
  card: {
    backgroundColor: "white",
    borderRadius: radius.large,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: palette.border,
  },
  name: {
    color: palette.text,
    fontSize: typography.card,
    fontWeight: "700",
    marginBottom: 5,
  },
  change: { color: ui.action, fontSize: typography.body, fontWeight: "600" },
});
const styles = StyleSheet.create({
  scroll: { flexGrow: 1, paddingTop: 24 },
  page: { ...pageContent },
  question: {
    color: palette.accent,
    fontSize: 20,
    lineHeight: 28,
    fontWeight: "700",
  },
  heading: { fontSize: 17, fontWeight: "700", color: palette.text },
  helper: {
    fontSize: typography.caption,
    lineHeight: 18,
    color: palette.muted,
    fontWeight: "400",
  },
  factors: { marginTop: 6, marginBottom: 16 },
  factor: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 44,
  },
  checkbox: {
    width: 25,
    height: 25,
    borderWidth: 1.5,
    borderColor: palette.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  factorText: { color: palette.text, fontSize: typography.card, flexShrink: 1 },
  button: {
    marginTop: 12,
    minHeight: 48,
    backgroundColor: ui.action,
    borderRadius: radius.pill,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  buttonText: {
    color: "white",
    textAlign: "center",
    fontSize: typography.section,
    fontWeight: "700",
  },
  error: { color: palette.brand, marginTop: 9, fontSize: typography.secondary },
  place: {
    color: palette.muted,
    marginBottom: 8,
    fontSize: typography.secondary,
  },
  success: { gap: 15, paddingTop: 40 },
  note: { color: palette.muted, fontSize: typography.card, lineHeight: 22 },
});
