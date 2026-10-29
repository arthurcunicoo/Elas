import type { MapRegion, Place } from './places';

export type CategoryId =
  | 'all'
  | 'parks'
  | 'restaurants'
  | 'cafes'
  | 'markets'
  | 'shops'
  | 'health'
  | 'education'
  | 'sports'
  | 'services'
  | 'other';
export const placeCategories = [
  {
    id: 'all',
    label: 'Todos',
    singular: 'Lugar',
    icon: 'grid-outline',
    color: '#AA2454',
    tint: '#FBEAF0',
  },
  {
    id: 'parks',
    label: 'Parques',
    singular: 'Parque e praça',
    icon: 'leaf-outline',
    color: '#287561',
    tint: '#E4F2EC',
  },
  {
    id: 'restaurants',
    label: 'Restaurantes',
    singular: 'Restaurante',
    icon: 'restaurant-outline',
    color: '#A9522B',
    tint: '#FAEBE3',
  },
  {
    id: 'cafes',
    label: 'Cafés e bares',
    singular: 'Café e bar',
    icon: 'cafe-outline',
    color: '#945044',
    tint: '#F7EAE6',
  },
  {
    id: 'markets',
    label: 'Mercados',
    singular: 'Mercado',
    icon: 'basket-outline',
    color: '#8B681B',
    tint: '#F7F0DB',
  },
  {
    id: 'shops',
    label: 'Lojas',
    singular: 'Loja',
    icon: 'bag-handle-outline',
    color: '#A13572',
    tint: '#F7E7F0',
  },
  {
    id: 'health',
    label: 'Saúde',
    singular: 'Saúde',
    icon: 'medical-outline',
    color: '#426AB0',
    tint: '#E8EFFB',
  },
  {
    id: 'education',
    label: 'Educação',
    singular: 'Educação',
    icon: 'school-outline',
    color: '#7659A9',
    tint: '#F0EAF9',
  },
  {
    id: 'sports',
    label: 'Esportes',
    singular: 'Esporte e academia',
    icon: 'fitness-outline',
    color: '#297B8D',
    tint: '#E3F2F5',
  },
  {
    id: 'services',
    label: 'Serviços',
    singular: 'Serviço',
    icon: 'briefcase-outline',
    color: '#586878',
    tint: '#EBEFF3',
  },
  {
    id: 'other',
    label: 'Outros',
    singular: 'Outro local',
    icon: 'location-outline',
    color: '#706676',
    tint: '#F0EDF2',
  },
] as const;
export type PlaceCategory = (typeof placeCategories)[number];
export const categoryTags: Record<Exclude<CategoryId, 'all'>, readonly string[]> = {
  parks: ['park', 'garden', 'playground', 'nature_reserve', 'recreation_ground'],
  restaurants: ['restaurant', 'fast_food', 'food_court'],
  cafes: ['cafe', 'bar', 'pub', 'ice_cream'],
  markets: ['supermarket', 'convenience', 'greengrocer', 'marketplace', 'grocery'],
  shops: [
    'mall',
    'clothes',
    'shoes',
    'hardware',
    'doityourself',
    'variety_store',
    'electronics',
    'gift',
    'pet',
    'beauty',
    'party',
    'car',
    'bakery',
    'butcher',
    'bookshop',
    'books',
    'florist',
    'furniture',
    'department_store',
    'jewelry',
    'optician',
    'sports',
    'mobile_phone',
    'stationery',
    'kiosk',
  ],
  health: ['pharmacy', 'hospital', 'clinic', 'doctors', 'dentist'],
  education: ['school', 'university', 'college', 'kindergarten', 'library'],
  sports: ['fitness_centre', 'sports_centre', 'pitch', 'swimming_pool'],
  services: [
    'bank',
    'police',
    'fuel',
    'car_repair',
    'hairdresser',
    'ticket',
    'community_centre',
    'theatre',
    'post_office',
    'laundry',
    'atm',
  ],
  other: [],
};

