export const TILE = 256;
export const MERCATOR_LIMIT = 85.0511287798066;
export function project(latitude: number, longitude: number, zoom: number) {
  const size = TILE * 2 ** zoom;
  const sin = Math.sin(
    (Math.max(-MERCATOR_LIMIT, Math.min(MERCATOR_LIMIT, latitude)) * Math.PI) /
      180,
  );
  return {
    x: ((longitude + 180) / 360) * size,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * size,
  };
}
export function unproject(x: number, y: number, zoom: number) {
  const size = TILE * 2 ** zoom;
  return {
    longitude: (x / size) * 360 - 180,
    latitude:
      (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / size))) * 180) / Math.PI,
  };
}
export function visibleTiles(
  left: number,
  top: number,
  width: number,
  height: number,
  zoom: number,
) {
  const tiles: { x: number; y: number }[] = [];
  if (width <= 0 || height <= 0) return tiles;
  const startX = Math.floor(left / TILE),
    startY = Math.max(0, Math.floor(top / TILE));
  const endX = Math.floor((left + width - 1) / TILE),
    endY = Math.min(2 ** zoom - 1, Math.floor((top + height - 1) / TILE));
  for (let x = startX; x <= endX; x++)
    for (let y = startY; y <= endY; y++) tiles.push({ x, y });
  return tiles;
}
