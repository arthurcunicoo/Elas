import {demonstrationPolls, demonstrateVote, demonstrationResult} from "../features/presentation/content";
import { useServiceTimeZone } from "../hooks/useServiceTimeZone";
import { CollectionState } from "../components/shared/CollectionState";
import { localPage, emptyPage, type Cursor, type Page } from "../lib/pagination";
import { cardShadow, colors, glass, radius, typography, pageContent } from "../constants/theme";
import { PageHeader } from "../components/shared/PageHeader";
import { listDemonstrations } from "../services/showcase";
import { EventDetailsSheet } from "../components/events/EventDetailsSheet";
import { useCallback, useRef, useState } from "react";
import { Animated, Easing, FlatList, Platform, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { upcomingEvents } from "../constants/events";
import { MotionReveal } from "../components/MotionReveal";
import { TouchFeedback } from "../components/TouchFeedback";
import { PollCard } from "../components/events/PollCard";
import { EventCard } from "../components/events/EventCard";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { backendConfigured, friendlyError } from "../lib/supabase";
import { listEvents, listPolls, registerEvent, vote, Poll } from "../features/community/community";
import { usePagedList } from "../features/profile/usePagedList";
type Tab = "Eventos" | "Enquetes";
type EventRow = Awaited<ReturnType<typeof listEvents>>["rows"][number] & {
  dateLabel?: string;
  demonstracao?: boolean;
};
export default function Events() {
  const serviceTimeZone = useServiceTimeZone();
  const reduced = useReducedMotion();
  const [demoChoices, setDemoChoices] = useState<Record<string, string>>({});
  const [demoRows, setDemoRows] = useState<Awaited<ReturnType<typeof listDemonstrations>>>([]);
  const [selected, setSelected] = useState<EventRow | null>(null);
  const [tab, setTab] = useState<Tab>("Eventos"),
    [tabsWidth, setTabsWidth] = useState(0),
    [sending, setSending] = useState<string | null>(null),
    [error, setError] = useState(""),
    [past, setPast] = useState(false);
  const active = useRef(new Animated.Value(0)).current,
    content = useRef(new Animated.Value(1)).current,
    busy = useRef(false),
    lock = useRef(false),
    currentTab = useRef<Tab>("Eventos");
  const loadEvents = useCallback(
    async (cursor: Cursor | null): Promise<Page<EventRow>> => {
      if (!backendConfigured)
        return cursor || past
          ? emptyPage<EventRow>()
          : localPage(
              upcomingEvents.map((e) => ({
                id: e.id,
                titulo: e.title,
                descricao: e.description,
                inicia_em: "",
                local_texto: "",
                inscrito: false,
                dateLabel: e.date,
                cancelado: false,
                demonstracao: true,
              })),
            );
      const page = await listEvents(cursor, past);
      if (page.rows.length || cursor || past) return page;
      return localPage(
        (await listDemonstrations("evento"))
          .filter(
            (e) => e.inicia_em && new Date(e.inicia_em).getTime() > Date.now(),
          )
          .map((e) => ({
            id: e.id,
            titulo: e.titulo,
            descricao: e.descricao,
            local_texto: e.local_texto,
            inicia_em: e.inicia_em!,
            cancelado: false,
            inscrito: false,
            demonstracao: true,
          })),
      );
    },
    [past],
  );
  const loadPolls = useCallback(
    async (cursor: Cursor | null) => {
      if (!backendConfigured) return emptyPage<Poll>();
      const page = await listPolls(cursor, past);
      if (page.rows.length || cursor) return page;
      const rows = await listDemonstrations("enquete");
      setDemoRows(rows);
      return localPage(demonstrationPolls(rows, past));
    }, [past],
  );
  const events = usePagedList(loadEvents, String(past)),
    polls = usePagedList(loadPolls, String(past));
  useFocusEffect(
    useCallback(() => {
      busy.current = false;
      content.setValue(1);
      active.setValue(currentTab.current === "Eventos" ? 0 : 1);
      return () => {
        content.stopAnimation();
        active.stopAnimation();
        busy.current = false;
      };
    }, [active, content]),
  );
  function changeTab(next: Tab) {
    if (busy.current || next === tab) return;
    busy.current = true;
    Animated.timing(active, {
      toValue: next === "Eventos" ? 0 : 1,
      duration: reduced ? 0 : 280,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: Platform.OS !== "web",
    }).start();
    Animated.timing(content, {
      toValue: 0,
      duration: reduced ? 0 : 120,
      useNativeDriver: Platform.OS !== "web",
    }).start(({ finished }) => {
      if (!finished) return;
      currentTab.current = next;
      setTab(next);
      Animated.timing(content, {
        toValue: 1,
        duration: reduced ? 0 : 180,
        useNativeDriver: Platform.OS !== "web",
      }).start(() => {
        busy.current = false;
      });
    });
  }
  async function participate(event: EventRow) {
    if (lock.current) return;
    if (event.demonstracao) return;
    if (!backendConfigured) {
      setError("Demonstração: a inscrição não será enviada.");
      return;
    }
    lock.current = true;
    setSending(event.id);
    setError("");
    try {
      await registerEvent(event.id, !event.inscrito);
      setSelected((current) =>
        current?.id === event.id
          ? { ...current, inscrito: !event.inscrito }
          : current,
      );
      events.refresh();
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      lock.current = false;
      setSending(null);
    }
  }
  async function cast(poll: Poll, option: string) {
    if (poll.demonstracao) {
      demonstrateVote(poll, option);
      setDemoChoices(current => ({...current, [poll.id]: option}));
      return;
    }
    if (lock.current) throw new Error("Aguarde o envio atual.");
    lock.current = true;
    setSending(poll.id);
    setError("");
    try {
      await vote(poll.id, option);
      polls.refresh();
    } finally {
      lock.current = false;
      setSending(null);
    }
  }
  const tabs = (
    <MotionReveal duration={280} distance={6}>
      <View
        style={styles.tabs}
        onLayout={(e) => setTabsWidth(e.nativeEvent.layout.width)}
      >
        <View pointerEvents="none" style={styles.tabBackgrounds}>
          <View style={styles.tabBackground} />
          <View style={styles.tabBackground} />
        </View>
        {!!tabsWidth && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.indicator,
              {
                width: (tabsWidth - 8) / 2,
                transform: [
                  {
                    translateX: active.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, (tabsWidth - 8) / 2],
                    }),
                  },
                ],
              },
            ]}
          />
        )}
        {(["Eventos", "Enquetes"] as const).map((name) => (
          <TouchFeedback
            role="tab"
            key={name}
            label={name}
            selected={tab === name}
            onPress={() => changeTab(name)}
            style={styles.tab}
          >
            <Text style={[styles.tabText, tab === name && styles.activeText]}>
              {name}
            </Text>
          </TouchFeedback>
        ))}
      </View>
    </MotionReveal>
  );
  const header = (
    <View>
      {tabs}
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
        {[false, true].map((value) => (
          <TouchFeedback
            key={String(value)}
            label={value ? "Encerrados e cancelados" : "Em aberto"}
            selected={past === value}
            onPress={() => {
              if (!lock.current) setPast(value);
            }}
            style={[
              styles.tabBackground,
              {
                minHeight: 44,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: radius.pill,
                borderWidth: 1,
                borderColor: past === value ? colors.pink : glass.border,
                backgroundColor: past === value ? glass.surfaceSoft : glass.surface,
              },
            ]}
          >
            <Text style={{ color: colors.pink }}>
              {value ? "Histórico" : "Em aberto"}
            </Text>
          </TouchFeedback>
        ))}
      </View>
      {!!error && (
        <Text
          accessibilityRole="alert"
          style={{ color: colors.wine, marginBottom: 12 }}
        >
          {error}
        </Text>
      )}
      {tab === "Eventos" && (
        <>
          <Text style={styles.section}>
            {past ? "Eventos encerrados e cancelados" : "Próximos eventos"}
          </Text>
        </>
      )}
      {tab === "Enquetes" && (
        <Text style={styles.section}>Enquetes da cidade</Text>
      )}
    </View>
  );
  const empty = (
    <CollectionState
      loading={tab === "Eventos" ? events.loading : polls.loading}
      error={tab === "Eventos" ? events.error : polls.error}
      title={
        tab === "Eventos"
          ? "Nenhum evento publicado ainda."
          : "Nenhuma enquete publicada ainda."
      }
      message="As próximas novidades da comunidade aparecerão aqui."
      onRetry={tab === "Eventos" ? events.refresh : polls.refresh}
    />
  );
  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <PageHeader title="Eventos" />
      <Animated.View
        style={[
          styles.page,
          {
            flex: 1,
            opacity: content,
            transform: [
              {
                translateY: content.interpolate({
                  inputRange: [0, 1],
                  outputRange: [6, 0],
                }),
              },
            ],
          },
        ]}
      >
        {tab === "Eventos" ? (
          <FlatList
            data={events.rows}
            keyExtractor={(e) => e.id}
            initialNumToRender={6}
            maxToRenderPerBatch={6}
            windowSize={5}
            ListHeaderComponent={header}
            ListEmptyComponent={empty}
            contentContainerStyle={styles.scroll}
            refreshing={events.loading}
            onRefresh={events.refresh}
            onEndReached={events.more}
            ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
            renderItem={({ item }) => (
              <EventCard
                event={{
                  title: item.titulo,
                  description: item.descricao,
                  place: item.local_texto,
                  startsAt: item.inicia_em,
                  date:
                    item.dateLabel ??
                    new Date(item.inicia_em).toLocaleString("pt-BR", {
                      timeZone: serviceTimeZone,
                    }),
                }}
                closed={
                  item.cancelado ||
                  (!!item.inicia_em &&
                    new Date(item.inicia_em).getTime() <= Date.now())
                }
                cancelled={item.cancelado}
                demonstration={item.demonstracao}
                registered={item.inscrito}
                onOpen={() => {
                  setError("");
                  setSelected(item);
                }}
              />
            )}
          />
        ) : (
          <FlatList
            data={polls.rows}
            keyExtractor={(e) => e.id}
            initialNumToRender={6}
            maxToRenderPerBatch={6}
            windowSize={5}
            ListHeaderComponent={header}
            ListEmptyComponent={empty}
            contentContainerStyle={styles.scroll}
            refreshing={polls.loading}
            onRefresh={polls.refresh}
            onEndReached={polls.more}
            ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
            renderItem={({ item }) => (
              <PollCard
                poll={item.demonstracao && demoChoices[item.id]
                  ? demonstrationResult(item, demoRows.find(value => value.id === item.id), demoChoices[item.id]) : item}
                onVote={(option) => cast(item, option)}
                onRefresh={polls.refresh}
                busy={sending === item.id}
              />
            )}
          />
        )}
      </Animated.View>
      <EventDetailsSheet
        event={selected}
        onClose={() => setSelected(null)}
        onParticipate={() => {
          if (selected) void participate(selected);
        }}
        busy={!!selected && sending === selected.id}
        error={error}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  scroll: { flexGrow: 1, paddingHorizontal: 2, paddingBottom: 48 },
  page: { ...pageContent },
  tabs: {
    flexDirection: "row",
    padding: 4,
    borderRadius: radius.large,
    backgroundColor: glass.surfaceStrong,
    borderWidth: 1,
    borderColor: glass.border,
    marginHorizontal: 0,
    marginTop: 18,
    marginBottom: 18,
    ...cardShadow,
  },
  tabBackgrounds: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: "row",
    gap: 0,
  },
  tabBackground: {
    flex: 1,
    borderRadius: radius.medium,
    backgroundColor: "transparent",
  },
  indicator: {
    position: "absolute",
    top: 4,
    bottom: 4,
    left: 4,
    borderRadius: radius.medium,
    backgroundColor: colors.pink,
  },
  tab: {
    flex: 1,
    minHeight: 48,
    borderRadius: radius.medium,
    alignItems: "center",
  },
  tabText: {
    textAlign: "center",
    fontSize: typography.card,
    fontWeight: "600",
    color: colors.wine,
  },
  activeText: { color: colors.white },
  section: {
    color: colors.wine,
    fontSize: typography.section,
    fontWeight: "700",
    marginTop: 14,
    marginBottom: 6,
    marginLeft: 6,
  },
});
