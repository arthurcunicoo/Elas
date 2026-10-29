import { StyleSheet, Text, View } from "react-native";
import { cardSurface, palette, typography } from "../../constants/theme";
import { LoadingState } from "../loading/LoadingState";
import { SecondaryButton, TextButton } from "./Buttons";

export function collectionFailure(error: string) {
  if (/permiss|não autorizado|acesso negado/i.test(error))
    return {
      title: "Acesso não permitido",
      message: "Verifique as permissões da sua conta para continuar.",
    };
  if (/sessão|entre novamente|autentica/i.test(error))
    return {
      title: "Entre novamente",
      message:
        "Sua sessão precisa ser confirmada antes de carregar o conteúdo.",
    };
  if (/conex|internet|network|fetch|demor|timeout/i.test(error))
    return {
      title: "Não conseguimos conectar",
      message:
        "Confira sua internet e tente novamente. Seu conteúdo já carregado continua disponível.",
    };
  return {
    title: "Não foi possível carregar",
    message:
      "O serviço não respondeu como esperado. Tente novamente em instantes.",
  };
}
/** Used only when the collection is empty. Refreshes leave existing rows interactive. */
export function CollectionState({
  loading,
  error = "",
  title,
  message,
  loadingTitle = "Reunindo seu conteúdo",
  onRetry,
  onClear,
  skeleton = "cards",
}: {
  loading: boolean;
  error?: string;
  title: string;
  message: string;
  loadingTitle?: string;
  onRetry?: () => void;
  onClear?: () => void;
  skeleton?: "cards" | "places" | "notifications";
}) {
  if (loading)
    return (
      <LoadingState
        title={loadingTitle}
        message="Só um instante. Estamos buscando as informações."
        skeleton={skeleton}
      />
    );
  const failure = error ? collectionFailure(error) : null;
  return (
    <View style={styles.card}>
      <View
        accessible
        accessibilityRole={failure ? "alert" : undefined}
        accessibilityLiveRegion="polite"
        style={styles.copy}
      >
        <Text style={styles.title}>{failure?.title ?? title}</Text>
        <Text style={styles.message}>{failure?.message ?? message}</Text>
      </View>
      {failure && onRetry && (
        <SecondaryButton title="Tentar novamente" onPress={onRetry} />
      )}
      {onClear && <TextButton title="Limpar filtros" onPress={onClear} />}
    </View>
  );
}
const styles = StyleSheet.create({
  card: {
    ...cardSurface,
    width: "100%",
    gap: 14,
  },
  copy: { gap: 8 },
  title: {
    color: palette.text,
    fontSize: typography.section,
    fontWeight: "700",
  },
  message: { color: palette.muted, fontSize: typography.body, lineHeight: 22 },
});
