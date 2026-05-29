/**
 * Secure token storage. Uses expo-secure-store (Keychain on iOS, Keystore on
 * Android). Web is unsupported by SecureStore — we fall back to AsyncStorage-
 * style noop so the app still runs in the Expo web preview during dev.
 */
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TOKEN_KEY = 'samaj.token';

const isWeb = Platform.OS === 'web';
const webStore: Record<string, string | null> = {};

export async function saveToken(token: string): Promise<void> {
  if (isWeb) {
    webStore[TOKEN_KEY] = token;
    return;
  }
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function loadToken(): Promise<string | null> {
  if (isWeb) return webStore[TOKEN_KEY] ?? null;
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function clearToken(): Promise<void> {
  if (isWeb) {
    webStore[TOKEN_KEY] = null;
    return;
  }
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}
