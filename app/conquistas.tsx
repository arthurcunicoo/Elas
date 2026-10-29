import { LoadingState } from "../components/loading/LoadingState";
import { colors, palette, pageContent } from "../constants/theme";
import { PageHeader } from "../components/shared/PageHeader";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";

import { achievements } from "../constants/achievements";
import { AchievementDetailCard } from "../components/AchievementDetailCard";
import { MotionReveal } from "../components/MotionReveal";
import { backendConfigured } from "../lib/supabase";
import { useParticipation } from "../features/community/useParticipation";
import { originalAchievementProgress } from "../features/community/progress";
export default function Achievements() {
  const progress = useParticipation();
  const items = backendConfigured
    ? progress.data
      ? originalAchievementProgress(progress.data)
      : []
    : achievements;
  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <PageHeader title="Conquistas" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        <MotionReveal duration={280} delay={30} distance={8}>
          <Text style={styles.subtitle}>Suas ações fazem a cidade melhor!</Text>
        </MotionReveal>
        <View style={styles.list}>
          {!!progress.error && (
            <Text accessibilityRole="alert" style={{ color: colors.wine }}>
              {progress.error}
            </Text>
          )}
          {backendConfigured && !progress.data && !progress.error && (
            <LoadingState
              title="Suas ações fazem diferença"
              message="Reunindo suas conquistas na comunidade."
            />
          )}
          {items.map((item, index) => (
            <AchievementDetailCard key={item.id} item={item} index={index} />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  scroll: { flexGrow: 1, paddingBottom: 50 },
  subtitle: {
    color: palette.accent,
    fontSize: 17,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 19,
    marginBottom: 22,
    paddingHorizontal: 15,
  },
  list: { ...pageContent, gap: 20 },
});
