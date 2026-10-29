import { Image, Text, View } from "react-native";
import { colors } from "../../constants/theme";
import Ionicons from "../icons/Ionicon";
import { TouchFeedback } from "../TouchFeedback";
import type { Place } from "../../constants/places";
import { categoryForPlace } from "../../constants/placeCategories";
import { styles } from "./placeStyles";
import { useState } from "react";
import { placePhotoSource, photoLicenseUrl, optimizedPlacePhoto } from "../../constants/placePhotos";
export function PlaceMedia({
  place,
  photoWidth,
  onOpen,
}: {
  place: Place;
  photoWidth: number;
  onOpen: (url: string) => void;
}) {
  const [photoFailed, setPhotoFailed] = useState(false);
  const category = categoryForPlace(place),
    photoSource = placePhotoSource(place, photoFailed),
    licenseUrl = photoLicenseUrl(place.photoLicense);
  return (
    <>
      {photoSource ? (
        <Image
          accessibilityLabel={`Foto de ${place.name}`}
          source={photoSource}
          onError={() => setPhotoFailed(true)}
          style={[
            styles.photo,
            {
              width: photoWidth,
              height: Math.min(160, photoWidth * 0.6),
            },
          ]}
        />
      ) : (
        <View style={styles.placeholder}>
          <Ionicons name={category.icon} size={28} color={colors.icon} />
          <Text style={styles.photoText}>Ainda sem foto deste lugar</Text>
        </View>
      )}
      {photoSource && place.photoAuthor && (
        <View style={{ marginTop: 5 }}>
          <Text style={styles.note}>
            Foto: {place.photoAuthor}
            {place.photoDate ? ` · ${place.photoDate}` : ""}. A foto pode não
            representar a aparência atual.
            {optimizedPlacePhoto(place) ? " Imagem redimensionada e comprimida." : ""}
          </Text>
          <View style={{ flexDirection: "row", gap: 12, flexWrap: "wrap" }}>
            {place.photoSource && (
              <TouchFeedback
                role="link"
                label="Ver fonte da foto"
                onPress={() => onOpen(place.photoSource!)}
              >
                <Text style={styles.link}>Fonte da foto ↗</Text>
              </TouchFeedback>
            )}
            {licenseUrl && (
              <TouchFeedback
                role="link"
                label={`Ver licença ${place.photoLicense}`}
                onPress={() => onOpen(licenseUrl)}
              >
                <Text style={styles.note}>{place.photoLicense} ↗</Text>
              </TouchFeedback>
            )}
          </View>
        </View>
      )}
    </>
  );
}
