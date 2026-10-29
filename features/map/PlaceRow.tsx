import { colors, palette, typography } from "../../constants/theme";
import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import Ionicons from "../../components/icons/Ionicon";
import { Place } from "../../constants/places";
import { categoryForPlace } from "../../constants/placeCategories";

import { TouchFeedback } from "../../components/TouchFeedback";
export const PlaceRow = memo(function PlaceRow({
  place,
  onPress,
}: {
  place: Place;
  onPress: () => void;
}) {
  const category = categoryForPlace(place);
  return (
    <TouchFeedback
      label={`Ver ${place.name}`}
      onPress={onPress}
      style={styles.row}
    >
      <Ionicons name={category.icon} size={21} color={category.color} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.name}>{place.name}</Text>
        <Text style={styles.address}>
          {category.singular} · {place.address}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.pink} />
    </TouchFeedback>
  );
});
const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 54,
    padding: 12,
  },
  name: { color: colors.wine, fontSize: typography.body, fontWeight: "600" },
  address: {
    color: palette.muted,
    fontSize: typography.caption,
    lineHeight: 18,
    marginTop: 3,
  },
});
