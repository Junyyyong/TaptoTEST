// Real UI and real taps in desktop Chrome's Android-platform simulation.
// Density simulation is not a physical-device, Preferences, or AAB test.
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '../..');
const baseline = process.env.BASELINE_WEB, out = process.env.RESPONSIVE_REPORT_DIR;
const coverOnly = process.env.COVER_ONLY === '1';
const profiles = [
  { id:'reference', physical:[780,1688], bars:[48,96], densities:[2], capture:true },
  { id:'phone', physical:[1080,2340], bars:[72,144], densities:[2,3,4] },
  { id:'tall-phone', physical:[1080,2700], bars:[72,144], densities:[2,3,4], capture:true },
  { id:'short-phone', physical:[1080,1944], bars:[72,144], densities:[2,3,4] },
  { id:'tablet-16x10', physical:[1620,2592], bars:[72,144], densities:[2,3,4] },
  { id:'tablet-4x3', physical:[1728,2304], bars:[72,144], densities:[2,3,4], capture:true },
  { id:'wide-window', physical:[2304,1728], bars:[72,144], densities:[2,3,4] },
];
const report = { capturedAt:new Date().toISOString(), nativeDeviceTested:false, aabCreated:false, coverOnly, coverSizing:'width100%-heightAuto-center',
  profiles, checks:[], captures:[], densityComparisons:[], errors:[], coverCrops:[] };
