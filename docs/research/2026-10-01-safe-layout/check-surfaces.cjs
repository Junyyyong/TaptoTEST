// Supplemental actual-route checks. Safe insets are simulations, not a phone.
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '../../..');
const out = path.resolve(process.env.SURFACE_REPORT || path.join(__dirname, 'surface-verification.json'));
const report = { nativeDeviceTested: false, checks: [], errors: [], failures: [], musicPromptFixture: 'Unhide existing button only: does not simulate audio permission or playback.' };
const dims = [320, 375, 390, 412].flatMap(w => w === 320 ? [[320, 568]] : [660, 700, 701, 844, 932].map(h => [w, h]));
const insets = {
  none: {env:[0,0], native:null, expected:[0,0]},
  env: {env:[24,48], native:null, expected:[24,48]},
  native: {env:[0,0], native:[24,48], expected:[24,48]},
  both: {env:[24,48], native:[24,48], expected:[24,48]},
  'native-zero': {env:[24,48], native:[0,0], expected:[0,0]},
  'native-smaller': {env:[24,48], native:[10,20], expected:[10,20]},
};
report.insetCases = insets;
async function main() {
  assert.ok(!fs.existsSync(out), 'Preserve previous reports');
  fs.mkdirSync(path.dirname(out), {recursive:true});
  const dist = path.join(root, 'dist');
  const server = http.createServer((req, res) => {
    const file = path.resolve(dist, '.' + (new URL(req.url, 'http://local').pathname === '/' ? '/index.html' : decodeURIComponent(new URL(req.url, 'http://local').pathname)));
    if (!file.startsWith(dist + '/') || !fs.existsSync(file)) return res.writeHead(404).end();
    res.setHeader('Content-Type', ({'.html':'text/html','.css':'text/css','.js':'text/javascript','.webp':'image/webp','.mp4':'video/mp4','.webm':'video/webm','.woff2':'font/woff2'})[path.extname(file)] || 'application/octet-stream');
    fs.createReadStream(file).pipe(res);
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--mute-audio'] });
  try {
    report.browser = browser.version();
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await context.addInitScript(() => localStorage.setItem('taptopick.preferences.v1', JSON.stringify({ musicOn: false, soundOn: false, hapticsOn: false })));
    const page = await context.newPage();
    page.on('pageerror', e => report.errors.push(e.message));
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.locator('#mode-unit').waitFor({state:'visible'});
    const cdp = await context.newCDPSession(page);
    async function resize(w, h, source) {
      await page.setViewportSize({width:w,height:h});
      const values = insets[source];
      await cdp.send('Emulation.setSafeAreaInsetsOverride', {insets:{top:values.env[0],bottom:values.env[1],left:0,right:0}});
      await page.evaluate(native => {
        for (const [index,side] of ['top','bottom'].entries()) {
          if (native === null) document.documentElement.style.removeProperty('--safe-area-inset-'+side);
          else document.documentElement.style.setProperty('--safe-area-inset-'+side, native[index]+'px');
        }
      },values.native);
      await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
      const effective = await page.locator('#screen-settings').evaluate(e => {
        const css=getComputedStyle(e); return [parseFloat(css.paddingTop),parseFloat(css.paddingBottom)];
      });
      assert.deepEqual(effective, values.expected, source+': resolved native/env priority');
    }
    async function matrix(name, selectors, options = {}) {
      console.log('Checking ' + name);
      await page.evaluate(async () => {
        await new Promise(r=>requestAnimationFrame(r));
        await document.fonts.ready;
        await Promise.all([...document.images].filter(i=>i.getBoundingClientRect().width).map(i=>i.decode().catch(()=>{})));
      });
      for (const [w,h] of dims) for (const source of Object.keys(insets)) {
        await resize(w,h,source);
        if(options.fixture) {
          await page.locator('#btn-title-music').evaluate(e=>e.classList.remove('hidden'));
          await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
          await page.evaluate(() => document.fonts.ready);
          await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
        }
        if(options.scroll) await page.locator(options.scroll).evaluate(e=>{e.scrollTop=e.scrollHeight});
        const scrollingMenu = options.menu && await page.locator('#screen-title').evaluate(e=>e.classList.contains('is-space-limited'));
        if (scrollingMenu) {
          const noOverlap = await page.evaluate(() => document.querySelector('.brand-mark').getBoundingClientRect().bottom <= document.querySelector('.mode-list').getBoundingClientRect().top);
          assert.ok(noOverlap, 'Do not overlap artwork and mode buttons');
        }
        const data = {};
        for (const selector of selectors) {
          if(scrollingMenu) await page.locator(selector).evaluate(e=>e.scrollIntoView({block:'center'}));
          data[selector] = await page.locator(selector).evaluate(e => {
            const b=e.getBoundingClientRect(), css=getComputedStyle(e);
            return {x:b.x,y:b.y,right:b.right,bottom:b.bottom,w:b.width,h:b.height,display:css.display,client:e.clientHeight,scroll:e.scrollHeight};
          });
        }
        const [top,safeBottom]=insets[source].expected, bottom=h-safeBottom;
        for(const [s,b] of Object.entries(data)) {
          if(b.w<=0||b.h<=0||b.x < -1||b.right>w+1||b.y<top-1||b.bottom>bottom+1) report.failures.push({name,source,viewport:[w,h],selector:s,rect:b,top,bottom});
        }
        report.checks.push({name,source,viewport:[w,h],scrollingMenu:!!scrollingMenu,data});
        if(options.menu) await page.locator('#screen-title').evaluate(e=>e.scrollTop=0);
      }
      await resize(390,844,'both');
    }
    await matrix('menu', ['.brand-mark','#mode-unit','#mode-montage','#mode-memory','#btn-title-settings'], {menu:true});
    await matrix('menu-music-prompt', ['.brand-mark','#mode-unit','#mode-montage','#mode-memory','#btn-title-settings','#btn-title-music'], {fixture:true,menu:true});
    await page.locator('#btn-title-settings').click();
    await matrix('settings', ['#btn-settings-back','#settings-title','#btn-privacy','#btn-licenses']);
    for(const id of ['privacy','licenses']) {
      await page.locator('#btn-'+id).click();
      await page.frameLocator('#legal-frame').locator('h1').first().waitFor();
      await matrix(id,['#legal-dialog','#btn-legal-close','#legal-frame']);
      // The document itself can be scrolled to its end without hiding Close.
      await page.frameLocator('#legal-frame').locator('body').evaluate(e=>e.ownerDocument.scrollingElement.scrollTop=e.scrollHeight);
      assert.ok(await page.locator('#btn-legal-close').isVisible());
      await page.locator('#btn-legal-close').click();
    }
    await page.locator('#btn-settings-back').click();
    for(const id of ['unit','montage','memory']) {
      await page.locator('#mode-'+id).click();
      await matrix(id+'-start',['#btn-mode-intro-back','#mode-intro-title','#mode-intro-mark','#mode-intro-note','#btn-mode-intro-start']);
      await page.locator('#btn-mode-intro-back').click();
    }
    await page.locator('#mode-montage').click(); await page.locator('#btn-mode-intro-start').click();
    await matrix('portrait-board',['#target-character-name','#target-preview','#picture-board','#montage-status']);
    await page.locator('#btn-pause').click();
    await matrix('pause',['.help-panel','#btn-resume','#btn-pause-menu']);
    await page.locator('#btn-resume').click();
    const wrong=await page.evaluate(()=>[...document.querySelectorAll('#picture-board button img')].findIndex(i=>i.src!==document.querySelector('#target-preview img').src));
    for(let i=0;i<5;i++){await page.locator('#picture-board button').nth(wrong).click();await page.waitForTimeout(380);}
    await page.locator('#btn-cheer-continue').waitFor({state:'visible'}); await page.waitForTimeout(700);
    await matrix('video',['#btn-cheer-continue','#cheer-word','#cheer-clip','#cheer-tap']);
    await page.locator('#btn-cheer-continue').click();
    await matrix('result',['.result-panel','#btn-again','#btn-result-menu'],{scroll:'.result-panel'});
    // Explicit native 0 must produce the same geometry as no inset, even if
    // env() still reports old nonzero values after native padding was applied.
    for (const test of report.checks.filter(c=>c.source==='native-zero')) {
      const normal = report.checks.find(c=>c.name===test.name && c.source==='none' && c.viewport.join()===test.viewport.join());
      for (const selector of Object.keys(test.data)) {
        for(const key of ['x','y','right','bottom','w','h']) {
          if(Math.abs(test.data[selector][key]-normal.data[selector][key])>1) report.failures.push({name:test.name,source:'native-zero-parity',viewport:test.viewport,selector,key,actual:test.data[selector][key],expected:normal.data[selector][key]});
        }
      }
    }
    report.passed=report.failures.length===0 && report.errors.length===0;
    console.log(JSON.stringify({passed:report.passed,checks:report.checks.length,failures:report.failures.slice(0,12),failureCount:report.failures.length,errors:report.errors},null,2));
    if(!report.passed) process.exitCode=1;
  } finally {
    fs.writeFileSync(out, JSON.stringify(report,null,2)+'\n',{flag:'wx'});
    await browser.close(); await new Promise(r=>server.close(r));
  }
}
main().catch(e=>{console.error(e);process.exitCode=1});
