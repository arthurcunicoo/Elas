import { fonts, glass, glassShadow, palette, radius, pageContent, typography } from "../../constants/theme";
import { type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { IconButton } from "./Buttons";
export function PageHeader({
  title,
  onBack,
  children,
}: {
  title: string;
  onBack?: () => void;
  children?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
      <View style={styles.content}>
        <View style={styles.row}>
          {onBack && (
            <IconButton
              label="Voltar"
              icon="chevron-back"
              onPress={onBack}
              inverse
            />
          )}
          <Text accessibilityRole="header" style={styles.title}>
            {title}
          </Text>
        </View>
        {children}
      </View>
    </View>
  );
}
export const AppHeader = PageHeader;
const styles = StyleSheet.create({
  header: {
    paddingBottom: 14,
    backgroundColor: glass.brand,
    borderBottomLeftRadius: radius.large,
    borderBottomRightRadius: radius.large,
    borderBottomWidth: 1,
    borderBottomColor: glass.pillBorder,
    ...glassShadow,
  },
  content: pageContent,
  row: { flexDirection: "row", alignItems: "center", minHeight: 40, gap: 10 },
  title: {
    fontFamily: fonts.display,
    fontSize: typography.page,
    lineHeight: 28,
    fontWeight: "800",
    letterSpacing: -0.4,
    color: palette.surface,
    flex: 1,
    minWidth: 0,
  },
});
