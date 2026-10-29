import { LoadingState } from "../../components/loading/LoadingState";
import { MapSearch } from "./MapSearch";
import { MapStatus } from "./MapStatus";
import { MapResults } from "./MapResults";
import { SelectedReport } from "./SelectedReport";
import { MapActions } from "./MapActions";
import { useMapResults } from "./useMapResults";
import { styles } from "./mapStyles";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BackHandler, Keyboard, Text, View } from "react-native";

import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import CityMap from "../../components/map/CityMap";
import { MapFilters } from "../../components/map/MapFilters";
import { PlaceCard } from "../../components/map/PlaceCard";
import { MapLoadingPopup } from "../../components/map/MapLoadingPopup";
import { ProfileDialog, type ProfileNotice } from "../../components/ProfileDialog";

import type { MapRegion } from "../../constants/places";
import { areaContains, type ServiceArea } from "../../services/serviceAreas";
import { useServiceAreas } from "./useServiceAreas";
import { ServiceAreaSelector } from "./ServiceAreaSelector";
import { reportGroupBounds } from "./reportClusters";
import { FeaturePage, Action, Message, shared } from "../../components/shared/FeaturePage";
import { TouchFeedback } from "../../components/TouchFeedback";
import { CategoryId, categoryForPlace } from "../../constants/placeCategories";
import { backendConfigured } from "../../lib/supabase";
import { useCatalog } from "./CatalogProvider";
import { useLocation } from "./LocationProvider";
import { captureLocation } from "./location";
import { useMapSelection } from "./useMapSelection";
import { useCatalogRegion } from "./useCatalogRegion";
import { useMapReports } from "./useMapReports";
import { usePlaceSearch } from "./usePlaceSearch";

import { catalogScope, sameMapRegion } from "./region";
import { detailPanelMaxHeight } from "./viewport";

