// Measure visible artwork, not just the <img> box. TALK is served read-only.
// Run baseline before editing, then after against the rebuilt TEST app.
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const assert = require('node:assert/strict'), crypto = require('node:crypto');
const { chromium } = require('playwright'), sharp = require('sharp');
const root = path.resolve(__dirname, '../..');
const talk = '/Users/scdi/Documents/ChatGPT/TAPtoTALK';
const out = path.join(root, 'docs/research/2026-10-02-main-logo');
const phase = process.env.LOGO_PHASE || 'after';
const profiles = [
  { id: 'mobile', width: 390, height: 844, top: 24, bottom: 48 },
  { id: 'short-mobile', width: 390, height: 650, top: 24, bottom: 48 },
  { id: 'small-mobile', width: 320, height: 568, top: 24, bottom: 48 },
  { id: 'tablet', width: 768, height: 1024, top: 24, bottom: 48 },
  { id: 'wide-tablet', width: 1024, height: 768, top: 24, bottom: 48 },
];
const servers = [];
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
async function artwork(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let left = info.width, top = info.height, right = -1, bottom = -1;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    if (data[(y * info.width + x) * 4 + 3] > 16) {
      left = Math.min(left, x); top = Math.min(top, y);
      right = Math.max(right, x); bottom = Math.max(bottom, y);
    }
  }
  return { width: info.width, height: info.height, left, top,
    visibleWidth: right - left + 1, visibleHeight: bottom - top + 1, sha256: hash(file) };
}
async function serve(dir) {
  const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.webp': 'image/webp',
    '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.webm': 'video/webm' };
  const server = http.createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, 'http://local').pathname);
    const file = path.resolve(dir, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(dir + '/') || !fs.existsSync(file) || !fs.statSync(file).isFile()) return res.writeHead(404).end();
    res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
    fs.createReadStream(file).pipe(res);
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  servers.push(server); return `http://127.0.0.1:${server.address().port}`;
}
async function measure(page, bounds) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await document.querySelector('.brand-mark').decode();
  });
  await page.waitForTimeout(220);
  return page.evaluate(bounds => {
    const rect = el => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; };
    const logo = rect(document.querySelector('.brand-mark')), frame = rect(document.querySelector('#app'));
    const boxes = {};
    for (const selector of ['.brand-block', '.mode-list', '.mode-btn', '.title-links', '.title-music-slot']) {
      boxes[selector] = [...document.querySelectorAll(selector)].map(rect);
    }
    const visibleWidth = logo.w * bounds.visibleWidth / bounds.width;
    return { logo, frame, boxes, visibleWidth, widthRatio: visibleWidth / frame.w,
      center: [logo.x + logo.w * (bounds.left + bounds.visibleWidth / 2) / bounds.width,
        logo.y + logo.h * (bounds.top + bounds.visibleHeight / 2) / bounds.height],
      source: document.querySelector('.brand-mark').getAttribute('src') };
  }, bounds);
}
async function main() {
  assert.ok(['baseline', 'after'].includes(phase));
  const reportFile = path.join(out, `${phase}.json`);
  assert.ok(!fs.existsSync(reportFile), 'Do not overwrite earlier captures');
  fs.mkdirSync(out, { recursive: true });
  // Check that the existing TALK build has its current logo and current sizing
  // rules. No reference builds, caches, or file writes are made in TALK.
  const talkLogo = path.join(talk, 'public/assets/brand/taptotalk-logo-0911.png');
  assert.equal(hash(talkLogo), hash(path.join(talk, 'dist/assets/brand/taptotalk-logo-0911.png')));
  const rules = css => [...css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/\.brand-(?:block|mark)\s*\{([^}]+)\}/g)]
    .map(m => m[0].replace(/\s/g, '').replace(/;}/g, '}'));
  const builtCss = fs.readdirSync(path.join(talk, 'dist/assets')).filter(f => f.endsWith('.css'))
    .map(f => fs.readFileSync(path.join(talk, 'dist/assets', f), 'utf8')).join('\n');
  const currentRules = rules(fs.readFileSync(path.join(talk, 'src/ui/styles/title.css'), 'utf8'));
  const builtRules = rules(builtCss);
  for (const rule of currentRules) assert.ok(builtRules.includes(rule), 'TALK build must match current source logo rules');
  const assets = { test: await artwork(path.join(root, 'public/assets/brand/TAPtoPICK-logo-0911-01-v2.webp')),
    talk: await artwork(talkLogo) };
  const urls = { test: await serve(path.join(root, 'dist')), talk: await serve(path.join(talk, 'dist')) };
  const report = { phase, capturedAt: new Date().toISOString(), assets,
    referenceReadOnly: true, physicalDeviceTested: false, measurements: [], errors: [] };
  const baseline = phase === 'after' ? JSON.parse(fs.readFileSync(path.join(out, 'baseline.json'), 'utf8')) : null;
  if (baseline) assert.deepEqual(assets, baseline.assets, 'Keep both original logo files unchanged');
  let browser;
  try {
    browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      headless: true, args: ['--mute-audio'] });
    for (const native of [false, true]) {
      const pages = {};
      for (const app of ['test', 'talk']) {
        const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
        await context.addInitScript(({ native, app }) => {
          if (native) window.CapacitorCustomPlatform = { name: 'android' };
          const prefs = JSON.stringify({ musicOn: false, soundOn: false, hapticsOn: false });
          const key = app === 'test' ? 'taptopick.preferences.v1' : 'taptotalk.preferences.v1';
          localStorage.setItem(key, prefs); localStorage.setItem('CapacitorStorage.' + key, prefs);
          document.addEventListener('DOMContentLoaded', () => {
            if (!native) return;
            document.documentElement.style.setProperty('--android-game-inset-top', '24px');
            document.documentElement.style.setProperty('--android-game-inset-bottom', '48px');
          }, { once: true });
        }, { native, app });
        pages[app] = await context.newPage();
        pages[app].on('pageerror', e => report.errors.push(`${app}: ${e.message}`));
        await pages[app].goto(urls[app]);
      }
      await Promise.all(['test', 'talk'].map(app => pages[app].locator(app === 'test' ? '#mode-unit' : '#mode-alphabet').waitFor({ state: 'visible' })));
      for (const profile of profiles) {
        const key = `${native ? 'android' : 'web'}/${profile.id}`;
        const values = {};
        for (const app of ['test', 'talk']) {
          await pages[app].setViewportSize({ width: profile.width, height: profile.height });
          values[app] = await measure(pages[app], assets[app]);
        }
        if (baseline) {
          assert.ok(Math.abs(values.test.visibleWidth - values.talk.visibleWidth) < .6, `${key}: match visible artwork width`);
          const before = baseline.measurements.find(m => m.key === key).test;
          for (const [selector, boxes] of Object.entries(before.boxes)) for (let i = 0; i < boxes.length; i++) {
            for (const prop of ['x', 'y', 'w', 'h']) assert.ok(Math.abs(boxes[i][prop] - values.test.boxes[selector][i][prop]) < .6,
              `${key}: ${selector} ${prop} must not move`);
          }
          for (let i = 0; i < 2; i++) assert.ok(Math.abs(before.center[i] - values.test.center[i]) < .6,
            `${key}: retain logo centre: ${before.center} vs ${values.test.center}`);
          assert.equal(new URL(values.test.source).pathname, new URL(before.source).pathname);
          assert.ok(Math.abs(values.test.logo.w / values.test.logo.h - assets.test.width / assets.test.height) < .001, `${key}: retain original ratio`);
        }
        report.measurements.push({ key, ...values });
        if (native && profile.id === 'mobile') {
          await pages.test.screenshot({ path: path.join(out, `${phase}-mobile.png`), animations: 'disabled' });
          if (phase === 'baseline') await pages.talk.screenshot({ path: path.join(out, 'reference-talk-mobile.png'), animations: 'disabled' });
        }
        console.log(`${key}: TEST ${values.test.visibleWidth.toFixed(2)}px / TALK ${values.talk.visibleWidth.toFixed(2)}px`);
      }
      await Promise.all(Object.values(pages).map(page => page.context().close()));
    }
    assert.deepEqual(report.errors, []);
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
    console.log(`PASS: ${phase}; ${report.measurements.length} mobile/tablet profiles`);
  } finally {
    if (browser) await browser.close();
    await Promise.all(servers.map(server => new Promise(resolve => server.close(resolve))));
  }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
