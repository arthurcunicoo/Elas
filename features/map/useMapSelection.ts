import { useCallback, useEffect, useState } from "react";
import { Keyboard } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import type { Place } from "../../constants/places";
import type { Report } from "../../services/reports";
import { useCatalog } from "./CatalogProvider";
import { useSession } from "../auth/SessionProvider";
export function useMapSelection(reports: Report[]) {
  const { places, ensurePlace } = useCatalog();
  const { session } = useSession(),
    user = session?.user.id;
  const [owner, setOwner] = useState(user);
  const { placeId, reportId } = useLocalSearchParams<{
    placeId?: string;
    reportId?: string;
  }>();
  const [selected, setSelected] = useState<Place | null>(null),
    [selectedReport, setSelectedReport] = useState<Report | null>(null),
    [expanded, setExpanded] = useState(false),
    [groupPlaces, setGroupPlaces] = useState<Place[] | null>(null);
  useEffect(() => {
    setOwner(user);
    setSelectedReport(null);
    setSelected(null);
    setGroupPlaces(null);
  }, [user]);
  useEffect(() => {
    if (reportId) {
      const report = reports.find((r) => r.id === reportId);
      if (report) {
        setSelectedReport(report);
        setSelected(null);
      } else setSelectedReport(null);
    } else if (placeId) {
      const place = places.find((p) => p.id === placeId);
      if (place) setSelected(place);
    }
  }, [places, reports, placeId, reportId]);
  useFocusEffect(
    useCallback(() => {
      if (!placeId || reportId) return;
      let active = true;
      const controller = new AbortController();
      void ensurePlace(placeId, controller.signal)
        .then((p) => {
          if (active && p) {
            setSelected(p);
            if (p.id !== placeId) router.setParams({ placeId: p.id });
          }
        })
        .catch(() => {});
      return () => {
        active = false;
        controller.abort();
      };
    }, [placeId, reportId, ensurePlace]),
  );
  const choose = useCallback((place: Place) => {
    setGroupPlaces(null);
    setSelectedReport(null);
    setSelected(place);
    setExpanded(false);
    router.setParams({ placeId: place.id, reportId: "" });
    Keyboard.dismiss();
  }, []);
  const chooseReport = useCallback((report: Report) => {
    setGroupPlaces(null);
    setSelected(null);
    setSelectedReport(report);
    setExpanded(false);
    router.setParams({ placeId: "", reportId: report.id });
    Keyboard.dismiss();
  }, []);
  const clear = useCallback(() => {
    setGroupPlaces(null);
    setSelected(null);
    setSelectedReport(null);
    setExpanded(false);
    router.setParams({ placeId: "", reportId: "" });
    Keyboard.dismiss();
  }, []);
  return {
    selected,
    selectedReport: owner === user ? selectedReport : null,
    expanded,
    setExpanded,
    groupPlaces,
    setGroupPlaces,
    choose,
    chooseReport,
    clear,
    reportId,
  };
}
