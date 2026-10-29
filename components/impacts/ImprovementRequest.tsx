import { LoadingIndicator } from "../loading/LoadingIndicator";
import { PrimaryButton } from "../shared/Buttons";
import { cardSurface, colors, glass, ui, statusText, palette, radius, typography } from "../../constants/theme";
import { useEffect, useRef, useState } from "react";
import { Keyboard, StyleSheet, Text, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import Ionicons from "../icons/Ionicon";
import { AppSheet } from "../AppSheet";
import { Field } from "../shared/FeaturePage";
import { TouchFeedback } from "../TouchFeedback";
import { DraftGuard } from "../DraftGuard";
import { PlacePicker, PlaceSearchContent } from "../../features/map/PlacePicker";

import type { Place } from "../../constants/places";
import { useSession } from "../../features/auth/SessionProvider";
import { useCatalog } from "../../features/map/CatalogProvider";
import { createImprovement } from "../../services/improvements";
import { friendlyError } from "../../lib/supabase";
import { useDraft } from "../../features/reports/drafts";

export function ImprovementRequest({ onCreated }: { onCreated: () => void }) {
  const { session } = useSession();
  const { ensurePlace } = useCatalog();
  const { placeId } = useLocalSearchParams<{ placeId?: string }>();
  const [linked, setLinked] = useState<Place | null>(null);
  const [resolvingPlace, setResolvingPlace] = useState(false);
  const draft = useDraft(`melhoria:${placeId ?? "livre"}`, {
    title: "",
    text: "",
    linkedId: "",
  });
  const { title, text, linkedId } = draft.value;
  const {
    ready: draftReady,
    restored: draftRestored,
    setValue: setDraftValue,
  } = draft;
  const [open, setOpen] = useState(!!placeId);
  const [step, setStep] = useState<"form" | "place">("form");
  const [sentId, setSentId] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "success">("idle");
  const [error, setError] = useState("");
  const [validation, setValidation] = useState<{
    title?: string;
    text?: string;
  }>({});
  const titleInput = useRef<TextInput>(null),
    descriptionInput = useRef<TextInput>(null);
  const busy = useRef(false),
    appliedRoute = useRef<string | undefined>(undefined);
  useEffect(() => {
    let active = true;
    if (!draftReady) {
      setLinked(null);
      setResolvingPlace(false);
      return;
    }
    const newRoute = !!placeId && appliedRoute.current !== placeId;
    const target =
      linkedId || (newRoute && !draftRestored ? placeId : undefined);
    if (newRoute) {
      appliedRoute.current = placeId;
      setState("idle");
      setSentId("");
      setStep("form");
      setError("");
      setValidation({});
      setOpen(true);
    }
    if (!target) {
      setLinked(null);
      setResolvingPlace(false);
    } else {
      setResolvingPlace(true);
      void ensurePlace(target)
        .then((place) => {
          if (active) {
            setLinked(place);
            if (place && newRoute)
              setDraftValue((value) => ({ ...value, linkedId: place.id }));
          }
        })
        .catch((e) => {
          if (active) setError(friendlyError(e));
        })
        .finally(() => {
          if (active) setResolvingPlace(false);
        });
    }
    return () => {
      active = false;
    };
  }, [
    placeId,
    ensurePlace,
    draftReady,
    linkedId,
    draftRestored,
    setDraftValue,
  ]);
  function changePlace(place: Place | null) {
    setLinked(place);
    draft.setValue((value) => ({ ...value, linkedId: place?.id ?? "" }));
  }
  function close() {
    Keyboard.dismiss();
    setOpen(false);
    setStep("form");
  }
  function another() {
    setState("idle");
    setError("");
    setValidation({});
    setSentId("");
    setStep("form");
    setOpen(true);
  }
  function track() {
    close();
    router.push({
      pathname: "/registro",
      params: { kind: "melhoria", id: sentId },
    });
  }
  async function send() {
    if (busy.current || !draft.ready || resolvingPlace) return;
    const description = text.trim();
    const errors = {
      title:
        title.trim().length < 3
          ? "Use pelo menos 3 caracteres para o título."
          : undefined,
      text:
        description.length < 5
          ? "Conte um pouco mais, com pelo menos 5 caracteres."
          : undefined,
    };
    setValidation(errors);
    if (errors.title || errors.text) {
      (errors.title ? titleInput : descriptionInput).current?.focus();
      return;
    }
    if (!session) {
      setError("Entre na sua conta para enviar a solicitação.");
      return;
    }
    busy.current = true;
    setError("");
    Keyboard.dismiss();
    setState("loading");
    try {
      const requestId = await draft.prepare({
        titulo: title.trim(),
        descricao: description,
        ...(linked ? { lugar_id: linked.id } : {}),
      });
      const id = await createImprovement(
        requestId,
        title.trim(),
        description,
        linked?.id,
      );
      setSentId(id);
      await draft.clear();
      setLinked(null);
      setState("success");
      onCreated();
    } catch (e) {
      setError(friendlyError(e));
      setState("idle");
    } finally {
      busy.current = false;
    }
  }
  const choosing = step === "place";
  const footer = choosing ? (
    <TouchFeedback
      label="Voltar à sugestão"
      onPress={() => {
        Keyboard.dismiss();
        setStep("form");
      }}
      style={styles.secondary}
    >
      <Text style={styles.secondaryText}>Voltar à sugestão</Text>
    </TouchFeedback>
  ) : state === "success" ? (
    <>
      <TouchFeedback
        label="Acompanhar solicitação"
        onPress={track}
        style={styles.button}
      >
        <Text style={styles.buttonText}>Acompanhar solicitação</Text>
        <Ionicons name="arrow-forward" size={20} color="white" />
      </TouchFeedback>
      <TouchFeedback
        label="Enviar outra sugestão"
        onPress={another}
        style={styles.secondary}
      >
        <Text style={styles.secondaryText}>Enviar outra sugestão</Text>
      </TouchFeedback>
    </>
  ) : (
    <>
      <PrimaryButton
        title={
          state === "loading" ? "Enviando solicitação" : "Enviar solicitação"
        }
        disabled={!draft.ready || resolvingPlace}
        busy={state === "loading"}
        onPress={() => void send()}
      />
      {resolvingPlace ? (
        <LoadingIndicator showLabel label="Carregando o lugar selecionado" />
      ) : (
        <Text style={styles.footerNote}>
          Você poderá acompanhar a resposta no seu perfil.
        </Text>
      )}
    </>
  );
  return (
    <View style={styles.root}>
      <DraftGuard
        onSave={draft.flush}
        saved={!draft.error}
        enabled={!open && state === "idle" && !!(title || text)}
      />
      <View style={styles.invitation}>
        <View style={styles.invitationHeader}>
          <View style={styles.ideaIcon}>
            <Ionicons
              name={
                state === "success"
                  ? "checkmark-circle-outline"
                  : "bulb-outline"
              }
              size={25}
              color={colors.pink}
            />
          </View>
          <View style={styles.invitationHeading}>
            <Text style={styles.heading}>
              {state === "success"
                ? "Sua ideia já está a caminho"
                : "Uma cidade melhor começa com você"}
            </Text>
            <Text style={styles.note}>
              {state === "success"
                ? "Acompanhe sua solicitação e os próximos passos."
                : "Compartilhe uma sugestão para transformar o seu bairro."}
            </Text>
          </View>
        </View>
        <TouchFeedback
          label={
            state === "success" ? "Ver solicitação enviada" : "Sugerir melhoria"
          }
          onPress={() => {
            setStep("form");
            setOpen(true);
          }}
          style={styles.invitationButton}
        >
          <Text style={styles.invitationButtonText}>
            {state === "success"
              ? "Ver solicitação enviada"
              : "Sugerir melhoria"}
          </Text>
          <Ionicons name="arrow-forward" color={colors.pink} size={21} />
        </TouchFeedback>
      </View>
      <AppSheet
        visible={open}
        title={
          choosing
            ? "Escolher lugar"
            : state === "success"
              ? "Sugestão enviada"
              : "Nova sugestão"
        }
        subtitle={
          choosing
            ? "Selecione onde a melhoria pode acontecer"
            : state === "success"
              ? "Sua participação faz a diferença"
              : "Conte o que pode melhorar na cidade"
        }
        icon={
          choosing
            ? undefined
            : state === "success"
              ? "checkmark-circle-outline"
              : "bulb-outline"
        }
        onClose={close}
        onBack={
          choosing
            ? () => {
                Keyboard.dismiss();
                setStep("form");
              }
            : undefined
        }
        dismissible={state !== "loading"}
        large={choosing}
        scroll={!choosing}
        footer={footer}
      >
        {choosing ? (
          <PlaceSearchContent
            onSelect={(place) => {
              changePlace(place);
              setStep("form");
            }}
          />
        ) : state === "success" ? (
          <View style={styles.success}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark" size={38} color={statusText.safe} />
            </View>
            <Text accessibilityRole="header" style={styles.successTitle}>
              Obrigada por participar!
            </Text>
            <Text accessibilityLiveRegion="polite" style={styles.successText}>
              Sua solicitação foi salva e está aguardando análise.
            </Text>
          </View>
        ) : (
          <View style={styles.fields}>
            <Field
              ref={titleInput}
              label="Qual melhoria você sugere?"
              accessibilityLabel="Título da melhoria"
              value={title}
              onChangeText={(value) => {
                draft.setValue((v) => ({ ...v, title: value }));
                setValidation((v) => ({ ...v, title: undefined }));
                setError("");
              }}
              editable={state !== "loading" && draft.ready}
              maxLength={100}
              placeholder="Ex.: melhorar a iluminação"
              returnKeyType="next"
              onSubmitEditing={() => descriptionInput.current?.focus()}
              error={validation.title}
            />
            <Field
              ref={descriptionInput}
              label="Conte um pouco mais"
              accessibilityLabel="Descrição da melhoria"
              value={text}
              onChangeText={(value) => {
                draft.setValue((v) => ({ ...v, text: value }));
                setValidation((v) => ({ ...v, text: undefined }));
                setError("");
              }}
              editable={state !== "loading" && draft.ready}
              maxLength={1000}
              multiline
              placeholder="Descreva o que pode melhorar e por quê."
              error={validation.text}
            />
            <Text style={styles.counter}>{text.length}/1000</Text>
            <PlacePicker
              value={linked}
              disabled={state === "loading" || !draft.ready}
              onChange={changePlace}
              onOpenPicker={() => {
                Keyboard.dismiss();
                setStep("place");
              }}
            />
            {!!(draft.error || error) && (
              <View style={styles.errorBox}>
                <Ionicons
                  name="alert-circle-outline"
                  color={palette.error}
                  size={21}
                />
                <Text accessibilityRole="alert" style={styles.error}>
                  {error || draft.error}
                </Text>
              </View>
            )}
          </View>
        )}
      </AppSheet>
    </View>
  );
}
const styles = StyleSheet.create({
  root: { marginTop: 24, marginBottom: 10 },
  invitation: {
    ...cardSurface,
    padding: 18,
    gap: 16,
  },
  invitationHeader: { flexDirection: "row", alignItems: "flex-start", gap: 13 },
  ideaIcon: {
    width: 46,
    height: 46,
    borderRadius: radius.medium,
    flexShrink: 0,
    backgroundColor: colors.cream,
    alignItems: "center",
    justifyContent: "center",
  },
  invitationHeading: { flex: 1, minWidth: 0 },
  heading: { fontSize: 17, lineHeight: 23, color: ui.text, fontWeight: "700" },
  note: {
    fontSize: typography.body,
    lineHeight: 21,
    color: ui.muted,
    marginTop: 5,
  },
  invitationButton: {
    minHeight: 52,
    borderRadius: radius.medium,
    backgroundColor: glass.surfaceSoft,
    borderWidth: 1,
    borderColor: glass.tintedBorder,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 14,
  },
  invitationButtonText: {
    fontSize: typography.card,
    fontWeight: "700",
    color: colors.pink,
  },
  fields: { gap: 20 },
  counter: {
    color: ui.muted,
    fontSize: typography.caption,
    textAlign: "right",
    marginTop: -14,
  },
  button: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 54,
    backgroundColor: colors.pink,
    borderRadius: radius.medium,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  buttonText: {
    color: colors.white,
    fontWeight: "700",
    fontSize: typography.input,
    textAlign: "center",
  },
  secondary: {
    minHeight: 48,
    borderRadius: radius.medium,
    alignItems: "center",
    paddingHorizontal: 16,
    backgroundColor: colors.cream,
  },
  secondaryText: {
    color: colors.pink,
    fontWeight: "600",
    fontSize: typography.card,
  },
  footerNote: {
    fontSize: typography.caption,
    lineHeight: 18,
    color: ui.muted,
    textAlign: "center",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
    borderRadius: radius.medium,
    backgroundColor: palette.errorTint,
    padding: 13,
  },
  error: {
    color: palette.error,
    fontSize: typography.secondary,
    lineHeight: 20,
    flex: 1,
  },
  success: { alignItems: "center", paddingTop: 18, paddingBottom: 24, gap: 14 },
  successIcon: {
    width: 86,
    height: 86,
    borderRadius: radius.large,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.successTint,
  },
  successTitle: {
    fontSize: typography.page,
    lineHeight: 29,
    fontWeight: "700",
    color: ui.text,
    textAlign: "center",
  },
  successText: {
    fontSize: typography.input,
    lineHeight: 24,
    color: ui.muted,
    textAlign: "center",
  },
});
