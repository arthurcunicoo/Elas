import type { MapRegion } from "../../constants/places";
// Quantize geometry and identity together. Every viewport in a bucket fits
// inside the padded request, so reuse never loses markers at its edges.
export function queryRegion(region: MapRegion): MapRegion {
  const axis = (center: number, delta: number) => {
    const span =
      2 ** (Math.ceil(Math.log2(Math.max(Math.abs(delta), 0.00005)) * 4) / 4);
    const step = span / 16;
    return {
      center: Number((Math.round(center / step) * step).toPrecision(13)),
      span: span + step,
    };
  };
  const lat = axis(region.latitude, region.latitudeDelta),
    lon = axis(region.longitude, region.longitudeDelta);
  return {
    latitude: lat.center,
    longitude: lon.center,
    latitudeDelta: lat.span,
    longitudeDelta: lon.span,
  };
}
export function reportZoom(region: MapRegion) {
  return Math.max(
    0,
    Math.min(
      22,
      Math.round(
        Math.log2(
          (360 * 390) / (256 * Math.max(region.longitudeDelta, 0.00001)),
        ),
      ),
    ),
  );
}
export function regionKey(region: MapRegion) {
  return [
    region.latitude,
    region.longitude,
    region.latitudeDelta,
    region.longitudeDelta,
  ].join(",");
}
// Quarter-zoom buckets keep close-ups distinct from broad ranked shortlists.
export function catalogRequestKey(region: MapRegion) {
  return regionKey(queryRegion(region));
}
export function catalogScope(
  scope: "area" | "catalog",
  focused: boolean,
  listOpen: boolean,
  configured: boolean,
) {
  return scope === "catalog" && (focused || listOpen) && configured;
}

// Native map callbacks may differ by sub-centimetre floating-point noise.
// Reuse state for the same view, while preserving even small real movements.
export function sameMapRegion(a: MapRegion, b: MapRegion) {
  const epsilon = 1e-8;
  return (
    Math.abs(a.latitude - b.latitude) <= epsilon &&
    Math.abs(a.longitude - b.longitude) <= epsilon &&
    Math.abs(a.latitudeDelta - b.latitudeDelta) <= epsilon &&
    Math.abs(a.longitudeDelta - b.longitudeDelta) <= epsilon
  );
}
