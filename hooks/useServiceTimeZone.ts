import { useSyncExternalStore } from "react";
import { useSession } from "../features/auth/SessionProvider";
import { selectedServiceArea, subscribeServiceSelection } from "../features/map/serviceSelection";
import { serviceTimeZone } from "../constants/serviceTimeZone";
export function useServiceTimeZone() {
  const { session } = useSession(),
    owner = session?.user.id ?? "demo";
  return useSyncExternalStore(
    subscribeServiceSelection,
    () => selectedServiceArea(owner)?.timezone ?? serviceTimeZone,
    () => serviceTimeZone,
  );
}
