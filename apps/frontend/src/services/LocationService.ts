import type { Location } from '@rescuenet/shared';

export class LocationService {
  /**
   * Prompts the user for location permission and returns their coordinates.
   * Resolves with `null` if permission is denied, times out, or is unavailable.
   */
  static getCurrentLocation(): Promise<Location | null> {
    return new Promise((resolve) => {
      if (!('geolocation' in navigator)) {
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });
        },
        (error) => {
          console.warn('Location Service Error:', error.message);
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });
  }
}
