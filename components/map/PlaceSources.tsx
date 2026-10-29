import { Text } from "react-native";

import { TouchFeedback } from "../TouchFeedback";
import type { Place } from "../../constants/places";

import { styles } from "./placeStyles";
export function PlaceSources({
  place,
  onOpen,
}: {
  place: Place;
  onOpen: (url: string) => void;
}) {
  const source =
    place.source === "osm" &&
    /^(node|way|relation)\/[1-9][0-9]*$/.test(place.externalRef ?? "");
  return (
    <>
      {place.updatedAt && (
        <Text style={styles.note}>
          Cadastro atualizado em{" "}
          {new Date(place.updatedAt).toLocaleDateString("pt-BR")}
        </Text>
      )}
      {source && (
        <TouchFeedback
          role="link"
          label="Ver origem no OpenStreetMap"
          onPress={() =>
            onOpen(`https://www.openstreetmap.org/${place.externalRef}`)
          }
        >
          <Text style={styles.note}>Cadastro do OpenStreetMap ↗</Text>
        </TouchFeedback>
      )}
      {(place.source === "overture" ||
        place.dataSource?.startsWith("Overture")) && (
        <TouchFeedback
          role="link"
          label="Ver fonte do catálogo Overture"
          onPress={() => onOpen("https://docs.overturemaps.org/guides/places/")}
        >
          <Text style={styles.note}>
            {place.dataSource || "Cadastro do Overture Maps"} ↗
          </Text>
        </TouchFeedback>
      )}
      {!!place.verifiedAt &&
        !!place.dataSource &&
        /^https:\/\//.test(place.dataSource) && (
          <TouchFeedback
            role="link"
            label="Ver fonte dos dados conferidos"
            onPress={() => onOpen(place.dataSource!)}
          >
            <Text style={styles.note}>
              Dados conferidos na fonte em{" "}
              {new Date(place.verifiedAt).toLocaleDateString("pt-BR")} ↗
            </Text>
          </TouchFeedback>
        )}
    </>
  );
}
