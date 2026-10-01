import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const read = (file: string) => readFileSync(new URL("../" + file, import.meta.url), "utf8");

describe("neutral UI surfaces with original accents and gameplay", () => {
  it("keeps UI colors independent from the established game palette", () => {
    const css = read("src/ui/styles/tokens.css");
    for (const [name, color] of Object.entries({ background: "#ffffff", surface: "#f5f6f8", border: "#cdd2da", ink: "#363c46", muted: "#626b78" })) {
      expect(css).toContain(`--ui-${name}: ${color};`);
    }
    for (const value of ["--go: #22a03f;", "--slab: rgba(58, 15, 10, 0.22);", "--warm: #ffb500;", "--ring-ok: #16a34a;", "--ring-bad: #dc2626;", "--v1: #f238a0;", "--v9: #9a35e8;"]) {
      expect(css).toContain(value);
    }
  });

  it("uses paint-only overrides, with no card selectors or font/layout changes", () => {
    const css = read("src/ui/styles/neutralUi.css").replace(/\/\*[\s\S]*?\*\//g, "");
    const allowed = new Set(["color", "background", "border-color", "outline", "outline-color", "outline-offset", "box-shadow", "text-shadow"]);
    for (const [, property] of css.matchAll(/([\w-]+)\s*:[^;{}]+;/g)) {
      expect(allowed.has(property), property).toBe(true);
    }
    expect(css).not.toMatch(/display\s*:/);
    expect(css).not.toMatch(/\.picture-(?:board|tile)|\.memory-card|\.practice-tile|@keyframes|--(?:v\d|go|slab|ring|warm|paper)\s*:/);
  });

  it("keeps original accent styling instead of gray overrides", () => {
    const css = read("src/ui/styles/neutralUi.css").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(css).not.toMatch(/\.wood-btn|\.pick-intro-mark|\.pick-intro-body h2|\.result-primary|\.result-kicker|\.settings-title|\.memory-target-badge,|\.switch(?:\[|,|\s*\{)|\.switch-knob|\.progress-track i/);
    expect(css).toContain(".result-panel .text-btn { color: var(--hot-deep); background: none; }");
    expect(css).not.toContain(".is-new-best .result-best");
    expect(read("src/ui/styles/title.css")).toMatch(/\.studio-splash-screen\s*\{[^}]*background: #fccf00;/);
    expect(read("src/ui/styles/title.css")).toMatch(/\.mode-name\s*\{[^}]*color: var\(--cool\);/);
  });

  it("loads the neutral paint after the original screen/effect styles", () => {
    const source = read("src/main.ts");
    expect(source.indexOf('import "./ui/styles/neutralUi.css";')).toBeGreaterThan(source.indexOf('import { TalkApp }'));
    expect(source.indexOf('import "./ui/styles/neutralUi.css";')).toBeGreaterThan(source.indexOf('import "./ui/styles/storage.css";'));
    expect(read("index.html")).toContain('<meta name="theme-color" content="#ffffff" />');
  });

  it("preserves menu Settings, stage progress and the recovery action as accents", () => {
    const css = read("src/ui/styles/neutralUi.css").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(css).toMatch(/#btn-title-settings,\s*\.pause-card \.text-btn,\s*\.result-panel \.text-btn\s*\{\s*color: var\(--hot-deep\);/);
    expect(css).not.toContain(".montage-status");
    expect(read("src/ui/styles/talk.css")).toMatch(/\.montage-status\s*\{[^}]*color: var\(--hot\);/);
    expect(css).toMatch(/\.storage-notice button\s*\{\s*border-color: var\(--ui-border\); box-shadow: none;\s*\}/);
    expect(read("src/ui/styles/storage.css")).toMatch(/\.storage-notice button\s*\{\s*background: var\(--go\); color: white;/);
  });

  it("removes only logo CSS shadow and leaves artwork paths untouched", () => {
    const css = read("src/ui/styles/title.css");
    expect(css).toMatch(/\.brand-mark\s*\{[^}]*filter:\s*none;/);
    expect(css).not.toContain("drop-shadow(");
    expect(read("src/ui/styles/talk.css")).toContain("animation: montage-answer-glow 1.1s ease-in-out 3;");
    expect(read("src/ui/styles/pickExperience.css")).toContain("--pick-hit-glow-alpha: .16;");
  });
});
