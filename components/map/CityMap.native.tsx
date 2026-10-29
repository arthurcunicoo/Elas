import { palette } from "../../constants/theme";
import { communityPresentation } from "../../constants/community";
import { visibleMapPlaces } from "../../constants/placeRelevance";
import { ComponentRef, memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { ReportMarker } from "./ReportMarker";
import type { ReportMapNode } from "../../services/reports";
import { nodesWithSelection, reportClusterRegion, reportNodeLabel } from "../../features/map/reportClusters";
import { groupMapPoints, MapPoint } from "../../constants/placeCategories";
import { PlaceMarker } from "./PlaceMarker";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import { CityMapProps } from "./CityMap.types";
import { MapAttribution } from "./MapAttribution";
const PointPin = memo(function PointPin({
  point,
  selected,
  onSelect,
  reduced,
}: {
  point: MapPoint;
  selected: boolean;
  onSelect: (point: MapPoint) => void;
  reduced: boolean;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const marker = useRef<ComponentRef<typeof Marker>>(null);
  const [tracking, setTracking] = useState(true);
  const visualCategory =
    point.places[0].appCategory ?? point.places[0].category;
  const visualReviews = `${point.places[0].status}:${point.places[0].reviewSummary?.total ?? 0}`;
  useEffect(() => {
    setTracking(true);
    const timer = setTimeout(() => setTracking(false), 350);
    const motion = Animated.timing(scale, {
      toValue: selected ? 1.06 : 1,
      duration: reduced ? 0 : 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    motion.start(() => marker.current?.redraw());
    return () => {
      clearTimeout(timer);
      motion.stop();
    };
  }, [
    selected,
    reduced,
    scale,
    point.places.length,
    visualCategory,
    visualReviews,
  ]);
  return (
    <Marker
      ref={marker}
      coordinate={{ latitude: point.latitude, longitude: point.longitude }}
      anchor={{ x: 0.5, y: 1 }}
      tracksViewChanges={tracking}
      zIndex={selected ? 10 : point.places.length > 1 ? 2 : 1}
      onPress={(event) => {
        event.stopPropagation();
        onSelect(point);
      }}
      accessibilityLabel={
        point.places.length > 1
          ? `Ampliar grupo de ${point.places.length} lugares`
          : `${point.places[0].name}. ${point.places[0].reviewsUnavailable ? "Avaliações indisponíveis" : `${point.places[0].reviewSummary?.total ?? 0} avaliações aprovadas`}. ${communityPresentation(point.places[0]).label}`
      }
    >
      <Animated.View
        style={{
          width: 58,
          height: 62,
          alignItems: "center",
          justifyContent: "flex-end",
          transform: [{ scale }],
        }}
      >
        <PlaceMarker point={point} selected={selected} />
      </Animated.View>
    </Marker>
  );
});
const ReportPin = memo(function ReportPin({
  node,
  selected,
  onSelect,
  canZoom,
}: {
  node: ReportMapNode;
  selected: boolean;
  onSelect: () => void;
  canZoom: boolean;
}) {
  const marker = useRef<ComponentRef<typeof Marker>>(null),
    [tracking, setTracking] = useState(true);
  useEffect(() => {
    setTracking(true);
    const timer = setTimeout(() => {
      marker.current?.redraw();
      setTracking(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [node.count, node.report?.status, selected]);
  return (
    <Marker
      ref={marker}
      coordinate={{ latitude: node.latitude, longitude: node.longitude }}
      anchor={{ x: 0.5, y: 1 }}
      zIndex={selected ? 12 : 3}
      tracksViewChanges={tracking}
      onPress={(event) => {
        event.stopPropagation();
        onSelect();
      }}
      accessibilityLabel={reportNodeLabel(node, canZoom)}
    >
      <View
        style={{
          width: 74,
          height: 54,
          alignItems: "center",
          justifyContent: "flex-end",
        }}
      >
        <ReportMarker node={node} selected={selected} />
      </View>
    </Marker>
  );
});
export default function CityMap({
  places,
  categoryFiltered,
  selected,
  onSelect,
  onSelectGroup,
  onClear,
  reportNodes = [],
  homeRegion,
  onOpenReportGroup,
  selectedReport,
  onSelectReport,
  locationEnabled,
  userLocation,
  onRegionChange,
  region,
  bottomInset,
  topInset,
  locationRequest,
  onLoadStateChange,
}: CityMapProps) {
  const map = useRef<MapView>(null),
    located = useRef(-1);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const reduced = useReducedMotion();
  const lastSelected = useRef<string | null>(null);
  const latestRegion = useRef(region);
  latestRegion.current = region;
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
  useEffect(() => {
    if (!selected) {
      lastSelected.current = null;
      return;
    }
    const key = `${selected.id}:${selected.latitude}:${selected.longitude}:${topInset}:${bottomInset}`;
    if (lastSelected.current === key) return;
    lastSelected.current = key;
    if (selected)
      map.current?.animateToRegion(
        {
          ...region,
          latitude: selected.latitude,
          longitude: selected.longitude,
        },
        reduced ? 0 : 350,
      );
  }, [selected, region, reduced, topInset, bottomInset]);
  useEffect(() => {
    if (selectedReport?.latitude != null && selectedReport.longitude != null)
      map.current?.animateToRegion(
        {
          ...latestRegion.current,
          latitude: selectedReport.latitude,
          longitude: selectedReport.longitude,
        },
        reduced ? 0 : 350,
      );
  }, [
    selectedReport?.id,
    selectedReport?.latitude,
    selectedReport?.longitude,
    reduced,
    topInset,
    bottomInset,
  ]);
  useEffect(() => {
    if (
      locationEnabled &&
      userLocation &&
      located.current !== locationRequest
    ) {
      located.current = locationRequest;
      map.current?.animateToRegion(
        { ...(homeRegion ?? latestRegion.current), ...userLocation },
        reduced ? 0 : 350,
      );
    }
  }, [locationEnabled, locationRequest, userLocation, reduced, homeRegion]);
  const choose = useCallback(
    (point: MapPoint) => {
      if (point.places.length === 1) {
        onSelect(point.places[0]);
        return;
      }
      if (region.latitudeDelta <= 0.0007 || region.longitudeDelta <= 0.0007) {
        onSelectGroup(point.places);
        return;
      }
      onClear();
      map.current?.animateToRegion(
        {
          latitude: point.latitude,
          longitude: point.longitude,
          latitudeDelta: Math.max(region.latitudeDelta * 0.45, 0.0006),
          longitudeDelta: Math.max(region.longitudeDelta * 0.45, 0.0006),
        },
        reduced ? 0 : 350,
      );
    },
    [onSelect, onSelectGroup, onClear, region, reduced],
  );
  return (
    <View
      style={StyleSheet.absoluteFill}
      onLayout={({ nativeEvent: { layout } }) =>
        setSize((current) =>
          current.width === layout.width && current.height === layout.height
            ? current
            : { width: layout.width, height: layout.height },
        )
      }
    >
      <MapView
        ref={map}
        style={StyleSheet.absoluteFill}
        initialRegion={region}
        onMapReady={() => onLoadStateChange?.("ready")}
        onRegionChangeComplete={onRegionChange}
        onPress={(event) => {
          if (event.nativeEvent.action !== "marker-press") onClear();
        }}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={false}
        toolbarEnabled={false}
        mapPadding={{
          top: topInset,
          right: 0,
          bottom: bottomInset + 16,
          left: 0,
        }}
      >
        {points.map((point) => (
          <PointPin
            key={point.id}
            point={point}
            selected={
              point.places.length === 1 && selected?.id === point.places[0].id
            }
            onSelect={choose}
            reduced={reduced}
          />
        ))}
        {visibleReportNodes.map((node) => (
          <ReportPin
            key={node.id}
            node={node}
            selected={!!node.report && node.report.id === selectedReport?.id}
            onSelect={() => {
              if (node.report) {
                onSelectReport(node.report);
                return;
              }
              const next = reportClusterRegion(node, latestRegion.current);
              if (!next) {
                onOpenReportGroup(node);
                return;
              }
              onClear();
              map.current?.animateToRegion(next, reduced ? 0 : 350);
            }}
            canZoom={!!reportClusterRegion(node, region)}
          />
        ))}
        {userLocation && (
          <Marker coordinate={userLocation} title="Minha localização">
            <View
              style={{
                width: 18,
                height: 18,
                borderRadius: 9,
                backgroundColor: palette.info,
                borderWidth: 3,
                borderColor: "white",
              }}
            />
          </Marker>
        )}
      </MapView>
      <MapAttribution
        bottom={bottomInset + 7}
        overture={hasOverture}
      />
    </View>
  );
}
