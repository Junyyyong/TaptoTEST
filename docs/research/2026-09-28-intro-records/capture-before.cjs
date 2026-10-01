const { chromium } = require('playwright');
const path = require('node:path');
const fs = require('node:fs');

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await page.addInitScript(() => localStorage.setItem('taptopick.preferences.v1', JSON.stringify({ musicOn: false, soundOn: false, hapticsOn: false })));
    await page.clock.install();
    await page.goto('http://127.0.0.1:5239/', { waitUntil: 'networkidle' });
    await page.clock.runFor(7100);
    await page.evaluate(() => document.fonts.ready);
    for (const mode of ['unit', 'montage', 'memory']) {
      const output = path.join(__dirname, `before-${mode}.png`);
      if (fs.existsSync(output)) throw Error(`Refusing to replace baseline: ${output}`);
      await page.locator(`#mode-${mode}`).click();
      await page.screenshot({ path: output, animations: 'disabled' });
      await page.locator('#btn-mode-intro-back').click();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
