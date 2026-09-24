// Approximate demonstration coordinates and fictional status, not safety assessments.
export type Place = { id: string; name: string; address: string; latitude: number; longitude: number; status: 'safe' | 'attention'; photo?: boolean };
export const initialMapRegion = { latitude: -28.678, longitude: -49.369, latitudeDelta: .016, longitudeDelta: .016 };
export const places: Place[] = [
  { id: 'nereu', name: 'Praça Nereu Ramos', address: 'Centro - Criciúma - SC', latitude: -28.6773, longitude: -49.3692, status: 'safe', photo: true },
  { id: 'congresso', name: 'Praça do Congresso', address: 'Centro - Criciúma - SC', latitude: -28.6738, longitude: -49.3705, status: 'safe' },
  { id: 'ponto-leste', name: 'Ponto Leste', address: 'Local de demonstração - Criciúma', latitude: -28.6778, longitude: -49.3637, status: 'attention' },
  { id: 'ponto-sul', name: 'Ponto Sul', address: 'Local de demonstração - Criciúma', latitude: -28.683, longitude: -49.3694, status: 'safe' },
];
export function normalizePlaceQuery(value: string) { return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim(); }
