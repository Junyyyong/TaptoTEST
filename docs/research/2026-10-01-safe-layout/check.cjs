// Same delivered game/design, with measured layout only. No native-device claim.
// BASELINE_WEB is base/assets/public extracted from the preserved code2 AAB.
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { chromium } = require('playwright');
const sharp = require('sharp');
const root = path.resolve(__dirname, '../../..');
const out = path.resolve(process.env.CAPTURE_OUT || path.join(__dirname, 'screenshots'));
const baseline = process.env.BASELINE_WEB;
const report = { baseline: 'Delivered 1.0.1/code2, HEAD 783968f plus prior icon/textZoom changes', viewport: '390×844 DPR2; 780×1688 PNG', nativeDeviceTested: false, safeAreaSimulation: 'CDP env() and Capacitor variables: top24/bottom48; illustrative, not a measured phone', fonts: {}, captures: [], layout: [], errors: [], comparisons: [] };
const servers = [];
const hash = data => createHash('sha256').update(data).digest('hex');
async function serve(dir) {
  const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.webm': 'video/webm', '.mp4': 'video/mp4', '.mp3': 'audio/mpeg' };
  const s = http.createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, 'http://local').pathname);
    const file = path.resolve(dir, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(dir + '/') || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404).end(); return; }
    res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
    fs.createReadStream(file).pipe(res);
  });
  await new Promise(r => s.listen(0, '127.0.0.1', r)); servers.push(s);
  return `http://127.0.0.1:${s.address().port}`;
}
async function settle(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].filter(i => i.getBoundingClientRect().width).map(i => i.decode().catch(() => {})));
  });
  await page.waitForTimeout(100);
}
async function shot(page, name) {
  await settle(page);
  const file = path.join(out, name + '.png');
  await page.screenshot({ path: file, animations: 'disabled' });
  const m = await sharp(file).metadata(); assert.equal(m.width, 780); assert.equal(m.height, 1688);
  report.captures.push({ file: path.basename(file), sha256: hash(fs.readFileSync(file)) });
}
async function font(page, cdp, selector) {
  await page.evaluate(() => document.fonts.ready);
  const { root: doc } = await cdp.send('DOM.getDocument');
  const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: doc.nodeId, selector });
  const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId });
  const style = await page.locator(selector).first().evaluate(el => {
    const s = getComputedStyle(el);
    return { family: s.fontFamily, size: s.fontSize, weight: s.fontWeight, line: s.lineHeight };
  });
  return { ...style, actual: fonts.map(f => ({ family: f.familyName, custom: f.isCustomFont })) };
}
async function main() {
  assert.ok(baseline); assert.ok(!fs.existsSync(out), 'Never overwrite captures'); fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--mute-audio'] });
  report.browser = browser.version();
  try {
    for (const phase of ['before', 'after']) {
      console.log(phase + ': capturing delivered UI and actual play');
      const url = await serve(phase === 'before' ? baseline : path.join(root, 'dist'));
      const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'en-US', timezoneId: 'Asia/Seoul' });
      await context.addInitScript(() => {
        localStorage.setItem('taptopick.preferences.v1', JSON.stringify({ musicOn: false, soundOn: false, hapticsOn: false }));
        let seed = 930; Math.random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
      });
      const page = await context.newPage(); page.setDefaultTimeout(12000);
      page.on('pageerror', e => report.errors.push(phase + ': ' + e.message));
      await page.goto(url); await shot(page, phase + '-studio');
      await page.locator('#screen-splash').waitFor({ state: 'visible' }); await shot(page, phase + '-cover');
      await page.locator('#mode-unit').waitFor({ state: 'visible' }); await settle(page);
      const cdp = await context.newCDPSession(page); await cdp.send('DOM.enable'); await cdp.send('CSS.enable');
      report.fonts[phase] = {};
      async function fonts(selectors) { for (const s of selectors) report.fonts[phase][s] = await font(page, cdp, s); }
      async function inset(on, variablesOnly = false) {
        await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: on && !variablesOnly ? 24 : 0, bottom: on && !variablesOnly ? 48 : 0, left: 0, right: 0 } });
        await page.evaluate(on => {
          document.documentElement.style.setProperty('--safe-area-inset-top', on ? '24px' : '0px');
          document.documentElement.style.setProperty('--safe-area-inset-bottom', on ? '48px' : '0px');
        }, on); await settle(page);
      }
      async function board(label, safe = false) {
        const value = await page.evaluate(() => {
          const rect = s => { const b = document.querySelector(s).getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height, bottom: b.bottom }; };
          return { viewport: [innerWidth, innerHeight], board: rect('#picture-board'), preview: rect('#target-preview'), target: document.querySelector('.unit-reveal') ? rect('.unit-reveal') : null, stage: document.querySelector('#montage-status').classList.contains('hidden') ? null : rect('#montage-status'), count: document.querySelectorAll('#picture-board button').length, name: document.querySelector('#target-character-name').textContent, image: document.querySelector('.unit-reveal-base')?.getAttribute('src'), scroll: document.querySelector('#screen-game').scrollHeight };
        });
        report.layout.push({ phase, label, safe, ...value });
        if (phase === 'after') {
          assert.ok(value.board.bottom <= value.viewport[1] - (safe ? 48 : 0) + 1, label + ': board bottom');
          assert.ok(value.board.x >= 0 && value.board.x + value.board.w <= value.viewport[0] + 1, label + ': width');
          assert.ok(Math.abs(value.board.w - value.board.h) < 1, label + ': square');
          if (value.stage) assert.ok(value.stage.bottom <= value.viewport[1] - (safe ? 48 : 0) + 1, label + ': footer');
        }
        return value;
      }
      async function matrix(label) {
        if (phase !== 'after') return;
        for (const width of [375, 390, 412]) for (const height of [660, 700, 701, 844, 932]) {
          await page.setViewportSize({ width, height }); await inset(true); await board(label + '-matrix', true);
        }
        await page.setViewportSize({ width: 320, height: 568 }); await inset(true); await board(label + '-small', true);
        await page.setViewportSize({ width: 390, height: 844 }); await inset(false);
      }
      await shot(page, phase + '-menu'); await fonts(['#mode-unit .mode-name', '#mode-unit .mode-desc', '#btn-title-settings']);
      await inset(true); await shot(page, phase + '-menu-insets-sim'); await inset(false);
      await page.locator('#btn-title-settings').click(); await shot(page, phase + '-settings'); await fonts(['#settings-title', '.switch-text b', '.switch-text small', '.settings-legal-link']);
      await inset(true); await shot(page, phase + '-settings-insets-sim');
      for (const [button, name] of [['#btn-privacy', 'privacy'], ['#btn-licenses', 'licenses']]) {
        await page.locator(button).click(); await page.frameLocator('#legal-frame').locator('h1').first().waitFor();
        await shot(page, phase + '-' + name + '-insets-sim');
        if (phase === 'after') { const r = await page.locator('#legal-dialog').boundingBox(); assert.ok(r.y >= 24 && r.y + r.height <= 797); }
        await page.locator('#btn-legal-close').click();
      }
      await inset(false); await page.locator('#btn-settings-back').click();
      // Same original 9- and 12-piece puzzles, identified by the bundled preview filename.
      const wanted = new Set(['Ha', 'Tapee']);
      for (let round = 0; round < 16 && wanted.size; round++) {
        await page.locator('#mode-unit').click();
        if (round === 0) { await shot(page, phase + '-unit-start'); await fonts(['#mode-intro-title', '#mode-intro-note', '#btn-mode-intro-start']); }
        await page.locator('#btn-mode-intro-start').click(); await settle(page);
        const src = await page.locator('.unit-reveal-base').getAttribute('src');
        const found = ['Ha', 'Tapee'].find(n => new RegExp('/' + n + '-[^/]+\\.webp$').test(src));
        if (found && wanted.has(found)) {
          wanted.delete(found); await shot(page, phase + '-puzzle-' + found); await board('puzzle-' + found); await fonts(['#target-character-name', '#progress-label']);
          await inset(true); await shot(page, phase + '-puzzle-' + found + '-insets-sim'); await board('puzzle-' + found + '-insets', true);
          await matrix('puzzle-' + found); await inset(false);
          if (found === 'Ha') {
            await page.locator('#btn-pause').click(); await shot(page, phase + '-pause'); await fonts(['#help-title', '.pause-card p', '#btn-resume']); await page.locator('#btn-resume').click();
            for (const button of await page.locator('#picture-board button[aria-label="ha picture piece"]').all()) await button.click();
            await page.locator('#btn-cheer-continue').waitFor({ state: 'visible' }); await page.waitForTimeout(700); await inset(true); await shot(page, phase + '-puzzle-video-insets-sim'); await fonts(['#cheer-word']); await page.locator('#btn-cheer-continue').click();
            await shot(page, phase + '-puzzle-result-insets-sim'); await fonts(['#result-title', '.result-primary', '.result-unit', '.result-best strong', '#result-next-goal', '#btn-again']);
            await inset(false); await page.locator('#btn-result-menu').click(); continue;
          }
        }
        await page.locator('#btn-back').click();
      }
      assert.equal(wanted.size, 0);
      await page.locator('#mode-montage').click(); await shot(page, phase + '-portrait-start'); await page.locator('#btn-mode-intro-start').click();
      for (let found = 0; found < 18; found++) {
        // Wait for the actual next round, not a wall-clock estimate. The
        // promotion timer advances through rAF and may lag under capture load.
        await page.waitForFunction(() => !document.querySelector('#picture-board .is-found'));
        assert.equal(await page.locator('#picture-board button').count(), found < 3 ? 4 : found < 8 ? 9 : found < 13 ? 16 : 25);
        if ([0, 3, 8, 13].includes(found)) {
          await settle(page); const n = await page.locator('#picture-board button').count();
          await shot(page, phase + '-portrait-' + n); await board('portrait-' + n);
          await inset(true); await shot(page, phase + '-portrait-' + n + '-insets-sim'); await board('portrait-' + n + '-insets', true); await matrix('portrait-' + n); await inset(false);
        }
        const target = await page.locator('#target-preview img').getAttribute('src');
        const answer = await page.evaluate(() => [...document.querySelectorAll('#picture-board button img')].findIndex(i => i.src === document.querySelector('#target-preview img').src));
        await page.locator('#picture-board button').nth(answer).click();
        await page.waitForFunction(n => Number(document.querySelector('#progress-label').textContent.match(/(\d+) found/)?.[1]) === n, found + 1);
        if (found < 17) await page.waitForFunction(src => document.querySelector('#target-preview img').getAttribute('src') !== src, target);
      }
      await page.locator('#btn-cheer-continue').waitFor({ state: 'visible' }); await page.waitForTimeout(700); await inset(true); await shot(page, phase + '-portrait-video-insets-sim'); await page.locator('#btn-cheer-continue').click(); await shot(page, phase + '-portrait-result-insets-sim'); await inset(false); await page.locator('#btn-result-menu').click();
      await page.locator('#mode-memory').click(); await shot(page, phase + '-position-start'); await page.locator('#btn-mode-intro-start').click();
      for (const size of [2, 4, 6]) {
        await page.waitForFunction(n => document.querySelectorAll('#picture-board button').length === n, size * size); await shot(page, phase + '-position-' + size); await board('position-' + size);
        if (size === 2) await fonts(['#run-clock', '.memory-target-badge strong', '.memory-stage-label']);
        const groups = await page.evaluate(() => { const g = {}; [...document.querySelectorAll('#picture-board button img')].forEach((im, i) => (g[im.src] ||= []).push(i)); return Object.values(g); });
        await page.waitForFunction(() => !document.querySelector('#run-clock').textContent.startsWith('LOOK'));
        await inset(true); await shot(page, phase + '-position-' + size + '-hidden-insets-sim'); await board('position-' + size + '-insets', true); await matrix('position-' + size); await inset(false);
        if (size === 2) await fonts(['.memory-question-icon text']);
        for (const indices of groups) for (let i = 0; i < indices.length; i += 2) {
          await page.locator('#picture-board button').nth(indices[i]).click(); await page.locator('#picture-board button').nth(indices[i + 1]).click(); await page.waitForTimeout(120);
        }
      }
      await page.locator('#btn-cheer-continue').waitFor({ state: 'visible' }); await page.waitForTimeout(700); await inset(true); await shot(page, phase + '-position-video-insets-sim'); await page.locator('#btn-cheer-continue').click(); await shot(page, phase + '-position-result-insets-sim'); await inset(false);
      await page.locator('#btn-result-menu').click(); await page.locator('#mode-montage').click(); await page.locator('#btn-mode-intro-start').click();
      const wrong = await page.evaluate(() => [...document.querySelectorAll('#picture-board button img')].findIndex(i => i.src !== document.querySelector('#target-preview img').src));
      for (let i = 0; i < 5; i++) { await page.locator('#picture-board button').nth(wrong).click(); await page.waitForTimeout(380); }
      await page.locator('#btn-cheer-continue').waitFor({ state: 'visible' }); await page.waitForTimeout(700); await inset(true); await shot(page, phase + '-failure-video-insets-sim'); await page.locator('#btn-cheer-continue').click(); await shot(page, phase + '-failure-result-insets-sim');
      await context.close();
    }
    assert.deepEqual(report.fonts.after, report.fonts.before, 'Original font metrics and actual faces must not change');
    report.comparisons.push('All sampled UI font sizes, weights, line heights and actual platform fonts unchanged');
    for (const label of ['puzzle-Ha', 'puzzle-Tapee', 'portrait-4', 'portrait-9', 'portrait-16', 'portrait-25', 'position-2', 'position-4', 'position-6']) {
      const a = report.layout.find(x => x.phase === 'before' && x.label === label);
      const b = report.layout.find(x => x.phase === 'after' && x.label === label);
      assert.deepEqual(b.board, a.board, label + ': normal design geometry preserved');
      assert.deepEqual(b.target, a.target, label + ': original target geometry preserved');
    }
    assert.equal(report.errors.length, 0, report.errors.join('\n')); report.passed = true;
    console.log('PASS: ' + report.captures.length + ' captures, ' + report.layout.length + ' layouts; original typography unchanged');
  } finally {
    await browser.close(); await Promise.all(servers.map(s => new Promise(r => s.close(r))));
    fs.writeFileSync(path.join(out, 'verification.json'), JSON.stringify(report, null, 2) + '\n');
  }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
