import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { useSession } from '../auth/SessionProvider';
export type Coordinate = { latitude: number; longitude: number };
const Context = createContext<{
  userLocation: Coordinate | null;
  setUserLocation: (value: Coordinate | null) => void;
}>({ userLocation: null, setUserLocation: () => {} });
export function LocationProvider({ children }: { children: ReactNode }) {
  const { session } = useSession(),
    id = session?.user.id;
  const [location, setLocation] = useState<{ id?: string; point: Coordinate | null }>({
    id,
    point: null,
  });
  useEffect(() => setLocation({ id, point: null }), [id]);
  const value = useMemo(
    () => ({
      userLocation: location.id === id ? location.point : null,
      setUserLocation: (point: Coordinate | null) => setLocation({ id, point }),
    }),
    [id, location],
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export const useLocation = () => useContext(Context);
