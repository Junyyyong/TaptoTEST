import { savedObject } from "./persistentStore";
import { PICK_PREFERENCES_KEY, PICK_RECORDS_STORAGE_KEY } from "./pickStorage";
import { validatePickRecords } from "./pickRecords";

export function validatePickSave(key: string, raw: string): void {
  if (key === PICK_RECORDS_STORAGE_KEY) return validatePickRecords(raw);
  if (key !== PICK_PREFERENCES_KEY) throw Error("Unknown storage key");
  const value = savedObject(raw);
  for (const field of ["musicOn", "soundOn", "hapticsOn", "tutorialDone"]) {
    if (value[field] !== undefined && typeof value[field] !== "boolean") throw Error("Invalid preferences");
  }
}
