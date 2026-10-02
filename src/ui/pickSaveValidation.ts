import { savedObject } from "./persistentStore";
import { PICK_PREFERENCES_KEY, PICK_RECORDS_STORAGE_KEY } from "./pickStorage";
import { validatePickRecords } from "./pickRecords";

export function validatePickSave(key: string, raw: string): void {
  if (key === PICK_RECORDS_STORAGE_KEY) return validatePickRecords(raw);
  if (key !== PICK_PREFERENCES_KEY) throw Error("Unknown storage key");
  const value = savedObject(raw);
  // Accept legacy vibration values so an existing install never loses its
  // settings or fails hydration. Active preferences no longer use this field.
  for (const field of ["musicOn", "soundOn", "hapticsOn", "tutorialDone"]) {
    if (value[field] !== undefined && typeof value[field] !== "boolean") throw Error("Invalid preferences");
  }
}
