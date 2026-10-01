// Capture the seven real screens in the user's reference, using the current
// production build. No app DOM, rules, image sources, or records are replaced.
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '../../..');
const out = path.resolve(root, process.env.SCREENSHOT_DIR || 'store/screenshots/2026-10-01');
const reportFile = process.env.SCREENSHOT_REPORT
  ? path.resolve(root, process.env.SCREENSHOT_REPORT) : path.join(__dirname, 'verification.json');
const report = { capturedAt: new Date().toISOString(), resolution: [780, 1688], nativeDeviceTested: false,
  captureMethod: 'Chrome Android-platform simulation with real UI/taps; virtual clock for timeout only',
  safeInsetsCss: { top: 24, bottom: 48 }, screenshots: [], errors: [] };
async function settle(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].filter(i => i.getClientRects().length).map(i => i.decode().catch(() => {})));
  });
  await page.waitForTimeout(160);
}
async function capture(page, file, description) {
  await settle(page);
  const visibleImages = await page.evaluate(() => [...document.images]
    .filter(i => i.getClientRects().length && getComputedStyle(i).visibility !== 'hidden')
    .map(i => ({ source: i.getAttribute('src'), loaded: i.complete && i.naturalWidth > 0 })));
  assert.ok(visibleImages.every(i => i.loaded), 'Visible images must decode before capture');
  await page.screenshot({ path: path.join(out, file), animations: 'disabled' });
  const data = fs.readFileSync(path.join(out, file));
  assert.equal(data.readUInt32BE(16), 780); assert.equal(data.readUInt32BE(20), 1688);
  report.screenshots.push({ file, description, visibleImages });
  console.log('Captured ' + file);
}
async function enter(page, mode) {
  await page.locator('#mode-' + mode).tap();
  await page.locator('#btn-mode-intro-start').tap();
  await settle(page);
}
async function main() {
  assert.ok(!fs.existsSync(out), 'Do not overwrite earlier captures');
  fs.mkdirSync(out, { recursive: true });
  const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp',
    '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.webm': 'video/webm' };
  const dist = path.join(root, 'dist');
  const server = http.createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, 'http://local').pathname);
    const file = path.resolve(dist, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(dist + '/') || !fs.existsSync(file) || !fs.statSync(file).isFile()) return res.writeHead(404).end();
    res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
    fs.createReadStream(file).pipe(res);
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  let browser;
  try {
    browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--mute-audio'] });
    report.browser = browser.version();
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await context.addInitScript(() => {
      window.CapacitorCustomPlatform = { name: 'android' };
      const prefs = JSON.stringify({ musicOn: false, soundOn: false, hapticsOn: false });
      localStorage.setItem('taptopick.preferences.v1', prefs);
      localStorage.setItem('CapacitorStorage.taptopick.preferences.v1', prefs);
      document.addEventListener('DOMContentLoaded', () => {
        document.documentElement.style.setProperty('--android-game-inset-top', '24px');
        document.documentElement.style.setProperty('--android-game-inset-bottom', '48px');
      }, { once: true });
      let seed = 930; Math.random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
    });
    const page = await context.newPage(); page.setDefaultTimeout(20000);
    page.on('pageerror', e => report.errors.push(e.message));
    await page.goto('http://127.0.0.1:' + server.address().port);
    await page.locator('#screen-splash').waitFor({ state: 'visible' });
    await capture(page, '01-cover.png', '커버');
    await page.locator('#mode-unit').waitFor({ state: 'visible' });
    await capture(page, '02-main.png', '메인 게임 선택');
    await page.locator('#mode-unit').tap();
    await capture(page, '03-puzzle-start.png', 'PUZZLE 시작');
    await page.locator('#btn-mode-intro-start').tap();
    for (let attempts = 0; attempts < 16; attempts++) {
      await settle(page);
      if ((await page.locator('.unit-reveal-base').getAttribute('src')).split('/').pop().startsWith('HapeeCarrot-')) break;
      await page.locator('#btn-back').tap(); await enter(page, 'unit');
    }
    assert.match(await page.locator('.unit-reveal-base').getAttribute('src'), /HapeeCarrot-/);
    assert.equal(await page.locator('#picture-board button').count(), 49);
    await capture(page, '04-puzzle-play.png', 'PUZZLE 해피 당근 9조각');
    await page.locator('#btn-back').tap(); await page.locator('#mode-montage').tap();
    await capture(page, '05-portrait-start.png', 'PORTRAIT 시작');
    await page.locator('#btn-mode-intro-start').tap();
    for (let attempts = 0; attempts < 7; attempts++) {
      await settle(page);
      if ((await page.locator('#target-character-name').textContent()).includes('PinoPan')) break;
      await page.locator('#btn-back').tap(); await enter(page, 'montage');
    }
    assert.match(await page.locator('#target-character-name').textContent(), /PinoPan/);
    assert.equal(await page.locator('#picture-board button').count(), 4);
    await capture(page, '06-portrait-play.png', 'PORTRAIT 피노팬 2×2');
    await page.locator('#btn-back').tap();
    // Execute the genuine one-minute timeout quickly, without setting game state.
    await page.clock.install(); await enter(page, 'memory');
    await page.clock.runFor(3300);
    await page.clock.fastForward(61000);
    await page.locator('#cheer').waitFor({ state: 'visible' });
    await page.clock.resume();
    await page.waitForFunction(() => {
      const video = document.querySelector('#cheer-clip');
      return video.readyState >= 2 && video.currentTime >= .3;
    });
    assert.equal(await page.locator('#cheer-word').textContent(), 'TRY AGAIN');
    assert.match(await page.locator('#cheer-clip').getAttribute('src'), /notbad-/);
    report.timeoutVideoTime = await page.locator('#cheer-clip').evaluate(v => v.currentTime);
    await capture(page, '07-position-try-again.png', 'POSITION 2×2 시간초과 TRY AGAIN 영상');
    assert.deepEqual(report.errors, []); assert.equal(report.screenshots.length, 7);
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
    console.log('PASS: seven 780×1688 PNGs; real timeout; no JavaScript errors');
  } finally {
    if (browser) await browser.close(); await new Promise(resolve => server.close(resolve));
  }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
