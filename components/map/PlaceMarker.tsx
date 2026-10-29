import { colors, palette, typography } from "../../constants/theme";
import { communityPresentation } from "../../constants/community";
import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import Ionicons from "../icons/Ionicon";
import { categoryForPlace, MapPoint } from "../../constants/placeCategories";

export const PlaceMarker = memo(function PlaceMarker({
  point,
  selected,
}: {
  point: MapPoint;
  selected: boolean;
}) {
  const group = point.places.length > 1,
    category = categoryForPlace(point.places[0]);
  const place = point.places[0],
    summary = place.reviewSummary;
  const reviewColor = communityPresentation(place).color;
  return (
    <View style={styles.root} accessible={false}>
      <Ionicons
        style={styles.pin}
        name="location"
        size={selected ? 48 : 44}
        color={
          selected ? colors.pink : group ? colors.achievement : category.color
        }
      />
      <View style={[styles.symbol, selected && styles.selectedSymbol]}>
        {group ? (
          <Text style={styles.count}>{point.places.length}</Text>
        ) : (
          <Ionicons
            name={category.icon}
            size={15}
            color={selected ? colors.pink : category.color}
          />
        )}
      </View>
      {!group && !!summary?.total && (
        <View style={[styles.reviewBadge, { borderColor: reviewColor }]}>
          <Text style={[styles.reviewCount, { color: reviewColor }]}>
            {summary.total > 99 ? "99+" : summary.total}
          </Text>
        </View>
      )}
    </View>
  );
});
const styles = StyleSheet.create({
  root: {
    width: 48,
    height: 54,
    alignItems: "center",
    justifyContent: "flex-end",
    flexShrink: 0,
  },
  pin: { alignSelf: "center" },
  selectedSymbol: { top: 14 },
  symbol: {
    position: "absolute",
    top: 16,
    left: 14,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
  },
  reviewBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    minWidth: 20,
    maxWidth: 32,
    height: 19,
    paddingHorizontal: 3,
    backgroundColor: "white",
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  reviewCount: {
    fontSize: typography.caption,
    lineHeight: 15,
    fontWeight: "700",
  },
  count: {
    fontSize: typography.caption,
    fontWeight: "700",
    color: palette.accent,
  },
});