const servers = [];
async function serve(dir) {
  const mime = {'.html':'text/html','.css':'text/css','.js':'text/javascript','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2','.mp3':'audio/mpeg','.mp4':'video/mp4','.webm':'video/webm'};
  const server = http.createServer((req,res) => {
    const pathname = decodeURIComponent(new URL(req.url,'http://local').pathname);
    const file = path.resolve(dir,'.'+(pathname==='/'?'/index.html':pathname));
    if (!file.startsWith(dir+'/') || !fs.existsSync(file) || !fs.statSync(file).isFile()) return res.writeHead(404).end();
    res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream'); fs.createReadStream(file).pipe(res);
  });
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  servers.push(server); return `http://127.0.0.1:${server.address().port}`;
}
async function settle(page) {
  await page.evaluate(async()=>{
    await document.fonts.ready;
    await Promise.all([...document.images].filter(i=>i.getClientRects().length).map(i=>i.decode().catch(()=>{})));
  });
  await page.waitForTimeout(160);
}
async function check(page, profile, density, phase, screen, capture=false) {
  await settle(page);
  const value = await page.evaluate(()=>{
    const rect = el => { const r=el.getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom}; };
    const app=document.querySelector('#app'), frame=rect(app), scale=frame.w/parseFloat(getComputedStyle(app).width);
    const boxes={};
    for (const selector of ['.studio-splash-screen','.studio-splash-cover','.splash-screen','#product-cover',
      '.brand-mark','#mode-unit','#mode-montage','#mode-memory','#btn-title-settings','#btn-title-music',
      '#mode-intro-title','.pick-intro-mark','#mode-intro-note','#btn-mode-intro-start',
      '#btn-back','#btn-pause','#target-character-name','#target-preview','.unit-reveal','#progress-label','#picture-board','#montage-status',
      '#btn-cheer-continue','#result-title','.result-primary','#btn-again','#btn-result-menu',
      '#help-title','#btn-resume','#btn-pause-menu','#settings-title','#btn-settings-back','.settings-body']) {
      const el=document.querySelector(selector); if(!el?.getClientRects().length)continue;
      const r=rect(el), css=getComputedStyle(el);
      boxes[selector]={...r,lx:(r.x-frame.x)/scale,ly:(r.y-frame.y)/scale,lw:r.w/scale,lh:r.h/scale,font:css.fontSize,color:css.color};
    }
    const visible=[...app.querySelectorAll('.screen')].find(e=>!e.classList.contains('hidden'));
    const cover=document.querySelector('#product-cover'), coverCss=getComputedStyle(cover);
    return {frame,scale,boxes,viewport:[innerWidth,innerHeight],logical:[app.offsetWidth,app.offsetHeight],
      screen:visible?.id,overflow:visible ? visible.scrollHeight-visible.clientHeight : 0,
      boardCount:document.querySelectorAll('#picture-board button').length,
      cover:{source:[cover.naturalWidth,cover.naturalHeight],fit:coverCss.objectFit,position:coverCss.objectPosition},
      bodyOverflow:document.body.scrollHeight-document.body.clientHeight};
  });
  if(phase==='after') {
    const [top,bottom]=profile.bars.map(v=>v/density), [w,h]=value.viewport;
    const close=(a,b,reason)=>assert.ok(Math.abs(a-b)<.6,`${profile.id}/${density}/${screen}: ${reason}: ${a} vs ${b}`);
    close(value.frame.x,0,'frame left');close(value.frame.y,top,'frame top');
    close(value.frame.w,w,'full usable width');close(value.frame.h,h-top-bottom,'full usable height');
    for(const [selector,b] of Object.entries(value.boxes)) {
      if(screen==='studio'||screen==='cover')continue;
      // The game stays mounted under its result/pause overlays. Test visible
      // controls in both layers, but not a not-yet-visible music prompt.
      assert.ok(b.x>=value.frame.x-.6&&b.right<=value.frame.right+.6,`${profile.id}/${screen}: ${selector} horizontal bounds`);
      assert.ok(b.y>=value.frame.y-.6&&b.bottom<=value.frame.bottom+.6,`${profile.id}/${screen}: ${selector} vertical bounds`);
    }
    if(screen==='studio'||screen==='cover') {
      const b=value.boxes[screen==='studio'?'.studio-splash-screen':'.splash-screen'];
      close(b.x,0,'splash full-window left');close(b.y,0,'splash full-window top');close(b.w,w,'splash width');close(b.h,h,'splash height');
      if(screen==='studio') {
        const b=value.boxes['.studio-splash-cover'];assert.ok(b.x>=0&&b.right<=w&&b.y>=0&&b.bottom<=h,'studio logo intact');
      } else {
        assert.equal(value.cover.fit,'contain');assert.equal(value.cover.position,'50% 50%');
        const [iw,ih]=value.cover.source, factor=w/iw, picture=value.boxes['#product-cover'];
        close(picture.x,0,'cover shows full width');close(picture.w,w,'cover width');
        close(picture.h,ih*factor,'cover preserves original aspect');close(picture.y,(h-picture.h)/2,'cover centred vertically');
        report.coverCrops.push({profile:profile.id,density,original:[iw,ih],visibleSource:[iw,Math.min(h/factor,ih)],
          removedPercent:[0,Math.max(0,100*(1-h/factor/ih))],whiteSpaceAboveBelowEach:Math.max(0,(h-picture.h)/2)});
      }
    }
    if(screen.startsWith('menu')) {
      assert.ok(value.boxes['.brand-mark'].bottom<=value.boxes['#mode-unit'].y+.6,profile.id+': logo/modes do not overlap');
      assert.ok(value.boxes['#mode-memory'].bottom<=value.boxes['#btn-title-settings'].y+.6,profile.id+': modes/settings do not overlap');
    }
    if(screen==='puzzle'||screen.startsWith('portrait-')||screen.startsWith('position-')) {
      const b=value.boxes['#picture-board'];close(b.w,b.h,'square board');
      assert.ok(value.boxes['#target-preview'].bottom<=b.y+.6,profile.id+': picture/board do not overlap');
      assert.equal(value.overflow,0,profile.id+': no gameplay scrolling');
    }
    assert.equal(value.bodyOverflow,0,profile.id+': no page overflow');
  }
  const entry={profile:profile.id,density,phase,label:screen,...value};report.checks.push(entry);
  if(capture) {
    const file=`${phase}/${profile.id}-${screen}.png`;
    await page.screenshot({path:path.join(out,file),animations:'disabled'});report.captures.push({file,physical:profile.physical});
  }
  return entry;
}
async function enter(page,mode) {
  await page.locator('#mode-'+mode).tap();await page.locator('#btn-mode-intro-start').tap();await settle(page);
}
async function closeGame(page) {await page.locator('#btn-back').tap();}
async function main() {
  assert.ok(out&&baseline);assert.ok(!fs.existsSync(out),'preserve earlier reports');
  fs.mkdirSync(path.join(out,'before'),{recursive:true});fs.mkdirSync(path.join(out,'after'),{recursive:true});
  const urls={before:await serve(baseline),after:await serve(path.join(root,'dist'))};
  const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--mute-audio']});
  report.browser=browser.version();
  try {
    for(const phase of ['before','after'])for(const profile of profiles) {
      const densities=phase==='before'?[profile.densities[0]]:profile.densities;
      for(const density of densities) {
        const capture=!!profile.capture&&density===profile.densities[0];
        const full=phase==='after'&&density===profile.densities[0];
        const ctx=await browser.newContext({viewport:{width:profile.physical[0]/density,height:profile.physical[1]/density},deviceScaleFactor:density,isMobile:true,hasTouch:true});
        await ctx.addInitScript(({density,bars})=>{
          window.CapacitorCustomPlatform={name:'android'};
          const prefs=JSON.stringify({musicOn:false,soundOn:false,hapticsOn:false});
          localStorage.setItem('taptopick.preferences.v1',prefs);localStorage.setItem('CapacitorStorage.taptopick.preferences.v1',prefs);
          document.addEventListener('DOMContentLoaded',()=>{
            const s=document.documentElement.style;s.setProperty('--android-game-inset-top',bars[0]/density+'px');s.setProperty('--android-game-inset-bottom',bars[1]/density+'px');
          },{once:true});
          let seed=930;Math.random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
        },{density,bars:profile.bars});
        const page=await ctx.newPage();page.setDefaultTimeout(16000);page.on('pageerror',error=>report.errors.push(error.message));
        await page.goto(urls[phase]);
        await check(page,profile,density,phase,'studio',capture);
        await page.locator('#screen-splash').waitFor({state:'visible'});await check(page,profile,density,phase,'cover',capture);
        if(coverOnly){await ctx.close();console.log(`${phase} ${profile.id} density ${density} cover passed`);continue;}
        await page.locator('#mode-unit').waitFor({state:'visible'});await check(page,profile,density,phase,'menu',capture);
        // The real fallback music prompt must also fit, without music playing.
        await page.evaluate(()=>document.querySelector('#btn-title-music').classList.remove('hidden'));
        await check(page,profile,density,phase,'menu-music',false);
        await page.evaluate(()=>document.querySelector('#btn-title-music').classList.add('hidden'));
        await page.locator('#mode-unit').tap();await check(page,profile,density,phase,'start',capture);
        await page.locator('#btn-mode-intro-start').tap();await check(page,profile,density,phase,'puzzle',capture);
        await page.locator('#btn-pause').tap();await check(page,profile,density,phase,'pause',capture);await page.locator('#btn-resume').tap();
        // Test actual touch mapping and a genuine Puzzle result, not a mock.
        if(full||capture) {
          const src=await page.locator('.unit-reveal-base').getAttribute('src');
          const stem=src.split('/').pop().replace(/-[A-Za-z0-9_-]+\.webp$/,'');
          const ids={Bb:'bb',Ha:'ha',Hoo:'hoo',Ja:'ja',Pino:'pino',Tapee:'tapee',Tepee:'tepee',HapeeCarrot:'hapee-carrot',HapeeCarrot02:'hapee-carrot-02',TapeeBack:'tapee-back',TepeeBack:'tepee-back',HooopeeBack:'hooopee-back',ComicA114:'comic-a-1-1-4',ComicA224:'comic-a-2-2-4',ComicA424:'comic-a-4-2-4',ComicA1634:'comic-a-16-3-4'};
          const tiles=page.locator('#picture-board button');
          const correct=await tiles.evaluateAll((bs,id)=>bs.flatMap((b,i)=>b.getAttribute('aria-label')===id+' picture piece'?[i]:[]),ids[stem]);
          assert.ok(correct.length===9||correct.length===12,'resolve genuine puzzle pieces');
          for(const i of correct)await tiles.nth(i).tap();
          await page.locator('#btn-cheer-continue').waitFor({state:'visible'});await check(page,profile,density,phase,'video',false);
          await page.locator('#btn-cheer-continue').tap();await check(page,profile,density,phase,'result',capture);
          await page.locator('#btn-result-menu').tap();
        } else await closeGame(page);
        await enter(page,'montage');await check(page,profile,density,phase,'portrait-4',capture);
        if(full) {
          for(let found=0;found<13;found++) {
            await page.waitForFunction(()=>!document.querySelector('#picture-board .is-found'));
            const answer=await page.evaluate(()=>[...document.querySelectorAll('#picture-board img')].findIndex(i=>i.src===document.querySelector('#target-preview img').src));
            const src=await page.locator('#target-preview img').getAttribute('src');
            await page.locator('#picture-board button').nth(answer).tap();
            await page.waitForFunction(src=>document.querySelector('#target-preview img').getAttribute('src')!==src,src);
            if([2,7,12].includes(found))await check(page,profile,density,phase,'portrait-'+(found===2?9:found===7?16:25),capture);
          }
          // 5×5 door swapping: two cards change, the board stays square/fixed.
          await page.waitForFunction(()=>document.querySelector('#picture-board .is-swap-door'));
          await check(page,profile,density,phase,'portrait-doors',capture);
        }
        await closeGame(page);await enter(page,'memory');await check(page,profile,density,phase,'position-4',capture);
        if(full) {
          for(const count of [4,16,36]) {
            await page.waitForFunction(n=>document.querySelectorAll('#picture-board button').length===n&&document.querySelector('#picture-board .memory-back')&&getComputedStyle(document.querySelector('#picture-board .memory-back')).opacity==='1',count);
            if(count>4)await check(page,profile,density,phase,'position-'+count,capture);
            const pairs=await page.evaluate(()=>{
              const groups={};[...document.querySelectorAll('#picture-board button')].forEach((b,i)=>{const src=b.querySelector('img')?.src;if(src)(groups[src]??=[]).push(i);});
              return Object.values(groups).flatMap(indices=>{const pairs=[];for(let i=0;i<indices.length;i+=2)pairs.push(indices.slice(i,i+2));return pairs;});
            });
            for(const[a,b]of pairs){await page.locator('#picture-board button').nth(a).tap();await page.locator('#picture-board button').nth(b).tap();}
            if(count<36)await page.waitForFunction(n=>document.querySelectorAll('#picture-board button').length!==n,count);
          }
          await page.locator('#btn-cheer-continue').waitFor({state:'visible'});await page.locator('#btn-cheer-continue').tap();
          await check(page,profile,density,phase,'position-result',capture);await page.locator('#btn-result-menu').tap();
        }else await closeGame(page);
        await page.locator('#btn-title-settings').tap();await check(page,profile,density,phase,'settings',capture);
        await page.locator('#btn-privacy').tap();await page.frameLocator('#legal-frame').locator('h1').first().waitFor();
        const legal=await page.locator('#legal-dialog').boundingBox();
        assert.ok(legal.y>=-.5&&legal.y+legal.height<=profile.physical[1]/density+.5,'legal document stays visible');
        if(phase==='after')assert.ok(legal.y>=profile.bars[0]/density-.5&&legal.y+legal.height<=(profile.physical[1]-profile.bars[1])/density+.5,'legal document respects native safe areas');
        await page.locator('#btn-legal-close').tap();await page.locator('#btn-settings-back').tap();
        await ctx.close();console.log(`${phase} ${profile.id} density ${density} passed`);
      }
    }
    // Same physical device, different OS densities: same physical boxes and
    // same logical type sizes/layout. Device aspect ratios may differ.
    for(const profile of profiles.filter(p=>p.densities.length>1))for(const label of coverOnly?['cover']:['menu','menu-music','start','puzzle','portrait-4','position-4','settings']) {
      const samples=report.checks.filter(c=>c.phase==='after'&&c.profile===profile.id&&c.label===label);
      const first=samples[0];
      for(const sample of samples.slice(1))for(const[selector,b]of Object.entries(first.boxes)) {
        const other=sample.boxes[selector];assert.ok(other,selector+' present at all densities');
        for(const property of ['x','y','w','h'])assert.ok(Math.abs(b[property]*first.density-other[property]*sample.density)<2,`${profile.id}/${label}/${selector}: density-invariant ${property}`);
        assert.equal(other.font,b.font,`${profile.id}/${label}/${selector}: logical font size`);
      }
      report.densityComparisons.push({profile:profile.id,label,densities:profile.densities,passed:true});
    }
    assert.deepEqual(report.errors,[]);
    fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify(report,null,2)+'\n');
    console.log(`PASS: ${report.checks.length} screens, ${report.densityComparisons.length} density comparisons, ${report.captures.length} PNGs, 0 errors`);
  }finally{await browser.close();for(const server of servers)await new Promise(resolve=>server.close(resolve));}
}
main().catch(error=>{console.error(error);process.exitCode=1;for(const server of servers)server.close();});
