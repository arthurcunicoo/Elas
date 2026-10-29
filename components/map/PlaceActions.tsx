import { Text, View } from "react-native";
import { colors, palette } from "../../constants/theme";
import Ionicons from "../icons/Ionicon";
import { TouchFeedback } from "../TouchFeedback";
import type { Place } from "../../constants/places";

import { styles } from "./placeStyles";
import { router } from "expo-router";
import { FavoriteButton } from "../../features/profile/FavoriteButton";
export function PlaceActions({
  place,
  onOpen,
}: {
  place: Place;
  onOpen: (url: string) => void;
}) {
  return (
    <>
      <View style={styles.actionRow}>
        <View style={{ flex: 1 }}>
          <FavoriteButton placeId={place.id} />
        </View>
        <TouchFeedback
          role="link"
          label="Como chegar"
          onPress={() =>
            onOpen(
              `https://www.google.com/maps/dir/?api=1&destination=${place.latitude},${place.longitude}&travelmode=walking`,
            )
          }
          style={styles.direction}
        >
          <Ionicons name="navigate-outline" color={colors.pink} size={18} />
          <Text style={styles.link}>Como chegar</Text>
        </TouchFeedback>
      </View>
      <TouchFeedback
        label="Solicitar melhoria aqui"
        onPress={() =>
          router.push({
            pathname: "/impactos",
            params: { placeId: place.id },
          })
        }
        style={styles.option}
      >
        <Ionicons name="construct-outline" color={colors.pink} size={18} />
        <Text style={styles.optionText}>Solicitar melhoria aqui</Text>
        <Ionicons name="chevron-forward" color={palette.muted} size={17} />
      </TouchFeedback>
      <TouchFeedback
        label="Informar dados incorretos"
        onPress={() =>
          router.push({
            pathname: "/novo-relato",
            params: { placeId: place.id, correction: "1" },
          })
        }
        style={styles.option}
      >
        <Ionicons name="flag-outline" color={colors.pink} size={18} />
        <Text style={styles.optionText}>Informar dados incorretos</Text>
        <Ionicons name="chevron-forward" color={palette.muted} size={17} />
      </TouchFeedback>
    </>
  );
}
