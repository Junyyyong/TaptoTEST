import { readFileSync, existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
const read = (file: string) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");

describe("TAPtoTEST policy and packaging", () => {
  it.each(["english", "korean"])("has the verified contact and app identity in %s", language => {
    const section=read("public/privacy.html").match(new RegExp(`<section id="${language}"[^>]*>([\\s\\S]*?)</section>`))![1]!;
    expect(section).toContain("TAPtoTEST");expect(section).toContain("TapeeTepee openstudio");
    expect(section.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g)).toEqual(["wnsdydtml@gmail.com","wnsdydtml@gmail.com"]);
    expect(section).toContain("Preferences");expect(section).toContain("localStorage");
  });
  it("bundles local documents without scripts, remote resources or unnecessary permissions",()=>{
    for(const file of ["public/privacy.html","public/licenses.html"]) {
      const html=read(file);expect(html).not.toMatch(/<script|(?:src|href)=["']https?:\/\//i);
      expect(html).toContain('./legal/legal.css');
    }
    expect(read("index.html")).toContain('sandbox="allow-same-origin"');
    expect(read("android/app/src/main/AndroidManifest.xml").match(/<uses-permission[^>]+/g)).toEqual(['<uses-permission android:name="android.permission.INTERNET" /']);
  });
  it("includes notices for both bundled fonts and actual Capacitor packages",()=>{
    const html=read("public/licenses.html");
    for(const text of ["Noto Sans KR","Noto Serif KR","2017-2024 Adobe","@capacitor/preferences 8.0.1","@capacitor/core 8.5.0","Apache Cordova 14.0.1","TAPtoTEST"])expect(html).toContain(text);
    const inventory=JSON.parse(read("public/legal/dependencies.json"));
    expect(inventory.length).toBeGreaterThan(0);
    expect(inventory.every((item:{license:string})=>item.license==="Apache-2.0")).toBe(true);
  });
  it("uses the approved Android identity consistently without renaming save keys",()=>{
    const id="io.github.junyyyong.taptotest";
    for(const file of ["capacitor.config.ts","android/app/build.gradle","android/app/src/main/res/values/strings.xml","android/app/src/main/java/io/github/junyyyong/taptotest/MainActivity.java"]) {
      expect(read(file)).toContain(id);expect(read(file)).not.toContain("io.github.junyyyong.taptopick");
    }
    expect(existsSync(new URL("../android/app/src/main/java/io/github/junyyyong/taptopick/MainActivity.java",import.meta.url))).toBe(false);
    expect(read("src/ui/pickStorage.ts")).toContain('"taptopick.records.v1"');
    expect(read("src/ui/pickStorage.ts")).toContain('"taptopick.preferences.v1"');
  });
});
