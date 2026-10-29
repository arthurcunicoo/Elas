import { CollectionState } from "../../components/shared/CollectionState";
import { LoadingIndicator } from "../../components/loading/LoadingIndicator";
import { cardShadow, colors, glass, ui, palette, radius, typography } from "../../constants/theme";
import { useCallback, useRef, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import Ionicons from "../../components/icons/Ionicon";
import { router, useFocusEffect } from "expo-router";
import { TouchFeedback } from "../../components/TouchFeedback";
import { Message } from "../../components/shared/FeaturePage";

import { displayTime } from "../../lib/displayTime";
import { friendlyError } from "../../lib/supabase";
import { usePagedList } from "../profile/usePagedList";
import { listNotifications, markRead, markAllRead, unreadCount } from "./notifications";

export function NotificationsList() {
  const list = usePagedList(listNotifications);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [unread, setUnread] = useState<number | null>(null);
  const lock = useRef(false),
    mounted = useRef(false);
  useFocusEffect(
    useCallback(() => {
      mounted.current = true;
      setBusy(lock.current);
      let active = true;
      void unreadCount()
        .then((n) => {
          if (active) setUnread(n);
        })
        .catch((e) => {
          if (active) setError(friendlyError(e));
        });
      return () => {
        active = false;
        mounted.current = false;
      };
    }, []),
  );
  async function readAll() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await markAllRead();
      if (mounted.current) {
        setUnread(0);
        list.refresh();
      }
    } catch (e) {
      if (mounted.current) setError(friendlyError(e));
    } finally {
      lock.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  function open(
    item: Awaited<ReturnType<typeof listNotifications>>["rows"][number],
  ) {
    if (!item.lida) {
      void markRead(item.id).catch((e) => {
        if (mounted.current) setError(friendlyError(e));
      });
    }
    router.push({
      pathname: "/registro",
      params: { kind: item.tipo, id: item.registro_id },
    });
  }
  return (
    <View style={styles.root}>
      <Message text={error || (list.rows.length ? list.error : "")} error />
      <View style={styles.heading}>
        <Text style={styles.count}>
          {unread == null
            ? "Suas atualizações"
            : unread
              ? `${unread} não lida${unread === 1 ? "" : "s"}`
              : "Tudo em dia"}
        </Text>
        {!!unread && (
          <TouchFeedback
            label="Marcar todas como lidas"
            disabled={busy}
            busy={busy}
            onPress={() => void readAll()}
            style={styles.readAll}
          >
            <Ionicons
              name="checkmark-done-outline"
              size={18}
              color={colors.pink}
            />
            <Text style={styles.readAllText}>Ler todas</Text>
          </TouchFeedback>
        )}
      </View>
      <FlatList
        data={list.rows}
        keyExtractor={(r) => r.id}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={5}
        refreshing={list.loading}
        onRefresh={list.refresh}
        onEndReached={list.more}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListFooterComponent={
          list.loading && list.rows.length > 0 ? (
            <LoadingIndicator style={{ padding: 16 }} />
          ) : null
        }
        ListEmptyComponent={
          <CollectionState
            loading={list.loading}
            error={list.error}
            title="Você está por dentro"
            message="As novidades dos seus relatos, avaliações e solicitações chegam aqui."
            skeleton="notifications"
            onRetry={list.refresh}
          />
        }
        renderItem={({ item }) => (
          <TouchFeedback
            label={`${item.lida ? "" : "Nova notificação. "}${item.titulo}. ${item.mensagem}. Abrir registro${item.lida ? "" : " e marcar como lida"}.`}
            onPress={() => open(item)}
            style={[styles.card, !item.lida && styles.unread]}
            pressedScale={0.99}
          >
            <View style={styles.row}>
              <View style={styles.icon}>
                <Ionicons
                  name={
                    item.tipo === "relato"
                      ? "megaphone-outline"
                      : item.tipo === "avaliacao"
                        ? "chatbubble-outline"
                        : "construct-outline"
                  }
                  size={21}
                  color={colors.pink}
                />
              </View>
              <View style={styles.body}>
                <View style={styles.meta}>
                  <Text style={styles.time}>{displayTime(item.criado_em)}</Text>
                  {!item.lida && (
                    <View accessibilityLabel="Não lida" style={styles.dot} />
                  )}
                </View>
                <Text style={styles.title}>{item.titulo}</Text>
                <Text style={styles.message} numberOfLines={3}>
                  {item.mensagem}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={17} color={ui.muted} />
            </View>
          </TouchFeedback>
        )}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1 },
  list: { flexGrow: 1, paddingVertical: 4, paddingHorizontal: 2, paddingBottom: 40 },
  heading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 12,
    minHeight: 44,
    flexWrap: "wrap",
  },
  count: { color: ui.muted, fontSize: typography.secondary, fontWeight: "600" },
  readAll: {
    minHeight: 44,
    paddingHorizontal: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  readAllText: {
    color: colors.pink,
    fontSize: typography.secondary,
    fontWeight: "600",
  },
  card: {
    backgroundColor: glass.surfaceStrong,
    borderRadius: radius.large,
    padding: 16,
    borderWidth: 1,
    borderColor: glass.border,
    alignItems: "stretch",
    ...cardShadow,
  },
  unread: {
    backgroundColor: glass.surfaceSoft,
    borderColor: glass.tintedBorder,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  body: { flex: 1, minWidth: 0, gap: 5 },
  icon: {
    width: 40,
    height: 40,
    flexShrink: 0,
    borderRadius: radius.medium,
    backgroundColor: palette.surfaceTint,
    alignItems: "center",
    justifyContent: "center",
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  time: { color: ui.muted, fontSize: typography.caption },
  dot: {
    width: 7,
    height: 7,
    borderRadius: radius.small,
    backgroundColor: colors.pink,
  },
  title: {
    color: ui.text,
    fontSize: typography.card,
    fontWeight: "600",
    lineHeight: 21,
  },
  message: { color: ui.muted, fontSize: typography.secondary, lineHeight: 20 },
});
