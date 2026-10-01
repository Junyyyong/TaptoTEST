import { describe, expect, it } from "vitest";
import { availableBoardSide } from "../src/ui/pickLayout";
import { readFileSync } from "node:fs";

const read = (file: string) => readFileSync(new URL("../" + file, import.meta.url), "utf8");

describe("picture board available-space layout", () => {
  it("treats native insets as authoritative, including an explicit zero", () => {
    const css = read("src/ui/styles/tokens.css");
    for (const side of ["top", "right", "bottom", "left"]) {
      expect(css).toContain(`--app-safe-${side}: var(--safe-area-inset-${side}, env(safe-area-inset-${side}, 0px));`);
    }
  });
  it("uses the measured bottom and board top, not a fixed HUD allowance", () => {
    expect(availableBoardSide(836, 415, 0)).toBe(421);
    expect(availableBoardSide(796, 439, 0)).toBe(357);
  });
  it("reserves the actual stage-label height and gap", () => {
    expect(availableBoardSide(796, 439, 23)).toBe(334);
    expect(availableBoardSide(796, 439, 39)).toBe(318);
  });
  it("rounds down and allows a scroll fallback for exhausted space", () => {
    expect(availableBoardSide(640.5, 330.2, 21)).toBe(289);
    expect(availableBoardSide(300, 330, 21)).toBe(0);
  });
  it("preserves the approved system font, selective Noto and menu typography", () => {
    expect(read("src/ui/styles/tokens.css")).toContain('font-family: "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", system-ui, sans-serif;');
    expect(read("src/ui/styles/title.css")).toMatch(/\.mode-name\s*\{\s*font-size: 21px;\s*font-weight: 800;/);
    expect(read("src/ui/styles/title.css")).toMatch(/\.mode-desc\s*\{\s*font-size: 13px;\s*font-weight: 700;/);
    expect(read("src/ui/styles/talk.css")).toMatch(/\.target-character-name\s*\{[^}]*font-family: "TAP Serif KR", serif;[^}]*font-weight: 800;/);
    expect(read("src/ui/styles/pickExperience.css")).toContain('800 clamp(40px,calc(12 * var(--layout-vw, 1vw)),62px)/1.2 "TAP Sans KR"');
  });
});
