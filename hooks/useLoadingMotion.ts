import { NavigationContext } from "@react-navigation/native";
import { useContext, useEffect, useRef, useState } from "react";
import { Animated, AppState, Easing, Platform } from "react-native";
import { useReducedMotion } from "./useReducedMotion";

/** One shared clock: no React updates per frame, paused offscreen/in background. */
export function useLoadingMotion(active: boolean) {
  const reduced = useReducedMotion();
  const navigation = useContext(NavigationContext);
  const [focused, setFocused] = useState(() => navigation?.isFocused() ?? true);
  useEffect(() => {
    const update = () => setFocused(navigation?.isFocused() ?? true);
    update();
    const onFocus = navigation?.addListener("focus", update);
    const onBlur = navigation?.addListener("blur", update);
    return () => {
      onFocus?.();
      onBlur?.();
    };
  }, [navigation]);
  const [foreground, setForeground] = useState(
    AppState.currentState !== "background" &&
      AppState.currentState !== "inactive",
  );
  const phase = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) =>
      setForeground(state === "active"),
    );
    return () => subscription.remove();
  }, []);
  const moving = active && focused && foreground && !reduced;
  useEffect(() => {
    phase.setValue(0);
    if (!moving) return;
    const animation = Animated.loop(
      Animated.timing(phase, {
        toValue: 1,
        duration: 3200,
        easing: Easing.linear,
        useNativeDriver: Platform.OS !== "web",
        isInteraction: false,
      }),
    );
    animation.start();
    return () => animation.stop();
  }, [moving, phase]);
  return { phase, moving };
}
