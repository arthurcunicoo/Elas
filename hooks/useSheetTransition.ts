import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Platform } from "react-native";
import { useReducedMotion } from "./useReducedMotion";
// Retain the modal during exit, stop interrupted transitions, and honor reduced motion.
export function useSheetTransition(visible: boolean) {
  const reduced = useReducedMotion();
  const [present, setPresent] = useState(visible);
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (visible && !present) {
      setPresent(true);
      return;
    }
    if (!present) return;
    let active = true;
    const animation = Animated.timing(progress, {
      toValue: visible ? 1 : 0,
      duration: reduced ? 0 : visible ? 280 : 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== "web",
    });
    animation.start(({ finished }) => {
      if (active && finished && !visible) setPresent(false);
    });
    return () => {
      active = false;
      animation.stop();
    };
  }, [visible, present, progress, reduced]);
  return { present, progress, reduced };
}
