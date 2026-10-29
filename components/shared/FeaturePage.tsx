import { colors, formLayout } from "../../constants/theme";
import { type ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PageHeader } from "./PageHeader";
// Compatibility for existing routes; new form consumers can import FormControls directly.
export { Field, Action, Message, shared } from "./FormControls";
export function FeaturePage({
  title,
  children,
  scroll = true,
}: {
  title: string;
  children: ReactNode;
  scroll?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const content = (
    <View
      style={[
        styles.content,
        { paddingBottom: insets.bottom + 24 },
        !scroll && styles.fill,
      ]}
    >
      {children}
    </View>
  );
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.root}
    >
      <StatusBar style="light" />
      <PageHeader
        title={title}
        onBack={() =>
          router.canGoBack() ? router.back() : router.replace("/perfil")
        }
      />
      {scroll ? (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </KeyboardAvoidingView>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  fill: { flex: 1 },
  content: {
    width: "100%",
    maxWidth: formLayout.pageMax,
    alignSelf: "center",
    padding: formLayout.padding,
    gap: formLayout.gap,
  },
});