export default function CityMapScreen() {
  const areas = useServiceAreas();
  const [focus, setFocus] = useState<
    { latitude: number; longitude: number } | undefined
  >(undefined);
  if (!areas.area)
    return (
      <FeaturePage title="Mapa da cidade">
        {areas.loading ? (
          <LoadingState
            title="Encontrando sua cidade"
            message="Preparando os caminhos para você explorar."
          />
        ) : (
          <Text style={shared.note}>
            Escolha uma área disponível para explorar.
          </Text>
        )}
        <Message text={areas.error} error />
        {!areas.loading && (
          <Action title="Tentar novamente" onPress={areas.retry} />
        )}
      </FeaturePage>
    );
  return (
    <MapExperience
      key={areas.area.id}
      area={areas.area}
      areas={areas.rows}
      initialFocus={focus}
      onChangeArea={(id, point) => {
        setFocus(point);
        areas.choose(id);
      }}
    />
  );
}
function MapExperience({
  area,
  areas,
  onChangeArea,
  initialFocus,
}: {
  area: ServiceArea;
  areas: ServiceArea[];
  initialFocus?: { latitude: number; longitude: number };
  onChangeArea: (
    id: string,
    point?: { latitude: number; longitude: number },
  ) => void;
}) {
  const { places } = useCatalog(),
    { userLocation, setUserLocation } = useLocation();
  const insets = useSafeAreaInsets();
  const { reportId } = useLocalSearchParams<{ reportId?: string }>();
  const [region, setRegion] = useState({ ...area.region, ...initialFocus }),
    [query, setQuery] = useState(""),
    [focused, setFocused] = useState(false),
    [scope, setScope] = useState<"area" | "catalog">("area");
  const [filter, setFilter] = useState<CategoryId>("all"),
    [filtersOpen, setFiltersOpen] = useState(false),
    [listOpen, setListOpen] = useState(false);
  const [areaHeight, setAreaHeight] = useState(600),
    [headerHeight, setHeaderHeight] = useState(70),
    [searchHeight, setSearchHeight] = useState(95);
  const [detailHeight, setDetailHeight] = useState(0);
  const updateRegion = useCallback((next: MapRegion) => {
    setRegion((previous) => (sameMapRegion(previous, next) ? previous : next));
  }, []);
  const [opening, setOpening] = useState(true),
    [mapState, setMapState] = useState<"loading" | "ready" | "error">(
      "loading",
    ),
    [mapAttempt, setMapAttempt] = useState(0);
  const [locating, setLocating] = useState(false),
    [locationError, setLocationError] = useState(""),
    [locationRequest, setLocationRequest] = useState(initialFocus ? 1 : 0);
  const [areaPicker, setAreaPicker] = useState(false);
  const [mapNotice, setMapNotice] = useState<ProfileNotice | null>(null);
  const mounted = useRef(true),
    locationLock = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const catalog = useCatalogRegion(region, filter),
    reports = useMapReports(region, reportId),
    selection = useMapSelection(reports.rows);
  const {
    selected,
    selectedReport,
    groupPlaces,
    clear: clearSelection,
    choose: selectPlace,
  } = selection;
  useEffect(() => {
    const point = selected ?? selectedReport;
    if (!point || point.latitude == null || point.longitude == null) return;
    const target = areas.find((candidate) =>
      areaContains(candidate, {
        latitude: point.latitude!,
        longitude: point.longitude!,
      }),
    );
    if (target && target.id !== area.id) onChangeArea(target.id);
  }, [selected, selectedReport, areas, area.id, onChangeArea]);
  const imported = usePlaceSearch(
    query,
    filter,
    catalogScope(scope, focused, listOpen, backendConfigured),
  );
  const { available, results, counts } = useMapResults(
    places,
    region,
    filter,
    query,
    imported.rows,
    scope === "catalog" && backendConfigured,
  );
  const choose = useCallback(
    (place: (typeof places)[number]) => {
      selectPlace(place);
      setQuery("");
      setFocused(false);
      setListOpen(false);
    },
    [selectPlace],
  );
  const clear = useCallback(() => {
    clearSelection();
    setFocused(false);
    setListOpen(false);
  }, [clearSelection]);
  const mapPlaces = useMemo(
    () =>
      selected && !available.some((p) => p.id === selected.id)
        ? [...available, selected]
        : available,
    [available, selected],
  );
  const openReportGroup = useCallback(
    (node: (typeof reports.nodes)[number]) => {
      const bounds = reportGroupBounds(node);
      router.push({
        pathname: "/relatos-area",
        params: {
          south: String(bounds.south),
          west: String(bounds.west),
          north: String(bounds.north),
          east: String(bounds.east),
        },
      });
    },
    [],
  );
  useEffect(() => {
    if (mapState === "ready" && catalog.settled && !catalog.error)
      setOpening(false);
  }, [mapState, catalog.settled, catalog.error]);
  useEffect(() => {
    if (mapState !== "loading") return;
    const timer = setTimeout(() => setMapState("error"), 20000);
    return () => clearTimeout(timer);
  }, [mapState, mapAttempt]);
  useFocusEffect(
    useCallback(() => {
      const listener = BackHandler.addEventListener("hardwareBackPress", () => {
        if (focused || listOpen) {
          setFocused(false);
          setListOpen(false);
          Keyboard.dismiss();
          return true;
        }
        if (selected || selectedReport || groupPlaces) {
          clearSelection();
          return true;
        }
        return false;
      });
      return () => listener.remove();
    }, [
      focused,
      listOpen,
      selected,
      selectedReport,
      groupPlaces,
      clearSelection,
    ]),
  );
  async function locate() {
    if (locationLock.current) return;
    locationLock.current = true;
    setLocating(true);
    setLocationError("");
    try {
      const point = await captureLocation();
      if (mounted.current) {
        const target = areas.find((candidate) =>
          areaContains(candidate, point),
        );
        if (!target)
          throw new Error(
            "Sua localização está fora das cidades disponíveis. Você pode escolher uma cidade e explorar o mapa.",
          );
        clearSelection();
        setUserLocation(point);
        if (target.id !== area.id) onChangeArea(target.id, point);
        else setLocationRequest((n) => n + 1);
      }
    } catch (e) {
      if (mounted.current)
        setLocationError(
          e instanceof Error
            ? e.message
            : "Não foi possível obter a localização.",
        );
    } finally {
      locationLock.current = false;
      if (mounted.current) setLocating(false);
    }
  }
  // Reserve one stable feedback row; loading/messages never change map padding.
  const panelTop = headerHeight + searchHeight + 64;
  const cardHeight = detailPanelMaxHeight(areaHeight, panelTop);
  const showList = focused || listOpen || !!selection.groupPlaces;
  const showDetails = !showList && (!!selected || !!selectedReport);
  const mapBottomInset = showDetails ? detailHeight + 24 : 34;
  const failure =
    locationError ||
    catalog.error ||
    (mapState === "error"
      ? "O mapa demorou para responder. Tente atualizar os dados novamente."
      : "");
  const notice = failure || reports.error || catalog.message;
  return (
    <View
      style={styles.root}
      onLayout={(e) => setAreaHeight(Math.round(e.nativeEvent.layout.height))}
    >
      <StatusBar style="light" />
      <CityMap
        key={mapAttempt}
        onLoadStateChange={setMapState}
        places={mapPlaces}
        categoryFiltered={filter !== "all"}
        selected={selection.selected}
        onSelect={choose}
        onClear={clear}
        onSelectGroup={selection.setGroupPlaces}
        reportNodes={reports.nodes}
        areaName={area.nome}
        homeRegion={area.region}
        onOpenReportGroup={openReportGroup}
        selectedReport={selection.selectedReport}
        onSelectReport={selection.chooseReport}
        locationEnabled={locationRequest > 0}
        userLocation={userLocation}
        onLocation={setUserLocation}
        region={region}
        onRegionChange={updateRegion}
        topInset={panelTop}
        bottomInset={mapBottomInset}
        locationRequest={locationRequest}
      />
      <MapLoadingPopup
        visible={opening}
        mapReady={mapState === "ready"}
        placesReady={catalog.settled && !catalog.error}
        error={
          mapState === "error"
            ? "O mapa não respondeu. Confira sua conexão e tente novamente."
            : catalog.error
        }
        onClose={() => setOpening(false)}
        onRetry={() => {
          if (mapState !== "ready") {
            setMapState("loading");
            setMapAttempt((n) => n + 1);
          }
          catalog.retry();
        }}
      />
      <ServiceAreaSelector
        visible={areaPicker}
        rows={areas}
        selected={area.id}
        onChoose={(id) => {
          clearSelection();
          onChangeArea(id);
        }}
        onClose={() => setAreaPicker(false)}
      />
      <ProfileDialog notice={mapNotice} onClose={() => setMapNotice(null)} />
      <View
        onLayout={(e) =>
          setHeaderHeight(Math.round(e.nativeEvent.layout.height))
        }
        style={[styles.header, { paddingTop: insets.top + 19 }]}
      >
        <View style={styles.headerRow}>
          <Text accessibilityRole="header" style={styles.heading}>
            Mapa
          </Text>
          <TouchFeedback
            label={`Escolher cidade. Atual: ${area.nome}, ${area.estado}`}
            onPress={() => setAreaPicker(true)}
            style={styles.cityChoice}
          >
            <Text numberOfLines={2} style={styles.cityLabel}>
              {area.nome} · {area.estado} ▾
            </Text>
          </TouchFeedback>
        </View>
      </View>
      <MapSearch
        query={query}
        onQueryChange={setQuery}
        focused={focused}
        locating={locating}
        hasLocation={!!userLocation}
        showScopes={focused || listOpen}
        scope={scope}
        filter={filter}
        top={headerHeight + 8}
        onHeight={setSearchHeight}
        onFocus={() => {
          setFocused(true);
          setListOpen(false);
        }}
        onSubmit={() => {
          setFocused(true);
          Keyboard.dismiss();
        }}
        onFilters={() => {
          Keyboard.dismiss();
          setFocused(false);
          setFiltersOpen(true);
        }}
        onLocate={() => void locate()}
        onScopeChange={(next) => {
          setScope(next);
          setFocused(true);
        }}
        onFilterChange={(next) => {
          setFilter(next);
          if (
            selected &&
            next !== "all" &&
            categoryForPlace(selected).id !== next
          )
            clear();
        }}
      >
        <MapStatus
          opening={opening}
          mapState={mapState}
          notice={notice}
          failure={failure}
          onNotice={() =>
            setMapNotice({
              title: failure ? "Aviso do mapa" : "Lugares nesta área",
              message: notice,
              confirmLabel: failure ? "Tentar novamente" : "Buscar na lista",
              confirm: failure
                ? () => {
                    if (locationError) {
                      void locate();
                      return;
                    }
                    if (mapState === "error") {
                      setOpening(true);
                      setMapState("loading");
                      setMapAttempt((n) => n + 1);
                    }
                    catalog.retry();
                    reports.retry();
                  }
                : () => {
                    selection.setGroupPlaces(null);
                    setScope("catalog");
                    setFocused(false);
                    setListOpen(true);
                    Keyboard.dismiss();
                  },
            })
          }
        />
      </MapSearch>
      {focused || listOpen || selection.groupPlaces ? (
        <MapResults
          panelTop={panelTop}
          areaHeight={areaHeight}
          groupPlaces={groupPlaces}
          scope={scope}
          results={results}
          imported={imported}
          onChoose={choose}
          onClose={() => {
            setFocused(false);
            setListOpen(false);
            selection.setGroupPlaces(null);
            Keyboard.dismiss();
          }}
        />
      ) : (
        <>
          <View
            onLayout={(e) => {
              if (selected)
                setDetailHeight(Math.round(e.nativeEvent.layout.height));
            }}
            pointerEvents="box-none"
            style={[styles.cardPosition]}
          >
            <PlaceCard
              place={selection.selected}
              expanded={selection.expanded}
              onToggle={() => selection.setExpanded((v) => !v)}
              onClose={clear}
              onReview={(place) =>
                router.push({
                  pathname: "/avaliar",
                  params: { placeId: place.id },
                })
              }
              maxHeight={
                selection.expanded
                  ? Math.max(cardHeight, Math.min(520, areaHeight - headerHeight - 24))
                  : Math.max(cardHeight, 340)
              }
            />
          </View>
          {selectedReport && (
            <SelectedReport
              report={selectedReport}
              maxHeight={cardHeight}
              onHeight={setDetailHeight}
              onClose={clear}
            />
          )}
        </>
      )}
      {!showDetails && !showList && (
        <MapActions
          onImpacts={() => router.push("/impactos")}
          onList={() => {
            setListOpen((v) => !v);
            setFocused(false);
            Keyboard.dismiss();
          }}
        />
      )}
      <MapFilters
        visible={filtersOpen}
        value={filter}
        counts={counts}
        onClose={() => setFiltersOpen(false)}
        onChange={(value) => {
          setFilter(value);
          if (
            selection.selected &&
            value !== "all" &&
            categoryForPlace(selection.selected).id !== value
          )
            clear();
        }}
      />
    </View>
  );
}
