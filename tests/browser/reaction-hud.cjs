// Real taps against the production build. The only simulated inputs are the
// platform, window/insets, seeded randomness and a clock for a real timeout.
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const sharp = require('sharp');
const root = path.resolve(__dirname, '../..');
const out = process.env.REACTION_REPORT_DIR;
const baseline = process.env.BASELINE_WEB;
const profiles = [
  {id:'reference', physical:[780,1688], density:2, insets:[48,0,96,0], native:true, capture:true},
  {id:'phone-density-2', physical:[1080,2340], density:2, insets:[72,0,144,0], native:true},
  {id:'phone-density-4', physical:[1080,2340], density:4, insets:[72,0,144,0], native:true},
  {id:'tall-phone', physical:[1080,2700], density:3, insets:[72,0,144,0], native:true},
  {id:'short-phone', physical:[1080,1944], density:3, insets:[72,0,144,0], native:true},
  {id:'tablet', physical:[1728,2304], density:3, insets:[72,0,144,0], native:true},
  {id:'wide-cutout', physical:[2304,1728], density:3, insets:[60,18,90,72], native:true},
  {id:'web', physical:[780,1688], density:2, insets:[0,0,0,0], native:false},
  {id:'web-safe-area', physical:[780,1688], density:2, insets:[48,0,96,40], native:false},
];
const report = {capturedAt:new Date().toISOString(), nativeDeviceTested:false, aabCreated:false,
  profiles, screens:[], captures:[], checks:[], errors:[]};
