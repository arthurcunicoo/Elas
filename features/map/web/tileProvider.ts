export type TileProvider = {
  template: string;
  attribution: string;
  attributionUrl: string;
  maxZoom: number;
  pilot: boolean;
};
type TileSettings = {
  template?: string;
  attribution?: string;
  attributionUrl?: string;
  maxZoom?: string;
  mode?: string;
};
export function createTileProvider(
  settings: TileSettings,
  development = false,
): TileProvider | null {
  if (!settings.template)
    return development || settings.mode === "pilot"
      ? {
          template: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
          attribution: "OpenStreetMap contributors",
          attributionUrl: "https://www.openstreetmap.org/copyright",
          maxZoom: 19,
          pilot: true,
        }
      : null;
  try {
    const url = new URL(settings.template),
      attribution = new URL(settings.attributionUrl ?? "");
    const maxZoom = Number(settings.maxZoom ?? "19");
    if (
      url.protocol !== "https:" ||
      attribution.protocol !== "https:" ||
      url.username ||
      url.password ||
      !settings.attribution?.trim() ||
      !["{z}", "{x}", "{y}"].every((token) =>
        settings.template!.includes(token),
      ) ||
      settings.template.replace(/\{[zxy]\}/g, "").includes("{") ||
      !Number.isInteger(maxZoom) ||
      maxZoom < 10 ||
      maxZoom > 20 ||
      url.hostname === "tile.openstreetmap.org" ||
      url.hostname.endsWith(".tile.openstreetmap.org")
    )
      return null;
    return {
      template: settings.template,
      attribution: settings.attribution.trim(),
      attributionUrl: attribution.href,
      maxZoom,
      pilot: false,
    };
  } catch {
    return null;
  }
}
export function tileUrl(
  provider: TileProvider,
  zoom: number,
  x: number,
  y: number,
) {
  const count = 2 ** zoom;
  if (
    ![zoom, x, y].every(Number.isInteger) ||
    zoom < 0 ||
    zoom > provider.maxZoom ||
    y < 0 ||
    y >= count
  )
    return null;
  return provider.template
    .replaceAll("{z}", String(zoom))
    .replaceAll("{x}", String(((x % count) + count) % count))
    .replaceAll("{y}", String(y));
}
// Expo requires static property access to inline these public build settings.
export const webTileProvider = createTileProvider(
  {
    template: process.env.EXPO_PUBLIC_MAP_TILE_URL,
    attribution: process.env.EXPO_PUBLIC_MAP_TILE_ATTRIBUTION,
    attributionUrl: process.env.EXPO_PUBLIC_MAP_TILE_ATTRIBUTION_URL,
    maxZoom: process.env.EXPO_PUBLIC_MAP_TILE_MAX_ZOOM,
    mode: process.env.EXPO_PUBLIC_MAP_TILE_MODE,
  },
  typeof __DEV__ !== "undefined" && __DEV__,
);
