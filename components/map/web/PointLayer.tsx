import { memo } from "react";
import { Pressable } from "react-native";
import type { MapPoint } from "../../../constants/placeCategories";
import { project } from "../../../features/map/web/geometry";
import { PlaceMarker } from "../PlaceMarker";
export const PointLayer = memo(function PointLayer({
  points,
  origin,
  zoom,
  selectedId,
  onSelect,
}: {
  points: MapPoint[];
  origin: { x: number; y: number };
  zoom: number;
  selectedId?: string;
  onSelect: (point: MapPoint) => void;
}) {
  return (
    <>
      {points.map((point) => {
        const pixel = project(point.latitude, point.longitude, zoom);
        const active =
          point.places.length === 1 && selectedId === point.places[0].id;
        return (
          <Pressable
            key={point.id}
            accessibilityRole="button"
            accessibilityLabel={
              point.places.length > 1
                ? `Ampliar grupo de ${point.places.length} lugares`
                : `Ver detalhes de ${point.places[0].name}. ${point.places[0].reviewsUnavailable ? "Avaliações indisponíveis" : `${point.places[0].reviewSummary?.total ?? 0} avaliações aprovadas`}`
            }
            accessibilityState={{ selected: active }}
            onPress={() => onSelect(point)}
            style={{
              position: "absolute",
              width: 48,
              height: 54,
              alignItems: "center",
              justifyContent: "flex-end",
              left: pixel.x - origin.x - 24,
              top: pixel.y - origin.y - 54,
              zIndex: active ? 3 : point.places.length > 1 ? 2 : 1,
            }}
          >
            <PlaceMarker point={point} selected={active} />
          </Pressable>
        );
      })}
    </>
  );
});
