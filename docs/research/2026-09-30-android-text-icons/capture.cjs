// Browser regression captures, NOT real Android fontScale/device screenshots.
// Before server must serve a git archive, not a modified current checkout.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const sharp = require('sharp');
const root = path.resolve(__dirname, '../../..');
const out = path.join(__dirname, 'screenshots');
const baseline = process.env.BASELINE_DIR;
const report = { baseline: '783968f77f156b8a2c26f4501ab9832bd5eed30f', size: '780×1688', viewport: '390×844 CSS px at DPR 2', nativeDeviceTested: false, errors: [], checks: [], layouts: {} };
const dataURL = file => 'data:image/png;base64,' + fs.readFileSync(file).toString('base64');
async function settled(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].filter(img => img.getBoundingClientRect().width).map(img => img.decode().catch(() => {})));
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
}
async function shot(page, name) {
  await settled(page);
  const file = path.join(out, name + '.png');
  await page.screenshot({ path: file, animations: 'disabled' });
  const metadata = await sharp(file).metadata();
  assert.equal(metadata.width, 780); assert.equal(metadata.height, 1688);
}
async function main() {
  assert.ok(baseline, 'Set BASELINE_DIR to the git archive directory');
  fs.mkdirSync(out); // Do not overwrite an earlier capture set.
  const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
  report.browser = browser.version();
  try {
    for (const [phase, port] of [['before', 5266], ['after', 5267]]) {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'en-US', timezoneId: 'Asia/Seoul' });
      await context.addInitScript(() => {
        localStorage.setItem('taptopick.preferences.v1', JSON.stringify({ musicOn: false, soundOn: false, hapticsOn: false }));
        // Research fixture only; the production random generator is untouched.
        let seed = 930; Math.random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
      });
      const page = await context.newPage(); page.on('pageerror', e => report.errors.push(phase + ': ' + e.message));
      await page.goto(`http://127.0.0.1:${port}/`);
      await page.locator('#btn-title-settings').waitFor({ state: 'visible' });
      await shot(page, phase + '-menu');
      report.layouts[phase] = await page.locator('#mode-montage').evaluate(el => {
        const r = el.getBoundingClientRect(), style = getComputedStyle(el);
        return { x: r.x, y: r.y, width: r.width, height: r.height, fontSize: style.fontSize, fontFamily: style.fontFamily };
      });
      await page.locator('#btn-title-settings').click(); await shot(page, phase + '-settings');
      await page.locator('#btn-settings-back').click();
      for (const [mode, count] of [['unit', 49], ['montage', 4], ['memory', 4]]) {
        await page.locator('#mode-' + mode).click(); await shot(page, phase + '-' + mode + '-start');
        await page.locator('#btn-mode-intro-start').click();
        await page.waitForFunction(n => document.querySelectorAll('#picture-board button').length === n, count);
        await shot(page, phase + '-' + mode + '-board');
        assert.equal(await page.locator('#picture-board button').count(), count);
        const bounds = await page.locator('#picture-board').boundingBox();
        assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= 391 && bounds.y + bounds.height <= 845, 'Board stays in viewport');
        await page.locator('#btn-back').click();
      }
      if (phase === 'after') assert.equal(await page.locator('html').evaluate(el => getComputedStyle(el).webkitTextSizeAdjust), '100%');
      await context.close();
    }
    assert.deepEqual(report.layouts.before, report.layouts.after);
    report.checks.push('Menu geometry/font unchanged at normal text scale', 'All three START/game boards render: 49/4/4 tiles', 'Boards fit mobile viewport', 'CSS text-size-adjust is 100%', 'All captures are 780×1688 PNG');
    // A labelled rendering of Android masks, not a launcher/device capture.
    for (const [phase, tree] of [['before', baseline], ['after', root]]) {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
      const page = await context.newPage();
      const res = path.join(tree, 'android/app/src/main/res');
      const fg = dataURL(path.join(res, 'mipmap-xxxhdpi/ic_launcher_foreground.png'));
      const icon = dataURL(path.join(res, 'mipmap-xxxhdpi/ic_launcher.png'));
      const round = dataURL(path.join(res, 'mipmap-xxxhdpi/ic_launcher_round.png'));
      const color = fs.readFileSync(path.join(res, 'values/ic_launcher_background.xml'), 'utf8').match(/#[A-Fa-f0-9]{6}/)[0];
      await page.setContent(`<html><style>*{box-sizing:border-box}body{margin:0;padding:28px 24px;background:#fff6e9;color:#3a0f0a;font-family:Arial,sans-serif}h1{font-size:22px;margin:0 0 8px}p{font-size:13px;line-height:1.5}.row{display:flex;justify-content:space-around;margin:30px 0 36px}.item{text-align:center;font-size:13px}.mask{position:relative;width:144px;height:144px;background:${color};overflow:hidden;margin-bottom:12px}.circle{border-radius:50%}.rounded{border-radius:28%}.fg{position:absolute;width:216px;height:216px;left:-36px;top:-36px}.legacy{width:128px;height:128px;object-fit:contain;margin-bottom:12px}footer{font-size:12px;line-height:1.6;border-top:1px solid #e8d3ba;padding-top:16px}</style><h1>TAPtoTEST · ${phase.toUpperCase()}</h1><p>Launcher icon preview<br>Reference rendering — not a device screenshot</p><div class="row"><div class="item"><div class="mask circle"><img class="fg" src="${fg}"></div>Adaptive circle</div><div class="item"><div class="mask rounded"><img class="fg" src="${fg}"></div>Adaptive rounded</div></div><div class="row"><div class="item"><img class="legacy" src="${icon}"><br>Legacy square</div><div class="item"><img class="legacy" src="${round}"><br>Legacy round</div></div><footer>${phase === 'after' ? 'Supplied PNG preserved.<br>60dp content · 108dp foreground<br>White background · proportional resize only.<br>Dark lettering fits inside the 66dp circle.' : 'Archived from commit 783968f.<br>Previous launcher assets and background.<br>No source changes applied to this reference.'}<br><br>Normal color icon; launcher theme effects may vary.</footer></html>`);
      await shot(page, phase + '-launcher-preview'); await context.close();
    }
    assert.equal(report.errors.length, 0, report.errors.join('\n'));
  } finally {
    await browser.close();
    fs.writeFileSync(path.join(out, 'verification.json'), JSON.stringify(report, null, 2) + '\n');
  }
  console.log(JSON.stringify(report, null, 2));
}
main().catch(e => { console.error(e); process.exitCode = 1; });
