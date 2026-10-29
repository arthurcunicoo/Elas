import { fonts, glass, glassShadow, palette, radius, typography } from "../../constants/theme";
import { impactStatus, type ImpactStatus } from "../../constants/impactStatus";
import { useCallback, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, Text } from "react-native";
import { useFocusEffect } from "expo-router";

import { MotionReveal } from "../MotionReveal";
import { useReducedMotion } from "../../hooks/useReducedMotion";
export function ImpactStatCard({
  total,
  status,
  delay,
}: {
  total: number;
  status: ImpactStatus;
  delay: number;
}) {
  const { plural: label, ink } = impactStatus[status];
  const reduced = useReducedMotion();
  const value = useRef(new Animated.Value(total)).current;
  const [count, setCount] = useState(total);
  useFocusEffect(
    useCallback(() => {
      if (reduced) {
        setCount(total);
        return;
      }
      value.setValue(0);
      setCount(0);
      let lastCount = 0;
      const listener = value.addListener(({ value: current }) => {
        const next = Math.round(current);
        if (next !== lastCount) {
          lastCount = next;
          setCount(next);
        }
      });
      const animation = Animated.timing(value, {
        toValue: total,
        duration: 850,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      });
      animation.start();
      return () => {
        animation.stop();
        value.removeListener(listener);
      };
    }, [delay, reduced, total, value]),
  );
  return (
    <MotionReveal
      delay={delay}
      duration={340}
      distance={15}
      style={styles.card}
    >
      <Text
        adjustsFontSizeToFit
        numberOfLines={1}
        accessibilityLabel={`${total} ${label}`}
        style={[
          styles.number,
          {
            color: ink,
          },
        ]}
      >
        {count}
      </Text>
      <Text style={styles.label}>{label}</Text>
    </MotionReveal>
  );
}
const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: glass.surfaceStrong,
    borderWidth: 1,
    borderColor: glass.border,
    borderRadius: radius.large,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 4,
    minHeight: 102,
    ...glassShadow,
  },
  number: {
    fontFamily: fonts.display,
    fontSize: 36,
    lineHeight: 42,
    fontWeight: "800",
    letterSpacing: -0.5,
    fontVariant: ["tabular-nums"],
  },
  label: {
    fontSize: typography.secondary,
    color: palette.text,
    textAlign: "center",
    marginTop: 1,
  },
});
