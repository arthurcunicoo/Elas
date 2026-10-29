import { layout, palette, motionTiming } from "../constants/theme";
import { type PropsWithChildren, useCallback, useEffect, useRef, useState } from "react";
import { type AccessibilityRole, type AccessibilityState, Animated, Platform, Pressable, type StyleProp, type ViewStyle } from "react-native";

import { useReducedMotion } from "../hooks/useReducedMotion";
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
type Props = PropsWithChildren<{
  onPress: () => void;
  testID?: string;
  label: string;
  selected?: boolean;
  spring?: boolean;
  pressedScale?: number;
  disabled?: boolean;
  busy?: boolean;
  role?: AccessibilityRole;
  checked?: AccessibilityState["checked"];
  focusTone?: "brand" | "inverse";
  style?: StyleProp<ViewStyle>;
}>;
export function TouchFeedback({
  children,
  testID,
  onPress,
  label,
  selected,
  style,
  spring = true,
  pressedScale = 0.94,
  disabled = false,
  busy = false,
  role = "button",
  checked,
  focusTone = "brand",
}: Props) {
  const scale = useRef(new Animated.Value(1)).current,
    opacity = useRef(new Animated.Value(1)).current;
  const [focused, setFocused] = useState(false);
  const reduced = useReducedMotion(),
    unavailable = disabled || busy;
  useEffect(() => {
    if (unavailable) {
      scale.stopAnimation();
      opacity.stopAnimation();
      scale.setValue(1);
      opacity.setValue(1);
    }
  }, [unavailable, scale, opacity]);
  useEffect(
    () => () => {
      scale.stopAnimation();
      opacity.stopAnimation();
    },
    [scale, opacity],
  );
  const animate = useCallback(
    (down: boolean) => {
      scale.stopAnimation();
      opacity.stopAnimation();
      if (reduced) {
        opacity.setValue(down ? 0.72 : 1);
        scale.setValue(1);
        return;
      }
      const native = Platform.OS !== "web";
      Animated.timing(opacity, {
        toValue: down ? 0.84 : 1,
        duration: down ? motionTiming.pressFadeIn : motionTiming.pressFadeOut,
        useNativeDriver: native,
      }).start();
      if (down) {
        Animated.timing(scale, {
          toValue: pressedScale,
          duration: motionTiming.pressScaleIn,
          useNativeDriver: native,
        }).start();
      } else if (spring) {
        scale.setValue(pressedScale);
        Animated.spring(scale, {
          toValue: 1,
          stiffness: 320,
          damping: 13,
          mass: 0.65,
          useNativeDriver: native,
        }).start();
      } else {
        Animated.timing(scale, {
          toValue: 1,
          duration: motionTiming.pressScaleOut,
          useNativeDriver: native,
        }).start();
      }
    },
    [opacity, pressedScale, reduced, scale, spring],
  );
  const handleFocus = useCallback(() => setFocused(true), []);
  const handleBlur = useCallback(() => setFocused(false), []);
  const handlePressIn = useCallback(() => animate(true), [animate]);
  const handlePressOut = useCallback(() => animate(false), [animate]);
  return (
    <AnimatedPressable
      testID={testID}
      accessibilityRole={role}
      accessibilityLabel={label}
      accessibilityState={{ selected, checked, disabled: unavailable, busy }}
      disabled={unavailable}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onPress={() => {
        if (!unavailable) onPress();
      }}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        { minHeight: layout.touch, justifyContent: "center" },
        style,
        Platform.OS === "web" &&
          focused && {
            outlineWidth: 2,
            outlineStyle: "solid",
            outlineColor: focusTone === "inverse" ? palette.surface : palette.brand,
            outlineOffset: 3,
          },
        { opacity: unavailable ? 0.65 : opacity, transform: [{ scale }] },
      ]}
    >
      {children}
    </AnimatedPressable>
  );
}
