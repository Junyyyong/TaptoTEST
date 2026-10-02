import { afterEach, expect, it, vi } from "vitest";
import { Feedback } from "./feedback";

afterEach(() => vi.unstubAllGlobals());

function fixture() {
  const vibrate = vi.fn();
  const oscillator = vi.fn(() => ({
    frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
    connect: vi.fn(), start: vi.fn(), stop: vi.fn(), type: "sine",
  }));
  class AudioContext {
    state = "running"; currentTime = 0; destination = {};
    createOscillator = oscillator;
    createGain() {
      return { gain: { value: 0, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, connect: vi.fn() };
    }
  }
  vi.stubGlobal("window", { AudioContext });
  vi.stubGlobal("navigator", { vibrate });
  const feedback = new Feedback();
  return { feedback, vibrate, oscillator };
}

it("never vibrates for taps, correct/wrong picks, items, completion or failure", () => {
  const { feedback, vibrate, oscillator } = fixture();
  feedback.unlock();
  // Even unused legacy callers cannot re-enable device vibration.
  feedback.setHaptics(true);
  feedback.pick(1); feedback.clear(2); feedback.clear(4); feedback.reject();
  feedback.resetCombo(); feedback.correct(1); feedback.correct(5);
  feedback.tap(); feedback.item(); feedback.complete(); feedback.fail();
  expect(vibrate).not.toHaveBeenCalled();
  expect(oscillator.mock.calls.length).toBeGreaterThan(10);
});

it("retains sound on/off behavior without requesting vibration", () => {
  const { feedback, vibrate, oscillator } = fixture();
  feedback.unlock(); feedback.setSound(false);
  feedback.tap(); feedback.correct(1); feedback.reject(); feedback.complete(); feedback.fail();
  expect(oscillator).not.toHaveBeenCalled();
  feedback.setSound(true); feedback.tap();
  expect(oscillator).toHaveBeenCalledOnce();
  expect(vibrate).not.toHaveBeenCalled();
});