// Precomputed O(1) lookup tables so map panning and filtering never scan arrays.
const categoryById = new Map<string, PlaceCategory>();
for (const category of placeCategories) {
  if (category.id !== 'all') categoryById.set(category.id, category);
}
const otherCategory = categoryById.get('other')!;
const categoryByTag = new Map<string, PlaceCategory>();
for (const [id, tags] of Object.entries(categoryTags)) {
  const category = categoryById.get(id);
  if (category) {
    for (const tag of tags) categoryByTag.set(tag, category);
  }
}

export function categoryForPlace(
  place: Pick<Place, 'category' | 'id' | 'appCategory'>,
): PlaceCategory {
  if (place.appCategory) {
    const override = categoryById.get(place.appCategory);
    if (override) return override;
  }
  const tag = place.category?.trim().toLowerCase();
  return (tag ? categoryByTag.get(tag) : undefined) ?? otherCategory;
}
export function matchesCategory(place: Place, category: CategoryId) {
  return category === 'all' || categoryForPlace(place).id === category;
}
const detailLabels: Record<string, string> = {
  park: 'Parque',
  restaurant: 'Restaurante',
  fast_food: 'Lanchonete',
  cafe: 'Café',
  bar: 'Bar',
  pub: 'Bar',
  pharmacy: 'Farmácia',
  hospital: 'Hospital',
  clinic: 'Clínica',
  doctors: 'Consultório',
  dentist: 'Dentista',
  supermarket: 'Supermercado',
  convenience: 'Conveniência',
  bank: 'Banco',
  fuel: 'Posto de combustível',
  police: 'Delegacia',
  school: 'Escola',
  university: 'Universidade',
  college: 'Instituição de ensino',
  fitness_centre: 'Academia',
  sports_centre: 'Centro esportivo',
  mall: 'Shopping',
  bakery: 'Padaria',
  hairdresser: 'Salão',
  car_repair: 'Oficina',
  library: 'Biblioteca',
};
export function placeTypeLabel(place: Place) {
  return place.appCategory
    ? categoryForPlace(place).singular
    : (detailLabels[place.category?.trim().toLowerCase() ?? ''] ??
        categoryForPlace(place).singular);
}
export function distanceBetween(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
) {
  const rad = Math.PI / 180,
    dLat = (b.latitude - a.latitude) * rad,
    dLon = (b.longitude - a.longitude) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
}
export type MapPoint = { id: string; latitude: number; longitude: number; places: Place[] };
export function groupMapPoints(
  places: Place[],
  region: MapRegion,
  size: { width: number; height: number },
  selectedId?: string,
): MapPoint[] {
  if (!size.width || !size.height || region.latitudeDelta <= 0 || region.longitudeDelta <= 0)
    return [];
  const cells = new Map<string, Place[]>(),
    singles: MapPoint[] = [];
  const invLonDelta = size.width / region.longitudeDelta,
    invLatDelta = size.height / region.latitudeDelta,
    minLon = region.longitude - region.longitudeDelta / 2,
    maxLat = region.latitude + region.latitudeDelta / 2;
  for (const place of places) {
    if (place.id === selectedId) {
      singles.push({
        id: place.id,
        latitude: place.latitude,
        longitude: place.longitude,
        places: [place],
      });
      continue;
    }
    const x = (place.longitude - minLon) * invLonDelta;
    const y = (maxLat - place.latitude) * invLatDelta;
    const key = `${Math.floor(x / 48)}:${Math.floor(y / 48)}`;
    const cell = cells.get(key);
    if (cell) cell.push(place);
    else cells.set(key, [place]);
  }
  const result: MapPoint[] = [];
  for (const [key, items] of cells.entries()) {
    let latSum = 0,
      lonSum = 0;
    for (let i = 0; i < items.length; i++) {
      latSum += items[i].latitude;
      lonSum += items[i].longitude;
    }
    result.push({
      id: items.length === 1 ? items[0].id : `group:${key}`,
      latitude: latSum / items.length,
      longitude: lonSum / items.length,
      places: items,
    });
  }
  for (let i = 0; i < singles.length; i++) result.push(singles[i]);
  return result;
}
