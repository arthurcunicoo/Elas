import { Text, View } from "react-native";
import { colors } from "../../constants/theme";
import Ionicons from "../icons/Ionicon";
import { TouchFeedback } from "../TouchFeedback";
import type { Place } from "../../constants/places";
import { categoryForPlace } from "../../constants/placeCategories";
import { styles } from "./placeStyles";
import { communityPresentation } from "../../constants/community";
export function PlaceHeader({
  place,
  expanded,
  onToggle,
}: {
  place: Place;
  expanded: boolean;
  onToggle?: () => void;
}) {
  const category = categoryForPlace(place),
    perception = communityPresentation(place),
    statusColor = perception.color;
  return (
    <TouchFeedback
      label={`${expanded ? "Recolher" : "Ver"} detalhes de ${place.name}`}
      onPress={() => onToggle?.()}
      style={styles.heading}
      pressedScale={0.99}
    >
      <View>
        <View style={styles.category}>
          <View
            style={[styles.categoryIcon, { backgroundColor: category.tint }]}
          >
            <Ionicons name={category.icon} size={16} color={category.color} />
          </View>
          <Text style={styles.categoryText}>{category.singular}</Text>
          <View style={styles.expandBadge}>
            <Ionicons
              name={expanded ? "chevron-down" : "chevron-up"}
              color={colors.pink}
              size={16}
            />
          </View>
        </View>
        <Text style={styles.name} numberOfLines={expanded ? undefined : 2}>
          {place.name}
        </Text>
        <Text style={styles.address} numberOfLines={expanded ? undefined : 1}>
          {place.address}
        </Text>
        <View style={styles.status}>
          <Ionicons
            name={
              place.status === "unknown"
                ? "information-circle-outline"
                : place.status === "safe"
                  ? "shield-checkmark-outline"
                  : "alert-circle-outline"
            }
            size={17}
            color={statusColor}
          />
          <Text style={[styles.statusText, { color: statusColor }]}>
            {perception.label}
          </Text>
        </View>
      </View>
    </TouchFeedback>
  );
}
