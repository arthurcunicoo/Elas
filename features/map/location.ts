import * as Location from 'expo-location';
import type { Coordinate } from './LocationProvider';
export async function captureLocation(): Promise<Coordinate> {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (!permission.granted)
    throw new Error('Permissão negada. Você pode explorar o mapa ou informar o local por texto.');
  if (!(await Location.hasServicesEnabledAsync()))
    throw new Error('Ative a localização do aparelho ou continue explorando manualmente.');
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const position = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () =>
            reject(
              new Error('A localização demorou. Tente novamente ou explore o mapa manualmente.'),
            ),
          15000,
        );
      }),
    ]);
    return { latitude: position.coords.latitude, longitude: position.coords.longitude };
  } finally {
    if (timer) clearTimeout(timer);
  }
}
