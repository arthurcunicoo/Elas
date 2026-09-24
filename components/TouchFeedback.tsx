import { PropsWithChildren, useEffect, useRef } from 'react';
import { AccessibilityRole, AccessibilityState, Animated, Platform, Pressable, StyleProp, ViewStyle } from 'react-native';
import { useReducedMotion } from '../hooks/useReducedMotion';
type Props = PropsWithChildren<{ onPress: () => void; label: string; selected?: boolean; spring?: boolean; pressedScale?: number; disabled?: boolean; busy?: boolean; role?: AccessibilityRole; checked?: AccessibilityState['checked']; immediate?: boolean; style?: StyleProp<ViewStyle> }>;
export function TouchFeedback({ children, onPress, label, selected, style, spring = true, pressedScale = .95, disabled = false, busy = false, role = 'button', checked, immediate = false }: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const locked = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reduced = useReducedMotion();
  const unavailable = disabled || busy;
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); scale.stopAnimation(); opacity.stopAnimation(); }, [scale, opacity]);
  function animate(down: boolean) {
    scale.stopAnimation(); opacity.stopAnimation();
    const native = Platform.OS !== 'web';
    Animated.timing(opacity, { toValue: down ? .72 : 1, duration: down ? 45 : 150, useNativeDriver: native }).start();
    if (reduced) { scale.setValue(1); return; }
    if (!down && spring) Animated.spring(scale, { toValue: 1, stiffness: 360, damping: 19, mass: .7, useNativeDriver: native }).start();
    else Animated.timing(scale, { toValue: down ? pressedScale : 1, duration: down ? 55 : 140, useNativeDriver: native }).start();
  }
  function press() {
    if (unavailable || locked.current) return;
    locked.current = true;
    if (immediate) { locked.current = false; onPress(); return; }
    // Give even a quick tap one visible frame before a route change.
    animate(true);
    timer.current = setTimeout(() => { animate(false); locked.current = false; if (!unavailable) onPress(); }, reduced ? 0 : 65);
  }
  return <Animated.View style={[{ minHeight: 44 }, style, { opacity: unavailable ? .5 : opacity, transform: [{ scale }] }]}><Pressable accessibilityRole={role} accessibilityLabel={label} accessibilityState={{ selected, checked, disabled: unavailable, busy }} disabled={unavailable} onPress={press} onPressIn={() => animate(true)} onPressOut={() => { if (!locked.current) animate(false); }} style={{ flexGrow: 1, justifyContent: 'center' }}>{children}</Pressable></Animated.View>;
}
