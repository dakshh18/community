import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Resolves the backend base URL across the three dev contexts:
 *   - iOS Simulator + Web   → http://localhost:4000
 *   - Android emulator      → http://10.0.2.2:4000  (loopback to host)
 *   - Physical device (Expo Go via LAN/tunnel) → derive from debuggerHost,
 *     OR set EXPO_PUBLIC_API_URL=http://<your-LAN-ip>:4000 in mobile/.env.
 *
 * Production: read `extra.apiUrl` from app.json (and override at build time).
 */
function resolveBaseUrl(): string {
  const explicit = process.env.EXPO_PUBLIC_API_URL;
  if (explicit) return explicit;

  const port = 4000;

  if (__DEV__) {
    // Expo Go exposes the dev server host so we can derive the LAN IP.
    const hostUri =
      (Constants.expoConfig as { hostUri?: string } | undefined)?.hostUri ||
      (Constants as unknown as { manifest2?: { extra?: { expoGo?: { debuggerHost?: string } } } })
        .manifest2?.extra?.expoGo?.debuggerHost;

    if (hostUri) {
      const host = hostUri.split(':')[0];
      // Treat literal "localhost" specially per-platform.
      if (host && host !== 'localhost') return `http://${host}:${port}`;
    }

    if (Platform.OS === 'android') return `http://10.0.2.2:${port}`;
    return `http://localhost:${port}`;
  }

  const fromExtra = (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl;
  return fromExtra ?? `http://localhost:${port}`;
}

export const API_BASE_URL = resolveBaseUrl();
