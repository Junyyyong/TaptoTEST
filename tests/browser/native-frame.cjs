// Real app routes in Chrome with the Capacitor custom-platform hook. This is a
// layout/interaction simulation, NOT a Galaxy or native Preferences test.
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '../..');
const out = process.env.FRAME_REPORT_DIR;
const baseline = process.env.BASELINE_WEB;
const report = { nativeDeviceTested: false, designCanvas: [390, 844], checks: [], errors: [], captures: [], webComparisons: [] };
const servers = [];
async function serve(dir) {
  const mime = { '.html':'text/html', '.css':'text/css', '.js':'text/javascript', '.webp':'image/webp', '.png':'image/png', '.svg':'image/svg+xml', '.woff2':'font/woff2', '.mp3':'audio/mpeg', '.mp4':'video/mp4', '.webm':'video/webm' };
  const server = http.createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, 'http://local').pathname);
    const file = path.resolve(dir, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(dir + '/') || !fs.existsSync(file) || !fs.statSync(file).isFile()) return res.writeHead(404).end();
    res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream'); fs.createReadStream(file).pipe(res);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); servers.push(server);
  return `http://127.0.0.1:${server.address().port}`;
}
async function settle(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].filter(i => i.getBoundingClientRect().width).map(i => i.decode().catch(() => {})));
  });
  await page.waitForTimeout(120);
}
async function snapshot(page, label, density, bars) {
  await settle(page);
  const value = await page.evaluate(() => {
    const rect = s => { const r = document.querySelector(s).getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width,h:r.height,bottom:r.bottom,right:r.right}; };
    const app = document.querySelector('#app'), frame = rect('#app');
    const scale = frame.w / app.clientWidth;
    const visible = [...document.querySelectorAll('#app .screen')].find(s => !s.classList.contains('hidden'));
    const selectors = ['#picture-board','#target-preview','.unit-reveal','#target-character-name','#progress-label','#montage-status','.brand-mark','#mode-unit','#btn-title-settings','#btn-title-music','#mode-intro-title','#btn-mode-intro-start','#help-title','#btn-resume','#result-title','.result-primary','#btn-again'];
    const boxes = {};
    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (!el || !el.getClientRects().length) continue;
      const r = rect(selector), css = getComputedStyle(el);
      boxes[selector] = { ...r, lx:(r.x-frame.x)/scale, ly:(r.y-frame.y)/scale, lw:r.w/scale, lh:r.h/scale, font:css.fontSize, family:css.fontFamily };
    }
    return {frame,scale,boxes,screen:visible?.id,boardCount:document.querySelectorAll('#picture-board button').length,overflow:visible ? visible.scrollHeight-visible.clientHeight : null,viewport:[innerWidth,innerHeight]};
  });
  if (density) {
    const expectedScale = Math.min((value.viewport[0]-bars.left-bars.right)/390,(value.viewport[1]-bars.top-bars.bottom)/844);
    assert.ok(Math.abs(value.scale-expectedScale)<.001, label+': uniform scale');
    assert.ok(value.frame.y >= bars.top-.1 && value.frame.bottom <= value.viewport[1]-bars.bottom+.1, label+': vertical safe area');
    assert.ok(value.frame.x >= bars.left-.1 && value.frame.right <= value.viewport[0]-bars.right+.1, label+': horizontal safe area');
    for (const selector of ['#picture-board','#montage-status','#btn-again','#btn-resume','#btn-mode-intro-start']) {
      const b = value.boxes[selector]; if (!b) continue;
      assert.ok(b.bottom <= value.frame.bottom+.5, label+': '+selector+' bottom');
      assert.ok(b.x >= value.frame.x-.5 && b.right <= value.frame.right+.5, label+': '+selector+' width');
    }
    if (value.boxes['#picture-board']) assert.ok(Math.abs(value.boxes['#picture-board'].w-value.boxes['#picture-board'].h)<.5, label+': square board');
  }
  report.checks.push({label,density,bars,...value}); return value;
}
async function shot(page, name) {
  await settle(page); await page.screenshot({path:path.join(out,name+'.png'),animations:'disabled'}); report.captures.push(name+'.png');
}
async function enter(page, mode) {
  await page.locator('#mode-'+mode).click(); await page.locator('#btn-mode-intro-start').click(); await settle(page);
}
async function main() {
  assert.ok(out && baseline); assert.ok(!fs.existsSync(out),'Preserve existing reports'); fs.mkdirSync(out,{recursive:true});
  const url = await serve(path.join(root,'dist')), beforeURL = await serve(baseline);
  const browser = await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--mute-audio']});
  report.browser=browser.version();
  try {
    // Density changes on the SAME illustrative 1080×2340 screen. All CSS
    // viewports are integral; the same physical system-bar heights are used.
    for (const density of [2,2.4,3,3.6,4]) {
      const context = await browser.newContext({viewport:{width:1080/density,height:2340/density},deviceScaleFactor:density,isMobile:true,hasTouch:true});
      await context.addInitScript(density => {
        window.CapacitorCustomPlatform={name:'android'};
        // Custom platform uses the web Preferences fallback, not native IO.
        const preferences=JSON.stringify({musicOn:false,soundOn:false,hapticsOn:false});
        localStorage.setItem('taptopick.preferences.v1',preferences); localStorage.setItem('CapacitorStorage.taptopick.preferences.v1',preferences);
        document.addEventListener('DOMContentLoaded',()=>{
          document.documentElement.style.setProperty('--safe-area-inset-top',`${72/density}px`);
          document.documentElement.style.setProperty('--safe-area-inset-bottom',`${144/density}px`);
        },{once:true});
        let seed=930; Math.random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
      },density);
      const page=await context.newPage(); page.setDefaultTimeout(14000); page.on('pageerror',error=>report.errors.push(error.message));
      const bars={top:72/density,bottom:144/density,left:0,right:0};
      await page.goto(url); await page.locator('#mode-unit').waitFor({state:'visible'});
      await snapshot(page,'menu',density,bars); if ([2,4].includes(density)) await shot(page,'density-'+density+'-menu');
      await page.locator('#mode-unit').click(); await snapshot(page,'puzzle-start',density,bars);
      await page.locator('#btn-mode-intro-start').click(); await snapshot(page,'puzzle',density,bars);
      if ([2,4].includes(density)) await shot(page,'density-'+density+'-puzzle');
      await page.locator('#btn-pause').click(); await snapshot(page,'pause',density,bars); await page.locator('#btn-resume').click();
      // A touch on a real puzzle tile must map through the transform to exactly
      // that button; don't use a forced DOM click.
      const heartsBefore=await page.locator('.life-heart.is-empty').count();
      await page.locator('#picture-board button').first().tap();
      await page.waitForFunction(n=>document.querySelectorAll('.life-heart.is-empty').length>n||document.querySelector('#picture-board button').classList.contains('is-found'),heartsBefore);
      await page.locator('#btn-back').click();
      await enter(page,'montage'); await snapshot(page,'portrait-4',density,bars);
      if ([2,4].includes(density)) await shot(page,'density-'+density+'-portrait');
      for (let found=0;found<13;found++) {
        await page.waitForFunction(()=>!document.querySelector('#picture-board .is-found'));
        const answer=await page.evaluate(()=>[...document.querySelectorAll('#picture-board img')].findIndex(i=>i.src===document.querySelector('#target-preview img').src));
        const src=await page.locator('#target-preview img').getAttribute('src');
        await page.locator('#picture-board button').nth(answer).tap();
        await page.waitForFunction(src=>document.querySelector('#target-preview img').getAttribute('src')!==src,src);
        if ([2,7,12].includes(found)) await snapshot(page,'portrait-'+(found===2?9:found===7?16:25),density,bars);
      }
      await page.locator('#btn-back').click(); await enter(page,'memory'); await snapshot(page,'position-4',density,bars);
      if ([2,4].includes(density)) await shot(page,'density-'+density+'-position');
      for (const count of [4,16,36]) {
        await page.waitForFunction(n=>document.querySelectorAll('#picture-board button').length===n&&document.querySelector('#picture-board .memory-back')&&getComputedStyle(document.querySelector('#picture-board .memory-back')).opacity==='1',count);
        if(count>4) await snapshot(page,'position-'+count,density,bars);
        const pairs=await page.evaluate(()=>{
          const groups={}; [...document.querySelectorAll('#picture-board button')].forEach((b,i)=>{const src=b.querySelector('img')?.src;if(src)(groups[src]??=[]).push(i);});
          return Object.values(groups).flatMap(indices=>{const pairs=[];for(let i=0;i<indices.length;i+=2)pairs.push(indices.slice(i,i+2));return pairs;});
        });
        for(const [a,b] of pairs) { await page.locator('#picture-board button').nth(a).tap(); await page.locator('#picture-board button').nth(b).tap(); }
        if(count<36) await page.waitForFunction(n=>document.querySelectorAll('#picture-board button').length!==n,count);
      }
      await page.locator('#btn-cheer-continue').waitFor({state:'visible'}); await snapshot(page,'completion-video',density,bars);
      await page.locator('#btn-cheer-continue').click(); await snapshot(page,'result',density,bars);
      if ([2,4].includes(density)) await shot(page,'density-'+density+'-result');
      await page.locator('#btn-result-menu').click(); await page.locator('#btn-title-settings').click(); await snapshot(page,'settings',density,bars);
      await page.locator('#btn-privacy').click(); await page.frameLocator('#legal-frame').locator('h1').first().waitFor();
      const legal=await page.locator('#legal-dialog').boundingBox(); assert.ok(legal.y>=bars.top-.5&&legal.y+legal.height<=2340/density-bars.bottom+.5,'policy safe area');
      await page.locator('#btn-legal-close').click(); await page.locator('#btn-settings-back').click();
      if (density===3) {
        // Live display-size changes, both framework paths, and the actual
        // Hapee carrot picture in the user's report plus the original 12-piece.
        const wanted=new Set(['HapeeCarrot','Tapee']);
        for(let round=0;round<16&&wanted.size;round++) {
          await enter(page,'unit');
          const src=await page.locator('.unit-reveal-base').getAttribute('src');
          const artwork=[...wanted].find(name=>new RegExp('/'+name+'-[^/]+\\.webp$').test(src));
          if(artwork) {
            wanted.delete(artwork); await snapshot(page,'puzzle-'+artwork,density,bars); await shot(page,'density-3-'+artwork);
            for (const otherDensity of [2,2.4,3.6,4]) {
              await page.setViewportSize({width:1080/otherDensity,height:2340/otherDensity});
              const liveBars={top:72/otherDensity,bottom:144/otherDensity,left:0,right:0};
              await page.evaluate(b=>{const s=document.documentElement.style;s.setProperty('--safe-area-inset-top',b.top+'px');s.setProperty('--safe-area-inset-bottom',b.bottom+'px');},liveBars);
              await snapshot(page,'live-'+artwork,otherDensity,liveBars);
            }
            await page.setViewportSize({width:360,height:780});
            const cdp=await context.newCDPSession(page);
            for(const [name,env,native,measured,expected] of [
              ['env-only',[24,48],null,null,[24,48]],
              ['native-zero',[24,48],[0,0],null,[0,0]],
              ['measured-overlap',[0,0],[0,0],[24,48],[24,48]],
              ['measured-zero',[24,48],[24,48],[0,0],[0,0]],
              ['measured-smaller',[24,48],[24,48],[10,20],[10,20]],
            ]) {
              await cdp.send('Emulation.setSafeAreaInsetsOverride',{insets:{top:env[0],bottom:env[1],left:0,right:0}});
              await page.evaluate(({native,measured})=>{
                const s=document.documentElement.style;
                for(const [key,values] of [['--safe-area-inset-',native],['--android-game-inset-',measured]])for(const [i,side] of ['top','bottom'].entries())values===null?s.removeProperty(key+side):s.setProperty(key+side,values[i]+'px');
              },{native,measured});
              await snapshot(page,'insets-'+artwork+'-'+name,density,{top:expected[0],bottom:expected[1],left:0,right:0});
            }
            await cdp.send('Emulation.setSafeAreaInsetsOverride',{insets:{top:0,bottom:0,left:0,right:0}});
            await page.evaluate(b=>{const s=document.documentElement.style;for(const side of ['top','bottom']){s.removeProperty('--android-game-inset-'+side);s.setProperty('--safe-area-inset-'+side,b[side]+'px');}},bars);
          }
          await page.locator('#btn-back').click();
        }
        assert.equal(wanted.size,0,'carrot and original 12-piece both verified');
      }
      await context.close();
      console.log('density '+density+' passed');
    }
    // Exact logical geometry and typography must agree for every density.
    for (const label of new Set(report.checks.map(c=>c.label))) {
      const samples=report.checks.filter(c=>c.label===label), first=samples[0];
      for(const sample of samples.slice(1)) for(const [selector,b] of Object.entries(first.boxes)) {
        const other=sample.boxes[selector]; assert.ok(other,selector);
        for(const key of ['lx','ly','lw','lh']) assert.ok(Math.abs(b[key]-other[key])<.05,label+': '+selector+' '+key);
        assert.equal(b.font,other.font,label+': font size'); assert.equal(b.family,other.family,label+': font family');
      }
    }
    // Web mode must retain its ordinary responsive sizes without a native hook.
    for (const [width,height] of [[390,844],[360,780],[320,650],[390,700],[390,701]]) {
      const samples=[];
      for(const webURL of [beforeURL,url]) {
        const context=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true});
        await context.addInitScript(()=>{localStorage.setItem('taptopick.preferences.v1',JSON.stringify({musicOn:false,soundOn:false,hapticsOn:false}));let seed=930;Math.random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);});
        const page=await context.newPage(); await page.goto(webURL); await page.locator('#mode-unit').waitFor({state:'visible'});
        assert.equal(await page.locator('#app.is-native-frame').count(),0);
        const menu=await snapshot(page,'web-menu',null,null); await enter(page,'unit'); const puzzle=await snapshot(page,'web-puzzle',null,null);
        samples.push({menu,puzzle}); await context.close();
      }
      for(const screen of ['menu','puzzle']) for(const [selector,b] of Object.entries(samples[0][screen].boxes)) {
        const after=samples[1][screen].boxes[selector]; assert.ok(after,selector);
        for(const key of ['x','y','w','h']) assert.ok(Math.abs(b[key]-after[key])<1,`web ${width}x${height} ${selector} ${key}`);
        assert.equal(b.font,after.font); assert.equal(b.family,after.family);
      }
      report.webComparisons.push({width,height,unchanged:true});
    }
    assert.deepEqual(report.errors,[]);
    fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
    console.log(JSON.stringify({checks:report.checks.length,captures:report.captures.length,webComparisons:report.webComparisons,errors:report.errors},null,2));
  } finally {await browser.close(); for(const server of servers) await new Promise(resolve=>server.close(resolve));}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
