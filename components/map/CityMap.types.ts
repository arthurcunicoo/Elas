import { Place } from '../../constants/places';
export type CityMapProps = { places: Place[]; selected: Place | null; onSelect: (place: Place) => void; onClear: () => void };
