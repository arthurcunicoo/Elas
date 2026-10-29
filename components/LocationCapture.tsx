import { useEffect, useRef } from "react";
import { Coordinate } from "../features/map/LocationProvider";
import { captureLocation } from "../features/map/location";
export default function LocationCapture({
  onLocation,
  onError,
}: {
  onLocation: (point: Coordinate) => void;
  onError: (message: string) => void;
}) {
  const handlers = useRef({ onLocation, onError });
  handlers.current = { onLocation, onError };
  useEffect(() => {
    let active = true;
    void captureLocation()
      .then((point) => {
        if (active) handlers.current.onLocation(point);
      })
      .catch((e) => {
        if (active)
          handlers.current.onError(
            e instanceof Error ? e.message : "Localização indisponível.",
          );
      });
    return () => {
      active = false;
    };
  }, []);
  return null;
}
