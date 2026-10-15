import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

// SecureStore on native. Web has no SecureStore, and the web build is only a dev
// preview: dev uses localStorage so reloads keep the session, a production build
// keeps values in memory so the token is never persisted.
const isWeb = Platform.OS === "web";
const memory = new Map<string, string>();
const webStore = {
  get: (key: string) =>
    __DEV__ ? (globalThis.localStorage?.getItem(key) ?? null) : (memory.get(key) ?? null),
  set: (key: string, value: string) =>
    __DEV__ ? globalThis.localStorage?.setItem(key, value) : memory.set(key, value),
  remove: (key: string) =>
    __DEV__ ? globalThis.localStorage?.removeItem(key) : memory.delete(key),
};

export async function getItem(key: string): Promise<string | null> {
  if (isWeb) return webStore.get(key);
  return SecureStore.getItemAsync(key);
}

export async function setItem(key: string, value: string): Promise<void> {
  if (isWeb) {
    webStore.set(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

export async function deleteItem(key: string): Promise<void> {
  if (isWeb) {
    webStore.remove(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}
