import { Geolocation } from '@capacitor/geolocation';
import { isNativeAlarmSchedulerAvailable } from './nativeAlarmScheduler';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Requests location permission and returns a single fix. Native Android
 * goes through @capacitor/geolocation (backed by the same
 * BridgeWebChromeClient.onGeolocationPermissionsShowPrompt permission flow
 * as the plain browser API — see AndroidManifest's ACCESS_FINE/COARSE_
 * LOCATION); everywhere else uses the browser's navigator.geolocation
 * directly, since there's no native shell to bridge through.
 */
export async function getCurrentLocation(): Promise<Coordinates> {
  if (isNativeAlarmSchedulerAvailable()) {
    const position = await Geolocation.getCurrentPosition();
    return { latitude: position.coords.latitude, longitude: position.coords.longitude };
  }

  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Geolocation is not available in this browser'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
      (error) => reject(new Error(error.message || 'Location request failed')),
      { enableHighAccuracy: false, timeout: 10_000 },
    );
  });
}
