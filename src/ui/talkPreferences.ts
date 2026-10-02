import { PICK_PREFERENCES_KEY, pickStore } from "./pickStorage";

export interface TalkPreferences {
  soundOn: boolean;
  musicOn: boolean;
  tutorialDone: boolean;
}

export function loadTalkPreferences(): TalkPreferences {
  const value = JSON.parse(pickStore.read(PICK_PREFERENCES_KEY) ?? "{}") as Partial<TalkPreferences>;
  return {
    soundOn: value.soundOn !== false,
    musicOn: value.musicOn !== false,
    tutorialDone: value.tutorialDone === true,
  };
}

export function saveTalkPreferences(preferences: TalkPreferences): void {
  // Ignore the retired vibration setting in old saves; keep the same key and
  // all supported music/sound/tutorial values. Game records are independent.
  const { soundOn, musicOn, tutorialDone } = preferences;
  pickStore.write(PICK_PREFERENCES_KEY, JSON.stringify({ soundOn, musicOn, tutorialDone }));
}
