import type { ReviewSummary } from "./community";
// Approximate demonstration coordinates and fictional status, not safety assessments.
export type MapRegion = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};
export type Place = {
  id: string;
  name: string;
  prominence?: number;
  address: string;
  latitude: number;
  longitude: number;
  status: "safe" | "attention" | "moderate" | "unknown";
  reviewSummary?: ReviewSummary;
  reviewsUnavailable?: boolean;
  demonstration?: boolean;
  photo?: boolean;
  photoUrl?: string;
  source?: "manual" | "osm" | "overture";
  externalRef?: string;
  category?: string;
  appCategory?: string;
  updatedAt?: string;
  photoAuthor?: string;
  photoLicense?: string;
  photoSource?: string;
  photoDate?: string;
  dataSource?: string;
  verifiedAt?: string;
};
export const initialMapRegion = {
  latitude: -28.678,
  longitude: -49.369,
  latitudeDelta: 0.016,
  longitudeDelta: 0.016,
};
export const places: Place[] = [
  {
    id: "nereu",
    name: "Praça Nereu Ramos",
    address: "Centro - Criciúma - SC",
    latitude: -28.6773,
    longitude: -49.3692,
    status: "safe",
    demonstration: true,
    photo: true,
    category: "park",
  },
  {
    id: "congresso",
    name: "Praça do Congresso",
    address: "Centro - Criciúma - SC",
    latitude: -28.6738,
    longitude: -49.3705,
    status: "safe",
    demonstration: true,
    category: "park",
  },
  {
    id: "ponto-leste",
    name: "Ponto Leste",
    address: "Local de demonstração - Criciúma",
    latitude: -28.6778,
    longitude: -49.3637,
    status: "attention",
    demonstration: true,
  },
  {
    id: "ponto-sul",
    name: "Ponto Sul",
    address: "Local de demonstração - Criciúma",
    latitude: -28.683,
    longitude: -49.3694,
    status: "safe",
    demonstration: true,
  },
];

const normalizedCache = new Map<string, string>();
export function normalizePlaceQuery(value: string) {
  if (!value) return "";
  const cached = normalizedCache.get(value);
  if (cached !== undefined) return cached;
  const result = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
  if (normalizedCache.size >= 2500) {
    const firstKey = normalizedCache.keys().next().value;
    if (firstKey !== undefined) normalizedCache.delete(firstKey);
  }
  normalizedCache.set(value, result);
  return result;
}
