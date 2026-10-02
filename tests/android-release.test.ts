import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const read = (file: string) => readFileSync(new URL('../' + file, import.meta.url), 'utf8');
const activity = read('android/app/src/main/java/io/github/junyyyong/taptotest/MainActivity.java');
const manifest = read('android/app/src/main/AndroidManifest.xml');

describe('Android release safeguards (source-level checks)', () => {
  it.each(['onCreate', 'onResume', 'onConfigurationChanged'])('reapplies app-only text zoom after %s super callback', name => {
    expect(activity).toMatch(new RegExp(`super\\.${name}\\([^)]*\\);\\s*applyGameTextZoom\\(\\);`));
  });
  it('uses fixed WebView text zoom without rewriting OS configuration', () => {
    expect(activity.match(/setTextZoom\(100\)/g)).toHaveLength(2);
    expect(activity).toContain('bridge.getWebView() == webView');
    expect(activity).not.toMatch(/\.fontScale\s*=|\.densityDpi\s*=|setInitialScale|updateConfiguration|Settings\.System|clearData|clearCache/);
    expect(manifest).toMatch(/configChanges="[^"]*fontScale/);
    expect(read('src/ui/styles/tokens.css')).toContain('-webkit-text-size-adjust: 100%');
  });
  it('preserves the app identity and existing private signing configuration', () => {
    const gradle = read('android/app/build.gradle');
    expect(gradle).toContain('applicationId "io.github.junyyyong.taptotest"');
    expect(gradle).toContain('signingConfig signingConfigs.release');
    expect(gradle).toContain('versionCode 8');
    expect(gradle).toContain('versionName "1.0.6"');
  });
  it('uses the supplied Tepee artwork and yellow background for both adaptive launcher masks', () => {
    for (const name of ['ic_launcher', 'ic_launcher_round']) {
      const xml = read(`android/app/src/main/res/mipmap-anydpi-v26/${name}.xml`);
      expect(xml).toContain('@mipmap/ic_launcher_foreground');
      expect(xml).toContain('@color/ic_launcher_background');
    }
    expect(read('android/app/src/main/res/values/ic_launcher_background.xml')).toContain('#FCCF00');
    const icons = JSON.parse(read('store/taptotest-icon-manifest.json'));
    expect(icons.original).toBe('assets/launcher/Tepee-icon-06.png');
    expect(icons.background).toBe('#fccf00');
    expect(icons.adaptiveDp).toEqual({ canvas: 108, content: 72, padding: 18 });
    const original = readFileSync(new URL('../' + icons.original, import.meta.url));
    expect(createHash('sha256').update(original).digest('hex')).toBe(icons.sourceSHA256);
    expect(icons.files).toHaveLength(16);
    for (const icon of icons.files) {
      const data = readFileSync(new URL('../' + icon.path, import.meta.url));
      expect(createHash('sha256').update(data).digest('hex')).toBe(icon.sha256);
      const scale = ({ mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 } as Record<string, number>)[icon.path.match(/mipmap-([^/]+)/)?.[1] ?? ''];
      const side = scale ? (icon.path.includes('foreground') ? 108 : 48) * scale : 512;
      expect(data.readUInt32BE(16)).toBe(side);
      expect(data.readUInt32BE(20)).toBe(side);
    }
  });
  it('measures real WebView overlap without replacing the framework inset handler', () => {
    expect(activity).toContain('ViewCompat.getRootWindowInsets(webView)');
    expect(activity).toContain('webView.getLocationInWindow(webLocation)');
    expect(activity).toContain('root.getLocationInWindow(rootLocation)');
    expect(activity).toContain('addOnGlobalLayoutListener(this::publishGameInsets)');
    expect(activity).toContain('public void onPageLoaded(WebView webView)');
    expect(activity).not.toContain('setOnApplyWindowInsetsListener');
    for (const side of ['top', 'right', 'bottom', 'left']) expect(activity).toContain(`--android-game-inset-${side}`);
  });
});
