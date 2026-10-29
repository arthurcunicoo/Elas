import { useEffect, useMemo, useRef } from "react";
import { PanResponder } from "react-native";
import { createFrameScheduler } from "../frameScheduler";
import { unproject } from "./geometry";
export function useWebMapDrag(
  center: { x: number; y: number },
  zoom: number,
  onClear: () => void,
  setViewport: (coordinate: { latitude: number; longitude: number }) => void,
  setDragging: (dragging: boolean) => void,
) {
  const dragStart = useRef(center);
  const gestureState = useRef({ center, zoom, onClear });
  gestureState.current = { center, zoom, onClear };
  const frames = useMemo(
    () =>
      createFrameScheduler(
        setViewport,
        requestAnimationFrame,
        cancelAnimationFrame,
      ),
    [setViewport],
  );
  useEffect(() => () => frames.cancel(), [frames]);
  return useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.hypot(gesture.dx, gesture.dy) > 6,
        onPanResponderGrant: () => {
          dragStart.current = gestureState.current.center;
          setDragging(true);
          gestureState.current.onClear();
        },
        onPanResponderMove: (_, gesture) =>
          frames.schedule(
            unproject(
              dragStart.current.x - gesture.dx,
              dragStart.current.y - gesture.dy,
              gestureState.current.zoom,
            ),
          ),
        onPanResponderRelease: () => {
          frames.flush();
          setDragging(false);
        },
        onPanResponderTerminate: () => {
          frames.flush();
          setDragging(false);
        },
      }),
    [frames, setDragging],
  );
}
