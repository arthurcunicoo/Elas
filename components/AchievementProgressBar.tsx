import { colors, typography, palette, radius } from "../constants/theme";
import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";

import { useReducedMotion } from "../hooks/useReducedMotion";
export function AchievementProgressBar({
  value,
  total,
  delay = 0,
  compact = false,
  poll = false,
}: {
  value: number;
  total: number;
  delay?: number;
  compact?: boolean;
  poll?: boolean;
}) {
  const reduced = useReducedMotion();
  const progress = useRef(new Animated.Value(value / total)).current;
  const played = useRef(false);
  useEffect(() => {
    if (reduced) {
      progress.stopAnimation();
      progress.setValue(value / total);
      return;
    }
    if (played.current) return;
    played.current = true;
    progress.setValue(0);
    const animation = Animated.timing(progress, {
      toValue: value / total,
      duration: 650,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });
    animation.start();
    return () => {
      animation.stop();
      progress.setValue(value / total);
    };
  }, [progress, reduced, total, value, delay]);
  return (
    <View
      style={[styles.progressRow, poll && { marginTop: 3 }]}
      accessible
      accessibilityRole="progressbar"
      accessibilityValue={{
        min: 0,
        max: total,
        now: value,
        text: `${value} de ${total}`,
      }}
    >
      <View
        style={[
          styles.track,
          compact && { height: 7 },
          poll && { height: 14, borderRadius: radius.small },
        ]}
      >
        <Animated.View
          style={[
            styles.fill,
            poll && {
              backgroundColor: colors.achievement,
              borderRadius: radius.small,
            },
            {
              width: progress.interpolate({
                inputRange: [0, 1],
                outputRange: ["0%", "100%"],
              }),
            },
          ]}
        />
      </View>
      {!poll && (
        <Text
          style={[
            styles.count,
            compact && { fontSize: typography.caption, minWidth: 26 },
          ]}
        >
          {value}/{total}
        </Text>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
  },
  track: {
    flex: 1,
    height: 9,
    backgroundColor: palette.border,
    borderRadius: radius.small,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    backgroundColor: colors.pink,
    borderRadius: radius.small,
  },
  count: {
    color: colors.wine,
    fontSize: typography.caption,
    fontWeight: "600",
    minWidth: 31,
    textAlign: "right",
  },
});
