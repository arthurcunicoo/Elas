import { cardShadow, colors, glass, palette, radius, typography } from "../constants/theme";
import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import Ionicons from "./icons/Ionicon";
import MaterialCommunityIcons from "./icons/CommunityIcon";
import { Achievement } from "../constants/achievements";

import { AchievementProgressBar } from "./AchievementProgressBar";
import { MotionReveal } from "./MotionReveal";
export const AchievementDetailCard = memo(function AchievementDetailCard({
  item,
  index,
}: {
  item: Achievement;
  index: number;
}) {
  return (
    <MotionReveal duration={320} delay={index * 45} distance={12}>
      <View style={styles.card}>
        <MaterialCommunityIcons
          name={item.icon}
          size={30}
          color={item.color}
          style={styles.icon}
        />
        <View style={styles.detail}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.description}>{item.description}</Text>
          {!item.completed && (
            <AchievementProgressBar
              value={item.value}
              total={item.total}
              delay={index * 45 + 130}
            />
          )}
        </View>
        {item.completed && (
          <MotionReveal duration={280} delay={index * 45 + 100} distance={0}>
            <Ionicons
              name="checkmark-circle"
              size={25}
              color={palette.successFill}
              accessibilityLabel="Conquista concluída"
            />
          </MotionReveal>
        )}
      </View>
    </MotionReveal>
  );
});
const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: glass.surfaceStrong,
    borderWidth: 1,
    borderColor: glass.border,
    borderRadius: radius.large,
    paddingHorizontal: 14,
    paddingVertical: 14,
    minHeight: 64,
    gap: 10,
    ...cardShadow,
  },
  icon: { width: 36, flexShrink: 0, textAlign: "center" },
  detail: { flex: 1, minWidth: 0 },
  title: {
    fontSize: typography.input,
    lineHeight: 22,
    color: colors.wine,
    fontWeight: "600",
  },
  description: {
    fontSize: typography.secondary,
    color: colors.wine,
    marginTop: 2,
    lineHeight: 18,
  },
});
