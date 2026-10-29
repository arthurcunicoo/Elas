import { FlatList, Text, View } from "react-native";
import Ionicons from "../../components/icons/Ionicon";
import { TouchFeedback } from "../../components/TouchFeedback";
import { colors } from "../../constants/theme";
import { styles } from "./mapStyles";
import type { Place } from "../../constants/places";
import type { usePlaceSearch } from "./usePlaceSearch";
import { PlaceRow } from "./PlaceRow";
export function MapResults({
  panelTop,
  areaHeight,
  groupPlaces,
  scope,
  results,
  imported,
  onChoose,
  onClose,
}: {
  panelTop: number;
  areaHeight: number;
  groupPlaces: Place[] | null;
  scope: "area" | "catalog";
  results: Place[];
  imported: ReturnType<typeof usePlaceSearch>;
  onChoose: (place: Place) => void;
  onClose: () => void;
}) {
  return (
    <View
      style={[
        styles.results,
        {
          top: panelTop,
          maxHeight: Math.max(100, areaHeight - panelTop - 20),
        },
      ]}
    >
      <View style={styles.listHeading}>
        <Text style={styles.empty}>
          {groupPlaces
            ? "Lugares neste ponto"
            : scope === "area"
              ? "Resultados na área visível"
              : "Lugares cadastrados"}
        </Text>
        <TouchFeedback
          label="Fechar lista"
          onPress={onClose}
          style={{ width: 48, alignItems: "center", flexShrink: 0 }}
        >
          <Ionicons name="close" size={22} color={colors.pink} />
        </TouchFeedback>
      </View>
      <FlatList
        data={groupPlaces ?? results}
        keyboardShouldPersistTaps="always"
        keyExtractor={(p) => p.id}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={5}
        renderItem={({ item }) => (
          <PlaceRow place={item} onPress={() => onChoose(item)} />
        )}
        onEndReached={
          scope === "catalog" && !groupPlaces ? imported.more : undefined
        }
        ListEmptyComponent={
          <Text style={styles.empty}>
            {imported.loading
              ? "Buscando…"
              : imported.error || "Nenhum lugar encontrado neste filtro."}
          </Text>
        }
        ListFooterComponent={
          scope === "catalog" && !groupPlaces && imported.hasMore ? (
            <TouchFeedback
              label="Carregar mais lugares"
              disabled={imported.loading}
              onPress={imported.more}
            >
              <Text style={styles.resultText}>Carregar mais</Text>
            </TouchFeedback>
          ) : null
        }
      />
    </View>
  );
}