const servers = [];
const close = (a,b,message) => assert.ok(Math.abs(a-b)<.6, `${message}: ${a} vs ${b}`);
async function serve(dist) {
  const mime = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.webp':'image/webp',
    '.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2','.mp3':'audio/mpeg','.webm':'video/webm','.mp4':'video/mp4'};
  const server = http.createServer((req,res) => {
    const url = decodeURIComponent(new URL(req.url,'http://local').pathname);
    const file = path.resolve(dist, '.'+(url==='/'?'/index.html':url));
    if(!file.startsWith(dist+'/')||!fs.existsSync(file)||!fs.statSync(file).isFile())return res.writeHead(404).end();
    res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);
  });
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  servers.push(server);return `http://127.0.0.1:${server.address().port}`;
}
async function settle(page) {
  await page.evaluate(async()=>{
    await document.fonts.ready;
    await Promise.all([...document.images].filter(i=>i.getClientRects().length).map(i=>i.decode().catch(()=>{})));
  });
  await page.waitForTimeout(180);
}
async function record(page,profile,phase,label,capture=profile.capture) {
  await settle(page);
  const value = await page.evaluate(()=>{
    const rect = el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom};};
    const app=document.querySelector('#app'), frame=rect(app), scale=frame.w/parseFloat(getComputedStyle(app).width);
    const boxes={};
    for(const selector of ['#btn-mode-intro-back','#btn-back','#btn-pause','#btn-settings-back',
      '#mode-intro-title','.pick-intro-mark','#mode-intro-note','#btn-mode-intro-start',
      '#target-preview','#picture-board','.settings-body','#cheer-word','#cheer-clip','#btn-cheer-continue']) {
      const el=document.querySelector(selector);if(el?.getClientRects().length)boxes[selector]=rect(el);
    }
    const cheer=document.querySelector('#cheer'), r=rect(cheer), pseudo=getComputedStyle(cheer,'::before');
    const backdrop=pseudo.content==='none'?r:{x:r.x+parseFloat(pseudo.left)*scale,y:r.y+parseFloat(pseudo.top)*scale,
      w:parseFloat(pseudo.width)*scale,h:parseFloat(pseudo.height)*scale};
    return {frame,scale,boxes,backdrop,window:[innerWidth,innerHeight],
      overflow:document.querySelector('#screen-game').scrollHeight-document.querySelector('#screen-game').clientHeight};
  });
  const row={profile:profile.id,density:profile.density,phase,label,...value};report.screens.push(row);
  if(capture) {
    const file=`${phase}/${label}.png`;
    await page.screenshot({path:path.join(out,file),animations:'disabled'});
    const png=await sharp(path.join(out,file)).metadata();assert.equal(png.width,780);assert.equal(png.height,1688);
    report.captures.push({file,resolution:[png.width,png.height]});
  }
  return row;
}
async function waitReaction(page) {
  await page.locator('#cheer').waitFor({state:'visible'});
  await page.waitForFunction(()=>{
    const v=document.querySelector('#cheer-clip');return v.readyState>=2&&v.currentTime>=.7;
  });
}
async function main() {
  assert.ok(out&&baseline);assert.ok(!fs.existsSync(out),'preserve earlier captures');
  for(const phase of ['before','after'])fs.mkdirSync(path.join(out,phase),{recursive:true});
  const urls={before:await serve(baseline),after:await serve(path.join(root,'dist'))};
  const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--mute-audio']});
  report.browser=browser.version();
  try {
    for(const phase of ['before','after'])for(const profile of phase==='before'?[profiles[0]]:profiles) {
      const d=profile.density;
      const ctx=await browser.newContext({viewport:{width:profile.physical[0]/d,height:profile.physical[1]/d},deviceScaleFactor:d,isMobile:true,hasTouch:true});
      await ctx.addInitScript(({profile})=>{
        if(profile.native)window.CapacitorCustomPlatform={name:'android'};
        const prefs=JSON.stringify({musicOn:false,soundOn:false,hapticsOn:false});
        localStorage.setItem('taptopick.preferences.v1',prefs);localStorage.setItem('CapacitorStorage.taptopick.preferences.v1',prefs);
        document.addEventListener('DOMContentLoaded',()=>{
          ['top','right','bottom','left'].forEach((side,i)=>document.documentElement.style.setProperty(
            (profile.native?'--android-game-inset-':'--safe-area-inset-')+side,profile.insets[i]/profile.density+'px'));
        },{once:true});
        let seed=930;Math.random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
      },{profile});
      const page=await ctx.newPage();page.setDefaultTimeout(20000);page.on('pageerror',e=>report.errors.push(e.message));
      await page.goto(urls[phase]);await page.locator('#mode-unit').waitFor({state:'visible'});
      for(const mode of ['unit','montage','memory']) {
        await page.locator('#mode-'+mode).tap();await record(page,profile,phase,mode+'-start');
        await page.locator('#btn-mode-intro-start').tap();await record(page,profile,phase,mode+'-play');
        if(mode==='unit'&&profile.capture) {
          const src=await page.locator('.unit-reveal-base').getAttribute('src');
          const stem=src.split('/').pop().replace(/-[A-Za-z0-9_-]+\.webp$/,'');
          const ids={Bb:'bb',Ha:'ha',Hoo:'hoo',Ja:'ja',Pino:'pino',Tapee:'tapee',Tepee:'tepee',HapeeCarrot:'hapee-carrot',HapeeCarrot02:'hapee-carrot-02',TapeeBack:'tapee-back',TepeeBack:'tepee-back',HooopeeBack:'hooopee-back',ComicA114:'comic-a-1-1-4',ComicA224:'comic-a-2-2-4',ComicA424:'comic-a-4-2-4',ComicA1634:'comic-a-16-3-4'};
          const tiles=page.locator('#picture-board button');
          const correct=await tiles.evaluateAll((bs,id)=>bs.flatMap((b,i)=>b.getAttribute('aria-label')===id+' picture piece'?[i]:[]),ids[stem]);
          assert.ok(correct.length===9||correct.length===12);
          for(const i of correct)await tiles.nth(i).tap();await waitReaction(page);
          await record(page,profile,phase,'puzzle-success');
          await page.locator('#btn-cheer-continue').tap();await page.locator('#btn-result-menu').tap();
        } else await page.locator('#btn-back').tap();
      }
      await page.locator('#btn-title-settings').tap();await record(page,profile,phase,'settings');await page.locator('#btn-settings-back').tap();
      await page.clock.install();await page.locator('#mode-memory').tap();await page.locator('#btn-mode-intro-start').tap();
      await settle(page);await page.clock.runFor(3300);await page.clock.fastForward(61000);
      await page.locator('#cheer').waitFor({state:'visible'});await page.clock.resume();await waitReaction(page);
      assert.equal(await page.locator('#cheer-word').textContent(),'TRY AGAIN');
      const reaction=await record(page,profile,phase,'position-try-again');
      if(phase==='after') {
        close(reaction.backdrop.x,0,profile.id+' backdrop left');close(reaction.backdrop.y,0,profile.id+' backdrop top');
        close(reaction.backdrop.w,reaction.window[0],profile.id+' backdrop width');close(reaction.backdrop.h,reaction.window[1],profile.id+' backdrop height');
        for(const selector of ['#cheer-word','#cheer-clip','#btn-cheer-continue']) {
          const b=reaction.boxes[selector],f=reaction.frame;
          assert.ok(b.x>=f.x-.6&&b.right<=f.right+.6&&b.y>=f.y-.6&&b.bottom<=f.bottom+.6,selector+' safe content');
        }
        const screens=report.screens.filter(r=>r.phase===phase&&r.profile===profile.id);
        const first=screens.find(r=>r.label==='unit-start').boxes['#btn-mode-intro-back'];
        for(const row of screens.filter(r=>/-start$|-play$|^settings$/.test(r.label))) {
          const selector=row.label==='settings'?'#btn-settings-back':row.label.endsWith('-start')?'#btn-mode-intro-back':'#btn-back';
          const b=row.boxes[selector];close(b.x,first.x,profile.id+'/'+row.label+' back x');close(b.y,first.y,profile.id+'/'+row.label+' back y');
          close(b.w,40*row.scale,'button width');close(b.h,40*row.scale,'button height');
          if(row.boxes['#btn-pause']) {
            const pause=row.boxes['#btn-pause'];close(pause.y,b.y,'pause y');
            const safeLeft=profile.native?0:Math.max(10,profile.insets[3]/d);
            const safeRight=profile.native?0:Math.max(10,profile.insets[1]/d);
            close(b.x-row.frame.x-safeLeft*row.scale,row.frame.right-pause.right-safeRight*row.scale,'mirrored rail');
            assert.equal(row.overflow,0,profile.id+' no gameplay scroll');
          }
        }
        report.checks.push({profile:profile.id,hudAligned:true,backdropFullWindow:true,contentSafe:true});
      }
      await page.locator('#btn-cheer-continue').tap();await page.locator('#result-layer').waitFor({state:'visible'});
      await ctx.close();console.log(phase+' '+profile.id+' passed');
    }
    // Same reference build/content: only buttons and decorative paint move.
    for(const before of report.screens.filter(r=>r.phase==='before')) {
      const after=report.screens.find(r=>r.phase==='after'&&r.profile===before.profile&&r.label===before.label);
      for(const [selector,b]of Object.entries(before.boxes))if(!/^#btn-(back|pause|settings-back|mode-intro-back)$/.test(selector)) {
        for(const key of ['x','y','w','h'])close(b[key],after.boxes[selector][key],before.label+'/'+selector+' unchanged '+key);
      }
    }
    for(const label of ['unit-start','unit-play','montage-play','memory-play','settings']) {
      const a=report.screens.find(r=>r.phase==='after'&&r.profile==='phone-density-2'&&r.label===label);
      const b=report.screens.find(r=>r.phase==='after'&&r.profile==='phone-density-4'&&r.label===label);
      for(const [selector,box]of Object.entries(a.boxes))for(const key of ['x','y','w','h'])close(box[key]*2,b.boxes[selector][key]*4,'density-invariant '+selector+' '+key);
    }
    for(const label of ['position-try-again','puzzle-success']) {
      const before=await sharp(path.join(out,'before',label+'.png')).removeAlpha().raw().toBuffer({resolveWithObject:true});
      const after=await sharp(path.join(out,'after',label+'.png')).removeAlpha().raw().toBuffer({resolveWithObject:true});
      for(const [x,y]of [[2,2],[777,2],[2,1685],[777,1685]])for(let c=0;c<3;c++) {
        assert.equal(before.data[(y*780+x)*3+c],255,'old inset was white');
        assert.ok(Math.abs(after.data[(y*780+x)*3+c]-82)<=1,'new inset is dark');
      }
    }
    assert.deepEqual(report.errors,[]);
    fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
    console.log(`PASS: ${report.screens.length} screens; ${report.checks.length} profiles; ${report.captures.length} PNGs; no errors`);
  } finally {
    await browser.close();for(const server of servers)await new Promise(resolve=>server.close(resolve));
  }
}
main().catch(e=>{console.error(e);process.exitCode=1;for(const server of servers)server.close();});
