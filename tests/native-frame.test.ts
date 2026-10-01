import { describe, expect, it } from "vitest";
import { fitNativeFrame, NATIVE_FRAME } from "../src/ui/nativeFrame";
import { readFileSync } from "node:fs";

const zero = { top: 0, right: 0, bottom: 0, left: 0 };
const read = (file: string) => readFileSync(new URL("../" + file, import.meta.url), "utf8");
describe("Android density-independent responsive canvas", () => {
  it("keeps the reference composition unchanged when it fits exactly", () => {
    expect(fitNativeFrame(390, 844, zero)).toEqual({ scale: 1, x: 0, y: 0, width: 390, height: 844, insets: zero });
  });

  it.each([[360, 900], [360, 640], [800, 1280], [768, 1024], [1024, 768]])(
    "fills the whole usable %s×%s window, without fixed-aspect bands",
    (width, height) => {
      const fit = fitNativeFrame(width, height, { ...zero, top: 24, bottom: 48 });
      expect(fit.x).toBe(0);
      expect(fit.y).toBe(24);
      expect(fit.width * fit.scale).toBeCloseTo(width);
      expect(fit.height * fit.scale).toBeCloseTo(height - 72);
      expect(fit.width).toBeGreaterThanOrEqual(NATIVE_FRAME.width - .000001);
      expect(fit.height).toBeGreaterThanOrEqual(NATIVE_FRAME.minHeight - .000001);
      expect((fit.height + fit.insets.top + fit.insets.bottom) * fit.scale).toBeCloseTo(height);
    },
  );

  it("adapts logical aspect ratio to the device, not to the display-size setting", () => {
    for (const [physicalWidth, physicalHeight] of [[1080, 2400], [1080, 1920], [1600, 2560], [1536, 2048]]) {
      const samples = [2, 2.4, 3, 3.6, 4].map(density => {
        const fit = fitNativeFrame(physicalWidth! / density, physicalHeight! / density, {
          top: 72 / density, bottom: 144 / density, left: 0, right: 0,
        });
        return [fit.width, fit.height, fit.scale * density, fit.x * density, fit.y * density, fit.insets.top, fit.insets.bottom];
      });
      for (const sample of samples) sample.forEach((value, i) => expect(value).toBeCloseTo(samples[0]![i]!));
    }
    expect(fitNativeFrame(360, 900, zero).height).toBeGreaterThan(844);
    expect(fitNativeFrame(800, 1280, zero).width).toBeGreaterThan(390);
  });

  it("handles landscape, asymmetric cutouts and invalid dimensions without stretching", () => {
    const fit = fitNativeFrame(844, 390, { top: 0, right: 50, bottom: 0, left: 20 });
    expect(fit.x).toBe(20);
    expect(fit.y).toBe(0);
    expect(fit.x + fit.width * fit.scale).toBeCloseTo(794);
    expect(fit.height * fit.scale).toBeCloseTo(390);
    for (const empty of [fitNativeFrame(NaN, -1, zero), fitNativeFrame(30, 60, { ...zero, bottom: 100 })]) {
      expect(empty.scale).toBe(0);
      expect(empty.width).toBe(0);
      expect(empty.height).toBe(0);
      expect(Object.values(empty.insets).every(Number.isFinite)).toBe(true);
    }
  });

  it("fits the original cover to full width, centred without stretching or side cropping", () => {
    const css = read("src/ui/styles/title.css");
    expect(css).toMatch(/\.splash-cover\s*\{[^}]*top: 50%;[^}]*left: 0;[^}]*width: 100%;[^}]*height: auto;[^}]*transform: translateY\(-50%\);[^}]*object-fit: contain;/);
    expect(css).toContain("height: var(--frame-full-height, 100%);");
    expect(css).toContain("background: #fccf00;");
    const canvas = read("src/ui/styles/tokens.css");
    expect(canvas).toContain("width: var(--frame-width, 390px);");
    expect(canvas).toContain("height: var(--frame-height, 844px);");
  });
});
