import { CollectionState } from "../../components/shared/CollectionState";
import { emptyPage, type Cursor } from "../../lib/pagination";
import { listOwnReviews, removeOwnReview } from "../../services/reviews";
import { DangerButton } from "../../components/shared/Buttons";
import { palette, radius, typography } from "../../constants/theme";
import { useCallback, useRef, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TouchFeedback } from "../../components/TouchFeedback";
import { friendlyError } from "../../lib/supabase";
import { useSession } from "../auth/SessionProvider";
import { usePagedList } from "../profile/usePagedList";
import { HistoryList } from "../reports/HistoryList";
export default function MyReviews() {
  const { session } = useSession(),
    userId = session?.user.id,
    insets = useSafeAreaInsets();
  const [deleting, setDeleting] = useState<string | null>(null),
    [confirm, setConfirm] = useState<string | null>(null),
    [error, setError] = useState(""),
    [history, setHistory] = useState<string | null>(null);
  const lock = useRef(false);
  const load = useCallback(
    async (cursor: Cursor | null) => {
      if (!userId)
        return emptyPage<
          Awaited<ReturnType<typeof listOwnReviews>>["rows"][number]
        >();
      return listOwnReviews(userId, cursor);
    },
    [userId],
  );
  const list = usePagedList(load);
  async function remove(id: string) {
    if (lock.current || !userId) return;
    lock.current = true;
    setDeleting(id);
    setError("");
    try {
      await removeOwnReview(id, userId);
      setConfirm(null);
      list.refresh();
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      lock.current = false;
      setDeleting(null);
    }
  }
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: palette.background,
        paddingTop: insets.top,
      }}
    >
      <FlatList
        data={list.rows}
        keyExtractor={(item) => item.id}
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        windowSize={5}
        contentContainerStyle={{
          padding: 24,
          paddingBottom: insets.bottom + 24,
        }}
        refreshing={list.loading}
        onRefresh={list.refresh}
        onEndReached={list.more}
        ListHeaderComponent={
          <>
            <TouchFeedback
              label="Voltar ao perfil"
              onPress={() =>
                router.canGoBack() ? router.back() : router.replace("/perfil")
              }
            >
              <Text style={styles.action}>‹ Voltar ao perfil</Text>
            </TouchFeedback>
            <Text accessibilityRole="header" style={styles.title}>
              Minhas avaliações
            </Text>
            <Text style={styles.text}>
              Uma avaliação por lugar. Avaliar novamente atualiza sua avaliação
              daquele lugar. Após aprovação, a percepção entra no resumo
              coletivo. Comentários e autoria ficam privados.
            </Text>
            {!!(error || (list.rows.length ? list.error : "")) && (
              <Text accessibilityRole="alert" style={styles.text}>
                {error || (list.rows.length ? list.error : "")}
              </Text>
            )}
          </>
        }
        ListEmptyComponent={
          <CollectionState
            loading={list.loading}
            error={list.error}
            title="Você ainda não avaliou nenhum lugar."
            message="Escolha um lugar no mapa para compartilhar sua percepção."
            skeleton="cards"
            onRetry={list.refresh}
          />
        }

        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.name}>
              {item.lugares?.nome || "Lugar indisponível"}
            </Text>
            <Text style={styles.text}>
              {item.sentimento} ·{" "}
              {new Date(item.atualizado_em).toLocaleDateString("pt-BR")}
            </Text>
            <Text style={styles.text}>
              {item.comentario || "Sem comentário."}
            </Text>
            <TouchFeedback
              disabled={!!deleting}
              label="Editar avaliação"
              onPress={() =>
                router.push({
                  pathname: "/avaliar",
                  params: { placeId: item.lugar_id },
                })
              }
            >
              <Text style={styles.action}>Editar avaliação</Text>
            </TouchFeedback>
            {confirm === item.id ? (
              <>
                <Text style={styles.text}>Excluir esta avaliação?</Text>
                <DangerButton
                  title="Confirmar exclusão"
                  disabled={!!deleting}
                  busy={deleting === item.id}
                  onPress={() => void remove(item.id)}
                />
                <TouchFeedback
                  disabled={!!deleting}
                  label="Cancelar exclusão"
                  onPress={() => setConfirm(null)}
                >
                  <Text style={styles.action}>Cancelar</Text>
                </TouchFeedback>
              </>
            ) : (
              <TouchFeedback
                disabled={!!deleting}
                label="Excluir avaliação"
                onPress={() => setConfirm(item.id)}
              >
                <Text style={styles.action}>Excluir</Text>
              </TouchFeedback>
            )}
            <TouchFeedback
              label="Ver histórico da avaliação"
              onPress={() => setHistory(history === item.id ? null : item.id)}
            >
              <Text style={styles.action}>
                {history === item.id ? "Fechar histórico" : "Ver histórico"}
              </Text>
            </TouchFeedback>
            {history === item.id && (
              <HistoryList kind="avaliacao" id={item.id} />
            )}
          </View>
        )}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  title: {
    fontSize: 25,
    fontWeight: "700",
    color: palette.text,
    marginVertical: 14,
  },
  name: {
    fontSize: typography.section,
    fontWeight: "700",
    color: palette.text,
  },
  text: { color: palette.muted, lineHeight: 22, marginVertical: 8 },
  action: { color: palette.error, fontWeight: "700", paddingVertical: 12 },
  card: {
    backgroundColor: "white",
    padding: 18,
    borderRadius: radius.medium,
    marginTop: 16,
  },
});
