import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";
import { PersistentStore } from "./persistentStore";

// Storage contracts: do not rename these when the app/Android package is renamed.
export const PICK_PREFERENCES_KEY = "taptopick.preferences.v1";
export const PICK_RECORDS_STORAGE_KEY = "taptopick.records.v1";
export const PICK_STORAGE_KEYS = [PICK_PREFERENCES_KEY, PICK_RECORDS_STORAGE_KEY] as const;
export const pickStore = new PersistentStore(() => localStorage, Capacitor.isNativePlatform() ? Preferences : undefined);
