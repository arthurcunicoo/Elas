import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Platform } from "react-native";
import type { Place } from "../../constants/places";
import { useReducedMotion } from "../../hooks/useReducedMotion";
export function usePlaceCardMotion(place: Place | null, expanded: boolean) {
  const reduced = useReducedMotion();
  const zoom = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (reduced) {
      zoom.setValue(1);
      return;
    }
    zoom.setValue(0.94);
    const animation = Animated.spring(zoom, {
      toValue: 1,
      damping: 22,
      stiffness: 260,
      useNativeDriver: Platform.OS !== "web",
    });
    animation.start();
    return () => animation.stop();
  }, [expanded, zoom, reduced]);
  const [shown, setShown] = useState<Place | null>(null);
  const current = useRef<Place | null>(null);
  const entrance = useRef(new Animated.Value(0)).current;
  const content = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    let active = true;
    const timing = (value: Animated.Value, toValue: number, duration: number) =>
      Animated.timing(value, {
        toValue,
        duration: reduced ? 0 : duration,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: Platform.OS !== "web",
      });
    let animation: Animated.CompositeAnimation;
    if (!place) {
      animation = timing(entrance, 0, 180);
      animation.start(({ finished }) => {
        if (active && finished) {
          current.current = null;
          setShown(null);
        }
      });
    } else if (current.current && current.current.id !== place.id) {
      current.current = place;
      setShown(place);
      content.setValue(0);
      animation = Animated.parallel([
        timing(content, 1, 180),
        timing(entrance, 1, 180),
      ]);
      animation.start();
    } else {
      current.current = place;
      setShown(place);
      content.setValue(1);
      animation = timing(entrance, 1, 300);
      animation.start();
    }
    return () => {
      active = false;
      animation?.stop();
    };
  }, [place, entrance, content, reduced]);
  return { shown, entrance, content, zoom };
}
