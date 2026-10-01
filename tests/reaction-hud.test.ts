import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = (file: string) => readFileSync(new URL("../src/ui/styles/" + file, import.meta.url), "utf8");

describe("full-window reaction paint and shared HUD rail", () => {
  it("extends only the decorative backdrop through native safe insets", () => {
    const source = css("overlay.css");
    const paint = source.match(/\.cheer::before\s*\{([^}]+)\}/)?.[1];
    expect(paint).toContain("pointer-events: none;");
    expect(paint).toContain("z-index: -1;");
    expect(paint).toContain("background: rgba(0, 0, 0, 0.68);");
    for (const side of ["top", "right", "bottom", "left"]) {
      expect(source).toContain(`calc(-1 * var(--frame-safe-${side}, 0px))`);
    }
    expect(source.match(/\.cheer\s*\{([^}]+)\}/)?.[1]).toContain("inset: 0;");
  });

  it("keeps the original dimming animation on the backdrop rather than the content", () => {
    const source = css("overlay.css");
    expect(source).toMatch(/\.cheer-run::before\s*\{\s*animation: cheer-dim 260ms ease both;/);
    expect(source).not.toMatch(/\.cheer-run\s*\{/);
    expect(source).toContain("object-fit: contain;");
  });

  it("uses one rail for intro, gameplay and settings, with mirrored end buttons", () => {
    const source = css("talk.css");
    expect(source).toMatch(/\.pick-intro-screen > \.hud,\s*\.pick-screen > \.hud,\s*\.settings-screen > \.hud\s*\{/);
    expect(source).toContain("--hud-left: max(10px, var(--app-safe-left));");
    expect(source).toContain("--hud-right: max(10px, var(--app-safe-right));");
    expect(source).toContain("justify-self: start;");
    expect(source).toContain("justify-self: end;");
    expect(css("nativeResponsive.css")).not.toContain(".hud");
  });
});
