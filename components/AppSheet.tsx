import { colors, glass, glassShadow, ui, palette, radius, typography, layout } from "../constants/theme";
import { type ComponentProps, type ReactNode } from "react";
import { Animated, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "./icons/Ionicon";
import { TouchFeedback } from "./TouchFeedback";

import { useSheetTransition } from "../hooks/useSheetTransition";

export function AppSheet({
  visible,
  title,
  subtitle,
  icon,
  children,
  footer,
  onClose,
  onBack,
  dismissible = true,
  large = false,
  scroll = true,
}: {
  visible: boolean;
  title: string;
  subtitle?: string;
  icon?: ComponentProps<typeof Ionicons>["name"];
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  onBack?: () => void;
  dismissible?: boolean;
  large?: boolean;
  scroll?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const compact = width <= 600;
  const { present, progress: entrance, reduced } = useSheetTransition(visible);
  const close = () => {
    if (dismissible) onClose();
  };
  return (
    <Modal
      visible={present}
      transparent
      animationType="none"
      onRequestClose={() => {
        if (dismissible) (onBack ?? onClose)();
      }}
      statusBarTranslucent
    >
      <View style={styles.overlay} pointerEvents={visible ? "auto" : "none"}>
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: glass.overlay, opacity: entrance },
          ]}
        />
        <Pressable
          accessible={false}
          focusable={false}
          disabled={!dismissible}
          onPress={close}
          style={StyleSheet.absoluteFill}
        />
        <KeyboardAvoidingView
          pointerEvents="box-none"
          behavior={
            Platform.OS === "ios"
              ? "padding"
              : Platform.OS === "android"
                ? "height"
                : undefined
          }
          style={styles.keyboard}
        >
          <View
            pointerEvents="box-none"
            style={[
              styles.position,
              compact ? { paddingTop: insets.top + 12 } : styles.widePosition,
            ]}
          >
            <Animated.View
              accessibilityViewIsModal
              style={[
                styles.sheet,
                compact ? styles.mobileSheet : styles.wideSheet,
                large && styles.large,
                {
                  transform: [
                    {
                      translateY: entrance.interpolate({
                        inputRange: [0, 1],
                        outputRange: [reduced ? 0 : 32, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={styles.grabber} />
              <View style={styles.header}>
                {onBack ? (
                  <TouchFeedback
                    label="Voltar à etapa anterior"
                    disabled={!dismissible}
                    onPress={onBack}
                    style={styles.back}
                  >
                    <Ionicons
                      name="chevron-back"
                      size={24}
                      color={colors.wine}
                    />
                  </TouchFeedback>
                ) : icon ? (
                  <View style={styles.icon}>
                    <Ionicons name={icon} size={23} color={colors.pink} />
                  </View>
                ) : null}
                <View style={styles.heading}>
                  <Text accessibilityRole="header" style={styles.title}>
                    {title}
                  </Text>
                  {!!subtitle && (
                    <Text style={styles.subtitle}>{subtitle}</Text>
                  )}
                </View>
                <TouchFeedback
                  label={`Fechar ${title}`}
                  disabled={!dismissible}
                  onPress={close}
                  style={styles.close}
                >
                  <Ionicons name="close" size={23} color={ui.muted} />
                </TouchFeedback>
              </View>
              {scroll ? (
                <ScrollView
                  style={styles.scroll}
                  contentContainerStyle={styles.content}
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode="on-drag"
                  showsVerticalScrollIndicator={false}
                >
                  {children}
                </ScrollView>
              ) : (
                <View style={styles.fill}>{children}</View>
              )}
              {!!footer && (
                <View
                  style={[
                    styles.footer,
                    {
                      paddingBottom: compact
                        ? Math.max(16, insets.bottom + 8)
                        : 20,
                    },
                  ]}
                >
                  {footer}
                </View>
              )}
              {!footer && (
                <View
                  style={{
                    height: compact ? Math.max(16, insets.bottom + 8) : 20,
                  }}
                />
              )}
            </Animated.View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
const styles = StyleSheet.create({
  overlay: { flex: 1 },
  keyboard: { flex: 1 },
  position: { flex: 1, justifyContent: "flex-end" },
  widePosition: { justifyContent: "center", padding: 24 },
  sheet: {
    backgroundColor: glass.surfaceStrong,
    width: "100%",
    maxWidth: 520,
    maxHeight: "100%",
    alignSelf: "center",
    overflow: "hidden",
    flexShrink: 1,
    borderWidth: 1,
    borderColor: glass.border,
    ...glassShadow,
  },
  grabber: {
    width: 38,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: palette.icon,
    alignSelf: "center",
    marginTop: 10,
  },
  mobileSheet: {
    borderTopLeftRadius: radius.large,
    borderTopRightRadius: radius.large,
  },
  wideSheet: { borderRadius: radius.large },
  large: { height: "94%" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 16,
    gap: 12,
  },
  heading: { flex: 1, minWidth: 0 },
  title: { color: ui.text, fontSize: 20, lineHeight: 26, fontWeight: "700" },
  subtitle: {
    color: ui.muted,
    fontSize: typography.secondary,
    lineHeight: 19,
    marginTop: 3,
  },
  icon: {
    width: 46,
    height: 46,
    flexShrink: 0,
    borderRadius: radius.medium,
    backgroundColor: glass.surfaceSoft,
    borderWidth: 1,
    borderColor: glass.tintedBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  close: {
    width: layout.touch,
    height: layout.touch,
    minHeight: layout.touch,
    flexShrink: 0,
    borderRadius: radius.large,
    backgroundColor: glass.surface,
    borderWidth: 1,
    borderColor: palette.border,
    alignItems: "center",
  },
  back: {
    width: layout.touch,
    height: layout.touch,
    minHeight: layout.touch,
    flexShrink: 0,
    alignItems: "center",
    borderRadius: radius.large,
    backgroundColor: glass.surfaceSoft,
    borderWidth: 1,
    borderColor: glass.tintedBorder,
  },
  scroll: { flexShrink: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 20 },
  fill: { flex: 1, minHeight: 0 },
  footer: {
    borderTopWidth: 1,
    borderTopColor: palette.border,
    paddingTop: 14,
    paddingHorizontal: 20,
    gap: 10,
  },
});
