import type { TileProvider } from "../../features/map/web/tileProvider";
import { glass, palette, radius, typography } from "../../constants/theme";
import { Linking, StyleSheet, Text, View } from "react-native";
export function MapAttribution({
  bottom,
  overture,
  web = false,
  tileProvider,
}: {
  bottom: number;
  overture: boolean;
  web?: boolean;
  tileProvider?: TileProvider;
}) {
  return (
    <View style={[styles.root, { bottom }]}>
      <Text
        accessibilityRole="link"
        onPress={() =>
          void Linking.openURL("https://www.openstreetmap.org/copyright")
        }
        style={styles.text}
      >
        {web ? "Mapa" : "Locais"} © OpenStreetMap contributors
      </Text>
      {web && tileProvider && !tileProvider.pilot && (
        <Text
          accessibilityRole="link"
          onPress={() => void Linking.openURL(tileProvider.attributionUrl)}
          style={styles.text}
        >
          {" · "}
          {tileProvider.attribution}
        </Text>
      )}
      {overture && (
        <Text
          accessibilityRole="link"
          onPress={() =>
            void Linking.openURL("https://docs.overturemaps.org/guides/places/")
          }
          style={styles.text}
        >
          {" "}
          · Overture Maps
        </Text>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  root: {
    position: "absolute",
    right: 8,
    flexDirection: "row",
    flexWrap: "wrap",
    backgroundColor: glass.surfaceStrong,
    borderWidth: 1,
    borderColor: glass.border,
    borderRadius: radius.small,
    paddingHorizontal: 6,
    paddingVertical: 4,
    maxWidth: "95%",
  },
  text: { fontSize: typography.caption, color: palette.muted },
});
