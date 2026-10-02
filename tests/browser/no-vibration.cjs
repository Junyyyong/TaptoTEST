// Real Settings and game taps; spy requests, not physical motor behavior.
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const assert = require('node:assert/strict'), { chromium } = require('playwright');
const root = path.resolve(__dirname, '../..'), dist = path.join(root, 'dist');
const out = path.resolve(root, process.env.VIBRATION_OUTPUT_DIR || 'docs/research/2026-10-02-no-vibration');
const phase = process.env.VIBRATION_PHASE || 'after';
async function main() {
  assert.ok(['baseline', 'after'].includes(phase));
  const reportFile = path.join(out, phase + '.json');
  assert.ok(!fs.existsSync(reportFile), 'Do not overwrite earlier captures');
  fs.mkdirSync(out, { recursive: true });
  const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.webp': 'image/webp',
    '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.webm': 'video/webm' };
  const server = http.createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, 'http://local').pathname);
    const file = path.resolve(dist, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(dist + '/') || !fs.existsSync(file) || !fs.statSync(file).isFile()) return res.writeHead(404).end();
    res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
    fs.createReadStream(file).pipe(res);
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const report = { phase, physicalDeviceTested: false, resolution: [780, 1688], errors: [], checks: [] };
  let browser;
  try {
    browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      headless: true, args: ['--mute-audio', '--autoplay-policy=no-user-gesture-required'] });
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await context.addInitScript(() => {
      window.CapacitorCustomPlatform = { name: 'android' };
      const legacy = JSON.stringify({ musicOn: false, soundOn: true, hapticsOn: true, tutorialDone: true });
      for (const prefix of ['', 'CapacitorStorage.']) {
        const key = prefix + 'taptopick.preferences.v1';
        if (localStorage.getItem(key) === null) localStorage.setItem(key, legacy);
      }
      window.__feedbackSpy = { notes: 0, vibrations: [] };
      navigator.vibrate = pattern => { window.__feedbackSpy.vibrations.push(pattern); return true; };
      const create = AudioContext.prototype.createOscillator;
      AudioContext.prototype.createOscillator = function () { window.__feedbackSpy.notes++; return create.call(this); };
      document.addEventListener('DOMContentLoaded', () => {
        document.documentElement.style.setProperty('--android-game-inset-top', '24px');
        document.documentElement.style.setProperty('--android-game-inset-bottom', '48px');
      }, { once: true });
    });
    const page = await context.newPage();
    page.on('pageerror', e => report.errors.push(e.message));
    await page.goto('http://127.0.0.1:' + server.address().port);
    await page.locator('#mode-unit').waitFor({ state: 'visible' });
    await page.locator('#btn-title-settings').tap();
    await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(180);
    const labels = await page.locator('#settings-body [role="switch"]').evaluateAll(buttons => buttons.map(b => b.getAttribute('aria-label')));
    assert.deepEqual(labels, phase === 'baseline' ? ['Music', 'Sound', 'Vibration'] : ['Music', 'Sound']);
    report.checks.push({ settingsLabels: labels });
    await page.screenshot({ path: path.join(out, phase + '-settings.png'), animations: 'disabled' });
    if (phase === 'after') {
      assert.equal(await page.locator('#settings-note').count(), 0);
      for (const setting of ['music', 'sound']) {
        const toggle = page.locator(`[data-setting="${setting}"]`);
        const original = await toggle.getAttribute('aria-checked');
        await toggle.tap(); assert.notEqual(await toggle.getAttribute('aria-checked'), original);
        await toggle.tap(); assert.equal(await toggle.getAttribute('aria-checked'), original);
      }
      await page.reload(); await page.locator('#mode-unit').waitFor({ state: 'visible' });
      await page.locator('#btn-title-settings').tap();
      assert.equal(await page.locator('[data-setting="music"]').getAttribute('aria-checked'), 'false');
      assert.equal(await page.locator('[data-setting="sound"]').getAttribute('aria-checked'), 'true');
      const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('CapacitorStorage.taptopick.preferences.v1')));
      assert.equal(saved.tutorialDone, true); assert.ok(!('hapticsOn' in saved));
      report.checks.push({ savedPreferences: saved });
      await page.locator('#btn-settings-back').tap();
      for (const mode of ['unit', 'montage', 'memory']) {
        await page.locator('#mode-' + mode).tap(); await page.locator('#btn-mode-intro-start').tap();
        if (mode === 'memory') await page.waitForTimeout(3300);
        await page.locator('#picture-board button').nth(0).tap();
        await page.locator('#picture-board button').nth(1).tap();
        report.checks.push({ mode, spy: await page.evaluate(() => window.__feedbackSpy) });
        await page.locator('#btn-back').tap();
      }
      report.feedback = await page.evaluate(() => window.__feedbackSpy);
      assert.deepEqual(report.feedback.vibrations, []); assert.ok(report.feedback.notes > 0, 'Sound still works');
    }
    assert.deepEqual(report.errors, []);
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
    console.log(`PASS: ${phase}; ${labels.join(', ')}; no errors`);
    if (report.feedback) console.log(JSON.stringify(report.feedback));
  } finally {
    if (browser) await browser.close(); await new Promise(resolve => server.close(resolve));
  }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
