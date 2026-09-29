import { PICK_PREFERENCES_KEY, pickStore } from "./pickStorage";

export interface TalkPreferences {
  soundOn: boolean;
  musicOn: boolean;
  hapticsOn: boolean;
  tutorialDone: boolean;
}

export function loadTalkPreferences(): TalkPreferences {
  const value = JSON.parse(pickStore.read(PICK_PREFERENCES_KEY) ?? "{}") as Partial<TalkPreferences>;
  return {
    soundOn: value.soundOn !== false,
    musicOn: value.musicOn !== false,
    hapticsOn: value.hapticsOn !== false,
    tutorialDone: value.tutorialDone === true,
  };
}

export function saveTalkPreferences(preferences: TalkPreferences): void {
  pickStore.write(PICK_PREFERENCES_KEY, JSON.stringify(preferences));
}
