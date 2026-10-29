import { ReactNode } from "react";
import { SessionProvider } from "../features/auth/SessionProvider";
import { ProfileProvider } from "../features/profile/ProfileProvider";
import { CatalogProvider } from "../features/map/CatalogProvider";
import { LocationProvider } from "../features/map/LocationProvider";
export function AppDataProvider({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <ProfileProvider>
        <CatalogProvider>
          <LocationProvider>{children}</LocationProvider>
        </CatalogProvider>
      </ProfileProvider>
    </SessionProvider>
  );
}
