import { describe, expect, it } from "vitest";
import { fitNativeFrame, NATIVE_FRAME } from "../src/ui/nativeFrame";

const zero = { top: 0, right: 0, bottom: 0, left: 0 };
describe("Android proportional design canvas", () => {
  it("keeps the approved canvas unchanged when it fits exactly", () => {
    expect(fitNativeFrame(390, 844, zero)).toEqual({ scale: 1, x: 0, y: 0 });
  });
  it("leaves both system bars outside the canvas", () => {
    const safe = { ...zero, top: 24, bottom: 48 };
    const fit = fitNativeFrame(360, 780, safe);
    expect(fit.scale).toBeCloseTo(708 / 844);
    expect(fit.y).toBeCloseTo(24);
    expect(fit.y + NATIVE_FRAME.height * fit.scale).toBeCloseTo(732);
    expect(fit.x).toBeGreaterThan(0);
  });
  it("produces identical physical geometry across display-density changes", () => {
    const physical = [];
    for (const density of [2, 2.5, 3, 3.5, 4]) {
      const fit = fitNativeFrame(1080 / density, 2340 / density, {
        top: 72 / density, bottom: 144 / density, left: 0, right: 0,
      });
      physical.push([fit.scale * density, fit.x * density, fit.y * density]);
    }
    for (const geometry of physical) geometry.forEach((value, i) => expect(value).toBeCloseTo(physical[0]![i]!));
  });
  it("handles landscape, asymmetric cutouts and invalid dimensions without stretching", () => {
    const fit = fitNativeFrame(844, 390, { top: 0, right: 50, bottom: 0, left: 20 });
    expect(fit.scale).toBeCloseTo(390 / 844);
    expect(fit.x).toBeGreaterThan(20);
    expect(fit.x + 390 * fit.scale).toBeLessThan(794);
    expect(fitNativeFrame(NaN, -1, zero).scale).toBe(0);
  });
});
