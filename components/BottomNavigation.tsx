import { colors, fonts, glass, palette, radius, typography } from "../constants/theme";
import { type ComponentProps, useEffect, useRef } from "react";
import { Animated, Platform, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "./icons/Ionicon";
import { TouchFeedback } from "./TouchFeedback";

import { useReducedMotion } from "../hooks/useReducedMotion";
function NavMotion({
  active,
  children,
}: {
  active: boolean;
  children: React.ReactNode;
}) {
  const reduced = useReducedMotion();
  const value = useRef(new Animated.Value(active ? 1 : 0)).current;
  useEffect(() => {
    const animation = Animated.spring(value, {
      toValue: active && !reduced ? 1 : 0,
      stiffness: 320,
      damping: 22,
      useNativeDriver: Platform.OS !== "web",
    });
    animation.start();
    return () => animation.stop();
  }, [active, reduced, value]);
  return (
    <Animated.View
      style={{
        width: "100%",
        alignItems: "center",
        transform: [
          {
            translateY: value.interpolate({
              inputRange: [0, 1],
              outputRange: [0, -2],
            }),
          },
        ],
      }}
    >
      {children}
    </Animated.View>
  );
}
type Icon = ComponentProps<typeof Ionicons>["name"];
const items: { label: string; icon: Icon; activeIcon: Icon }[] = [
  { label: "Mapa", icon: "location-outline", activeIcon: "location" },
  { label: "Eventos", icon: "calendar-outline", activeIcon: "calendar" },
  { label: "Participar", icon: "add", activeIcon: "add" },
  {
    label: "Relatos",
    icon: "document-text-outline",
    activeIcon: "document-text",
  },
  { label: "Perfil", icon: "person-outline", activeIcon: "person" },
];
export function BottomNavigation({
  onAction,
  active = "Perfil",
  addLabel = "Participar",
  addAccessibilityLabel,
}: {
  onAction: (label: string) => void;
  active?: "Mapa" | "Eventos" | "Relatos" | "Perfil";
  addLabel?: string;
  addAccessibilityLabel?: string;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(10, insets.bottom) }]}>
      {items.map((item) =>
        item.label === "Participar" ? (
          <TouchFeedback
            key={item.label}
            testID="nav-participate"
            label={addAccessibilityLabel ?? addLabel}
            onPress={() => onAction(item.label)}
            pressedScale={0.92}
            style={styles.addItem}
          >
            <View style={styles.add}>
              <Ionicons name="add" color={colors.white} size={27} />
            </View>
            <Text style={styles.addLabel}>{addLabel}</Text>
          </TouchFeedback>
        ) : (
          <TouchFeedback
            key={item.label}
            testID={`nav-${item.label === "Mapa" ? "map" : item.label === "Eventos" ? "events" : item.label === "Relatos" ? "reports" : "profile"}`}
            role="tab"
            label={item.label}
            selected={item.label === active}
            onPress={() => onAction(item.label)}
            style={styles.item}
          >
            <NavMotion active={item.label === active}>
              <View
                style={[
                  styles.icon,
                  item.label === active && styles.selectedIcon,
                ]}
              >
                <Ionicons
                  name={item.label === active ? item.activeIcon : item.icon}
                  size={22}
                  color={item.label === active ? colors.pink : palette.muted}
                />
              </View>
              <Text
                style={[styles.label, item.label === active && styles.active]}
              >
                {item.label}
              </Text>
            </NavMotion>
          </TouchFeedback>
        ),
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    paddingTop: 8,
    paddingHorizontal: 10,
    minHeight: 78,
    alignItems: "center",
    overflow: "visible",
    backgroundColor: glass.surfaceStrong,
    borderTopLeftRadius: radius.large,
    borderTopRightRadius: radius.large,
    borderTopWidth: 1,
    borderTopColor: glass.specularBorder,
    shadowColor: palette.wine,
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -4 },
    elevation: 8,
  },
  item: {
    flex: 1,
    minWidth: 0,
    minHeight: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    width: 46,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    marginBottom: 3,
  },
  selectedIcon: {
    backgroundColor: glass.surfaceSoft,
    borderWidth: 1,
    borderColor: glass.tintedBorder,
  },
  label: {
    fontFamily: fonts.sans,
    fontSize: typography.caption,
    lineHeight: 16,
    fontWeight: "600",
    color: palette.muted,
    textAlign: "center",
    maxWidth: "100%",
  },
  active: {
    fontFamily: fonts.display,
    color: colors.pink,
    fontWeight: "800",
  },
  addItem: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    justifyContent: "flex-start",
    overflow: "visible",
    minHeight: 62,
    marginTop: -14,
  },
  add: {
    width: 52,
    height: 52,
    borderRadius: radius.pill,
    backgroundColor: colors.pink,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: colors.white,
    shadowColor: colors.pink,
    shadowOpacity: 0.32,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 6,
  },
  addLabel: {
    fontFamily: fonts.display,
    color: colors.pink,
    fontSize: typography.caption,
    lineHeight: 16,
    marginTop: 3,
    fontWeight: "800",
  },
});
