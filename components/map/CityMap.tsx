import { project, unproject } from "../../features/map/web/geometry";
import { webTileProvider } from "../../features/map/web/tileProvider";
import { WebMapTiles } from "./web/WebMapTiles";
import { WebMapControls } from "./web/WebMapControls";
import { PointLayer } from "./web/PointLayer";
import { useWebMapDrag } from "../../features/map/web/useWebMapDrag";
import { ReportMarker } from "./ReportMarker";
import { nodesWithSelection, reportClusterRegion, reportNodeLabel } from "../../features/map/reportClusters";
import { palette, mapCanvas, typography } from "../../constants/theme";
import { visibleMapPlaces } from "../../constants/placeRelevance";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { CityMapProps } from "./CityMap.types";
import { groupMapPoints, type MapPoint } from "../../constants/placeCategories";
import { MapAttribution } from "./MapAttribution";
import { focusPixelOffset } from "../../features/map/viewport";
// Web viewport has pan/zoom controls; native uses react-native-maps gestures.
function CityMap({
  places,
  categoryFiltered,
  selected,
  onSelect,
  onSelectGroup,
  onClear,
  reportNodes = [],
  areaName,
  onOpenReportGroup,
  selectedReport,
  onSelectReport,
  userLocation,
  locationEnabled,
  onRegionChange,
  region,
  bottomInset,
  topInset,
  locationRequest,
  onLoadStateChange,
}: CityMapProps) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [failed, setFailed] = useState(false);
  const maxZoom = webTileProvider?.maxZoom ?? 19;
  const [viewport, setViewport] = useState({
    latitude: region.latitude,
    longitude: region.longitude,
  });
  const moveViewport = useCallback(
    (next: { latitude: number; longitude: number }) => {
      setViewport((previous) =>
        Math.abs(previous.latitude - next.latitude) <= 1e-8 &&
        Math.abs(previous.longitude - next.longitude) <= 1e-8
          ? previous
          : next,
      );
    },
    [],
  );
  const [zoom, setZoom] = useState(() =>
    Math.max(
      10,
      Math.min(
        maxZoom,
        Math.round(Math.log2((360 * 390) / (256 * region.longitudeDelta))),
      ),
    ),
  );
  const [dragging, setDragging] = useState(false);
  const lastSelected = useRef<string | null>(null);
  const center = project(viewport.latitude, viewport.longitude, zoom);
  const left = Math.round(center.x - size.width / 2),
    top = Math.round(center.y - size.height / 2);
  useEffect(() => {
    if (!selected) {
      lastSelected.current = null;
      return;
    }
    if (!size.height) return;
    const key = `${selected.id}:${selected.latitude}:${selected.longitude}:${size.height}:${topInset}:${bottomInset}:${zoom}`;
    if (lastSelected.current === key) return;
    lastSelected.current = key;
    const point = project(selected.latitude, selected.longitude, zoom);
    moveViewport(
      unproject(
        point.x,
        point.y + focusPixelOffset(size.height, topInset, bottomInset),
        zoom,
      ),
    );
  }, [selected, size.height, topInset, bottomInset, zoom, moveViewport]);
  useEffect(() => {
    if (selectedReport?.latitude != null && selectedReport.longitude != null) {
      const point = project(
        selectedReport.latitude,
        selectedReport.longitude,
        zoom,
      );
      moveViewport(
        unproject(
          point.x,
          point.y + focusPixelOffset(size.height, topInset, bottomInset),
          zoom,
        ),
      );
    }
  }, [
    selectedReport?.id,
    selectedReport?.latitude,
    selectedReport?.longitude,
    size.height,
    topInset,
    bottomInset,
    zoom,
    moveViewport,
  ]);
  const located = useRef(-1);
  useEffect(() => {
    if (
      locationEnabled &&
      userLocation &&
      located.current !== locationRequest
    ) {
      located.current = locationRequest;
      setViewport(userLocation);
    }
  }, [locationEnabled, locationRequest, userLocation]);
  useEffect(() => {
    if (!size.width || !size.height || dragging) return;
    const nw = unproject(left, top, zoom),
      se = unproject(left + size.width, top + size.height, zoom);
    onRegionChange({
      ...viewport,
      latitudeDelta: nw.latitude - se.latitude,
      longitudeDelta: se.longitude - nw.longitude,
    });
  }, [
    viewport,
    zoom,
    size.width,
    size.height,
    onRegionChange,
    left,
    top,
    dragging,
  ]);
  const points = useMemo(
    () =>
      groupMapPoints(
        visibleMapPlaces(places, region, size, selected?.id, categoryFiltered),
        region,
        size,
        selected?.id,
      ),
    [places, region, size, selected?.id, categoryFiltered],
  );
  const origin = useMemo(
    () => project(region.latitude, region.longitude, zoom),
    [region.latitude, region.longitude, zoom],
  );
  const visibleReportNodes = useMemo(
    () => nodesWithSelection(reportNodes, selectedReport),
    [reportNodes, selectedReport],
  );
  const hasOverture = useMemo(
    () =>
      places.some(
        (p) => p.source === "overture" || p.dataSource?.startsWith("Overture"),
      ),
    [places],
  );
  function pan(dx: number, dy: number) {
    onClear();
    moveViewport(
      unproject(
        center.x + dx * size.width * 0.35,
        center.y + dy * size.height * 0.35,
        zoom,
      ),
    );
    setFailed(false);
  }
  function changeZoom(delta: number) {
    setZoom((z) => Math.max(10, Math.min(maxZoom, z + delta)));
    setFailed(false);
  }
  const selectPoint = useCallback(
    (point: MapPoint) => {
      if (point.places.length === 1) {
        onSelect(point.places[0]);
        return;
      }
      if (zoom >= maxZoom) {
        onSelectGroup(point.places);
        return;
      }
      onClear();
      setViewport({ latitude: point.latitude, longitude: point.longitude });
      setZoom((z) => Math.min(maxZoom, z + 1));
    },
    [onSelect, onSelectGroup, onClear, zoom, maxZoom],
  );
  const drag = useWebMapDrag(center, zoom, onClear, setViewport, setDragging);
  return (
    <View
      {...drag.panHandlers}
      style={styles.root}
      onLayout={({ nativeEvent: { layout } }) =>
        setSize((current) =>
          current.width === layout.width && current.height === layout.height
            ? current
            : { width: layout.width, height: layout.height },
        )
      }
    >
      <Pressable
        accessibilityLabel="Fechar detalhes do local"
        onPress={onClear}
        style={StyleSheet.absoluteFill}
      />
      <View
        pointerEvents="box-none"
        style={StyleSheet.absoluteFill}
        accessibilityLabel={`Mapa de ${areaName}`}
      >
        <WebMapTiles
          left={left}
          top={top}
          width={size.width}
          height={size.height}
          zoom={zoom}
          provider={webTileProvider}
          onLoadStateChange={onLoadStateChange}
          onFailure={setFailed}
        />
        <View
          pointerEvents="box-none"
          style={[
            StyleSheet.absoluteFill,
            {
              transform: [
                { translateX: origin.x - left },
                { translateY: origin.y - top },
              ],
            },
          ]}
        >
          <PointLayer
            points={points}
            origin={origin}
            zoom={zoom}
            selectedId={selected?.id}
            onSelect={selectPoint}
          />
        </View>
        {!!size.width &&
          visibleReportNodes.map((node) => {
            const point = project(node.latitude, node.longitude, zoom);
            return (
              <Pressable
                key={node.id}
                accessibilityRole="button"
                accessibilityLabel={reportNodeLabel(
                  node,
                  zoom < maxZoom && !!reportClusterRegion(node, region),
                )}
                onPress={() => {
                  if (node.report) {
                    onSelectReport(node.report);
                    return;
                  }
                  const next = reportClusterRegion(node, region);
                  if (!next || zoom >= maxZoom) {
                    onOpenReportGroup(node);
                    return;
                  }
                  onClear();
                  setViewport({
                    latitude: node.latitude,
                    longitude: node.longitude,
                  });
                  setZoom((z) => Math.min(maxZoom, z + 1));
                }}
                style={{
                  position: "absolute",
                  minWidth: 44,
                  height: 54,
                  alignItems: "center",
                  justifyContent: "flex-end",
                  left: point.x - left - 37,
                  top: point.y - top - 54,
                  width: 74,
                }}
              >
                <ReportMarker
                  node={node}
                  selected={
                    !!node.report && node.report.id === selectedReport?.id
                  }
                />
              </Pressable>
            );
          })}
        {locationEnabled &&
          userLocation &&
          (() => {
            const p = project(
              userLocation.latitude,
              userLocation.longitude,
              zoom,
            );
            return (
              <View
                pointerEvents="none"
                style={{
                  position: "absolute",
                  left: p.x - left - 9,
                  top: p.y - top - 9,
                  width: 18,
                  height: 18,
                  borderRadius: 9,
                  backgroundColor: palette.info,
                  borderWidth: 3,
                  borderColor: "white",
                }}
              />
            );
          })()}
      </View>
      {size.height - bottomInset - topInset > 180 && (
        <WebMapControls
          top={topInset + 10}
          zoom={zoom}
          maxZoom={maxZoom}
          changeZoom={changeZoom}
          pan={pan}
        />
      )}
      {(failed || !webTileProvider) && (
        <Text style={styles.error}>
          {webTileProvider
            ? "Não foi possível carregar parte do mapa. Confira sua conexão."
            : "O mapa está temporariamente indisponível. Os lugares continuam acessíveis pela busca."}
        </Text>
      )}
      <MapAttribution
        bottom={bottomInset + 7}
        overture={hasOverture}
        web
        tileProvider={webTileProvider ?? undefined}
      />
    </View>
  );
}
export default memo(CityMap);
const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
    backgroundColor: mapCanvas.land,
  },
  error: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 220,
    backgroundColor: palette.surfaceTint,
    color: palette.wine,
    fontSize: typography.caption,
    padding: 10,
    borderRadius: 8,
  },
});
