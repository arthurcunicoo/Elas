import type { ServiceArea } from "../../services/serviceAreas";
const selections = new Map<string, ServiceArea>();
const listeners = new Set<() => void>();
export const subscribeServiceSelection = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
export const selectedServiceArea = (owner: string) => selections.get(owner);
export function selectServiceArea(owner: string, area: ServiceArea) {
  const previous = selections.get(owner);
  if (previous?.id === area.id && previous.timezone === area.timezone) return;
  selections.set(owner, area);
  while (selections.size > 4)
    selections.delete(selections.keys().next().value!);
  listeners.forEach((listener) => listener());
}
