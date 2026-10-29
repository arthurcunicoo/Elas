import type { ImageSourcePropType } from "react-native";
import type { Place } from "./places";
// Optimized local derivatives of licensed originals; exact URL matches preserve attribution.
const originals: readonly { url: string; source: ImageSourcePropType }[] = [
  {
    url: "https://upload.wikimedia.org/wikipedia/commons/7/7d/Pra%C3%A7a_do_Congresso.jpg",
    source: require("../assets/places/congresso.jpg"),
  },
  {
    url: "https://upload.wikimedia.org/wikipedia/commons/9/93/Pra%C3%A7a_Nereu_Ramos1.JPG",
    source: require("../assets/places/nereu.jpg"),
  },
  {
    url: "https://upload.wikimedia.org/wikipedia/commons/d/d8/Parque_das_Na%C3%A7%C3%B5es_Crici%C3%BAma.jpg",
    source: require("../assets/places/nacoes.jpg"),
  },
];
export function placePhotoSource(
  place: Place,
  remoteFailed: boolean,
): ImageSourcePropType | undefined {
  if (!place.photoUrl) return undefined;
  return (
    originals.find((item) => item.url === place.photoUrl)?.source ??
    (remoteFailed ? undefined : { uri: place.photoUrl })
  );
}
export function optimizedPlacePhoto(place: Place) {
  return originals.some((item) => item.url === place.photoUrl);
}
export function photoLicenseUrl(license?: string) {
  return license === "CC BY-SA 4.0"
    ? "https://creativecommons.org/licenses/by-sa/4.0/"
    : license === "CC BY-SA 3.0"
      ? "https://creativecommons.org/licenses/by-sa/3.0/"
      : undefined;
}
