import { ListSkeleton } from "./ListSkeleton";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { palette, typography } from "../../constants/theme";
import { Logo } from "../Logo";
import { CityPulse } from "./CityPulse";

export function LoadingState({
  title = "Conectando sua cidade",
  message = "Lugares, histórias e conexões perto de você.",
  fullScreen = false,
  active = true,
  skeleton = "cards",
}: {
  title?: string;
  message?: string;
  fullScreen?: boolean;
  active?: boolean;
  skeleton?: "cards" | "places" | "notifications";
}) {
  const content = (
    <View style={styles.content}>
      {fullScreen && (
        <View
          style={styles.logo}
          accessible={false}
          importantForAccessibility="no-hide-descendants"
        >
          <Logo width={112} />
        </View>
      )}
      {fullScreen ? (
        <CityPulse active={active} />
      ) : (
        <ListSkeleton variant={skeleton} />
      )}
      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={title}
        accessibilityState={{ busy: true }}
        accessibilityLiveRegion="polite"
        style={styles.copy}
      >
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
      </View>
      {!fullScreen && <CityPulse compact active={active} />}
      {fullScreen && (
        <Text style={styles.signature}>A cidade é de todas nós.</Text>
      )}
    </View>
  );
  return fullScreen ? (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.screenContent}
    >
      {content}
    </ScrollView>
  ) : (
    content
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.surfaceTint },
  screenContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 48,
  },
  content: {
    alignItems: "center",
    alignSelf: "center",
    width: "100%",
    maxWidth: 400,
    paddingVertical: 16,
    gap: 14,
  },
  logo: { marginBottom: 4 },
  copy: { width: "100%", paddingHorizontal: 16, gap: 8 },
  title: {
    color: palette.text,
    fontSize: typography.page,
    fontWeight: "700",
    textAlign: "center",
  },
  message: {
    color: palette.muted,
    fontSize: typography.body,
    lineHeight: 22,
    textAlign: "center",
  },
  signature: {
    color: palette.wine,
    fontSize: typography.caption,
    marginTop: 22,
    textAlign: "center",
    letterSpacing: 0.4,
  },
});
