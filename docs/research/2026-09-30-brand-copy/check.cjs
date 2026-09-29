// Use a fresh CAPTURE_OUT directory and an isolated profile, never user saves.
const { chromium } = require('playwright');
const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
(async () => {
  const out = process.env.CAPTURE_OUT;
  assert.ok(out); await fs.mkdir(out, { recursive: false });
  const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'en-US', timezoneId: 'Asia/Seoul' });
    await context.addInitScript(() => { if (window === window.top) localStorage.setItem('taptopick.preferences.v1', JSON.stringify({ musicOn: false, soundOn: false, hapticsOn: false, tutorialDone: true })); });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(process.env.BASE_URL || 'http://127.0.0.1:5244/');
    await page.locator('#btn-title-settings').click();
    const stored = await page.evaluate(() => JSON.stringify(Object.entries(localStorage)));
    assert.equal(await page.title(), 'TAPtoTEST');
    for (const [selector, attribute] of [['#screen-splash', 'aria-label'], ['#product-cover', 'alt'], ['#brand-mark', 'alt']]) assert.equal(await page.locator(selector).getAttribute(attribute), 'TAPtoTEST');
    await page.locator('#btn-privacy').click();
    const frame = page.frameLocator('#legal-frame');
    await frame.locator('#english').waitFor();
    for (const language of ['english', 'korean']) {
      const text = await frame.locator('#' + language).innerText();
      assert.match(text, /TAPtoTEST/); assert.doesNotMatch(text, /pick/i);
      await frame.locator('a[href="#' + language + '"]').click();
      await page.screenshot({ path: path.join(out, 'privacy-' + language + '.png') });
    }
    await page.locator('#btn-legal-close').click();
    await page.locator('#btn-licenses').click();
    await frame.locator('h1').waitFor();
    assert.doesNotMatch(await frame.locator('body').innerText(), /pick/i);
    await page.locator('#btn-legal-close').click();
    assert.equal(await page.evaluate(() => JSON.stringify(Object.entries(localStorage))), stored);
    assert.deepEqual(errors, []);
    const files = {};
    for (const file of await fs.readdir(out)) files[file] = createHash('sha256').update(await fs.readFile(path.join(out, file))).digest('hex');
    const report = { checkedAt: new Date().toISOString(), browser: browser.version(), viewport: '390×844 CSS px; DPR 2; PNG 780×1688', checks: ['EN/KO policy and license text contain no previous brand', 'Splash/logo accessible names and page title are TAPtoTEST', 'Document reading leaves preferences unchanged', 'No browser page errors'], errors, files };
    await fs.writeFile(path.join(out, 'verification.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify(report, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
