// Pixel-sized before/after captures of the real app. No native device or AAB.
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const assert = require('node:assert/strict'), crypto = require('node:crypto');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '../..');
const baseline = process.env.BASELINE_WEB, out = process.env.NEUTRAL_REPORT_DIR;
const beforeOnly = process.env.NEUTRAL_BEFORE_ONLY === '1';
const accentMode = process.env.NEUTRAL_ACCENTS === '1';
const accentAuditMode = process.env.NEUTRAL_ACCENT_AUDIT === '1';
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const report = { capturedAt: new Date().toISOString(), pngSize: [780,1688], nativeDeviceTested: false, screens: {}, checks: [], errors: [] };
const servers = [];
async function serve(dir) {
  const mime = {'.html':'text/html','.css':'text/css','.js':'text/javascript','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2','.mp3':'audio/mpeg','.mp4':'video/mp4','.webm':'video/webm'};
  const server = http.createServer((req,res) => {
    const pathname = decodeURIComponent(new URL(req.url,'http://local').pathname);
    const file = path.resolve(dir,'.'+(pathname==='/'?'/index.html':pathname));
    if (!file.startsWith(dir+'/') || !fs.existsSync(file) || !fs.statSync(file).isFile()) return res.writeHead(404).end();
    res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream'); fs.createReadStream(file).pipe(res);
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve)); servers.push(server);
  return `http://127.0.0.1:${server.address().port}`;
}
async function settle(page) {
  await page.evaluate(async()=>{
    await document.fonts.ready;
    await Promise.all([...document.images].filter(i=>i.getBoundingClientRect().width).map(i=>i.decode().catch(()=>{})));
  });
  await page.waitForTimeout(130);
}
async function capture(page, phase, name, extra=[]) {
  await settle(page);
  // Pause decorative animations at the same instant in both builds. No style
  // replacement or screenshot animation disabling that could finish a round.
  await page.evaluate(()=>document.getAnimations().forEach(a=>{if(a.effect?.target?.closest('#cheer'))return;a.pause();a.currentTime=150;}));
  const value = await page.evaluate(extra=>{
    const cssKeys=['fontFamily','fontSize','fontWeight','lineHeight','letterSpacing','padding','margin','borderWidth','borderRadius','gap'];
    const paintKeys=['color','backgroundColor','backgroundImage','boxShadow','textShadow','filter','outlineColor','borderColor','animationName','animationDuration','animationIterationCount'];
    const gameKeys=['color','backgroundColor','backgroundImage','boxShadow','textShadow','filter','outlineColor','borderColor','animationName','animationDuration','animationIterationCount','opacity','transform'];
    const visible=el=>el && el.getClientRects().length && getComputedStyle(el).visibility!=='hidden';
    const nodes=[...document.querySelectorAll('.screen:not(.hidden), .screen:not(.hidden) *, #result-layer:not(.hidden), #result-layer:not(.hidden) *, #help-layer:not(.hidden), #help-layer:not(.hidden) *, .legal-dialog[open], .legal-dialog[open] *, .storage-notice:not([hidden]), .storage-notice:not([hidden]) *')];
    const boxes={};
    for (const [i,el] of nodes.entries()) {
      if(!visible(el))continue;
      const r=el.getBoundingClientRect(),css=getComputedStyle(el);
      const key=el.id ? '#'+el.id : `${el.tagName}.${el.className?.baseVal??el.className}:${i}`;
      boxes[key]={x:r.x,y:r.y,w:r.width,h:r.height,type:Object.fromEntries(cssKeys.map(k=>[k,css[k]]))};
    }
    const paints={},game={};
    const selectors=['html','body','#app','#app::before','.screen:not(.hidden)','.brand-mark','.mode-btn','.mode-name','.mode-desc','#btn-title-settings','.montage-status','.icon-btn','.pick-intro-mark','.pick-intro-body h2','.wood-btn','.wood-btn::before','.help-panel','.result-panel','.result-primary','.result-kicker','.result-best','#btn-pause-menu','#btn-pause-music','#btn-result-menu','.settings-screen .switch-row','.settings-screen .switch','.settings-screen .switch[aria-checked="true"]','.switch-knob','.progress-track','.progress-track i','.memory-target-badge','.settings-title','.legal-dialog',...extra];
    for(const s of selectors) {
      const [sel,pseudo]=s.split('::'), el=[...document.querySelectorAll(sel)].find(visible); if(!el)continue;
      const c=getComputedStyle(el,pseudo?'::'+pseudo:null); paints[s]=Object.fromEntries(paintKeys.map(k=>[k,c[k]]));
    }
    for (const [i,el] of [...document.querySelectorAll('.picture-tile,.picture-tile img,.picture-tile .memory-back,.picture-tile .swap-door,.unit-reveal img,.unit-reveal-grid line,.unit-reveal-grid rect,.life-heart,.damage-flash')].entries()) {
      if(!visible(el))continue;
      const c=getComputedStyle(el),key=el.tagName+'.'+(el.className?.baseVal??el.className)+':'+i;
      game[key]=Object.fromEntries([...gameKeys,'fill','stroke','strokeWidth'].map(k=>[k,c[k]]));
      if(el.matches('.picture-tile')) {
        const p=getComputedStyle(el,'::before'); game[key+'::before']=Object.fromEntries(gameKeys.map(k=>[k,p[k]]));
      }
    }
    const variables={};
    const rootCss=getComputedStyle(document.documentElement);
    for(const key of ['--paper-lit','--slab','--slab-hard','--go','--warm','--ring-ok','--ring-bad',...Array.from({length:9},(_,i)=>'--v'+(i+1))])variables[key]=rootCss.getPropertyValue(key).trim();
    return {boxes,paints,game,variables,boardCount:document.querySelectorAll('#picture-board button').length};
  },extra);
  const file=`${phase}/${name}.png`;
  await page.screenshot({path:path.join(out,file)});
  report.screens[phase+'/'+name]={file,...value};
  await page.evaluate(()=>document.getAnimations().forEach(a=>a.play()));
  console.log(`${phase} ${name}`);
}
async function enter(page,mode){await page.locator('#mode-'+mode).click();await page.locator('#btn-mode-intro-start').click();await settle(page);}
async function captureRun(browser,url,phase,native=false) {
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  await context.addInitScript(native=>{
    if(native)window.CapacitorCustomPlatform={name:'android'};
    const prefs=JSON.stringify({musicOn:false,soundOn:false,hapticsOn:false});
    localStorage.setItem('taptopick.preferences.v1',prefs);localStorage.setItem('CapacitorStorage.taptopick.preferences.v1',prefs);
    let seed=930;Math.random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
  },native);
  const page=await context.newPage();page.setDefaultTimeout(16000);page.on('pageerror',e=>report.errors.push(e.message));
  await page.goto(url);await capture(page,phase,'01-studio');
  await page.locator('#screen-splash').waitFor({state:'visible'});await capture(page,phase,'02-cover');
  await page.locator('#mode-unit').waitFor({state:'visible'});await capture(page,phase,'03-menu');
  if(accentAuditMode) {
    // Display the existing, normally hidden recovery UI only in this isolated
    // browser. This simulates its paint, not a real save failure or a reset.
    await page.evaluate(()=>{
      const notice=document.getElementById('storage-notice');
      notice.querySelector('p').textContent='Progress not saved yet.\nKeep the app open and retry.';
      notice.hidden=false;
    });
    await capture(page,phase,'16-storage-retry',['.storage-notice','.storage-notice button']);
    await page.evaluate(()=>document.getElementById('storage-notice').hidden=true);
  }
  await page.locator('#mode-unit').click();await capture(page,phase,'04-start');
  await page.locator('#btn-mode-intro-start').click();await capture(page,phase,'05-puzzle');
  const buttons=page.locator('#picture-board button');
  // The seeded first picture has a stable artwork-specific basename. Resolve
  // its pieces by the actual image, not the shared display character name.
  const src=await page.locator('.unit-reveal-base').getAttribute('src');
  const stem=src.split('/').pop().replace(/-[A-Za-z0-9_-]+\.webp$/,'');
  const ids={Bb:'bb',Ha:'ha',Hoo:'hoo',Ja:'ja',Pino:'pino',Tapee:'tapee',Tepee:'tepee',HapeeCarrot:'hapee-carrot',HapeeCarrot02:'hapee-carrot-02',TapeeBack:'tapee-back',TepeeBack:'tepee-back',HooopeeBack:'hooopee-back',ComicA114:'comic-a-1-1-4',ComicA224:'comic-a-2-2-4',ComicA424:'comic-a-4-2-4',ComicA1634:'comic-a-16-3-4'};
  const indices=await buttons.evaluateAll((bs,id)=>bs.flatMap((b,i)=>b.getAttribute('aria-label')===id+' picture piece'?[i]:[]),ids[stem]);
  assert.ok(indices.length===9||indices.length===12,'all target pieces resolved: '+stem+' / '+ids[stem]+' / '+indices.length);
  await buttons.nth(indices[0]).tap();await page.waitForTimeout(280);await capture(page,phase,'06-puzzle-correct');
  await page.locator('#btn-pause').click();await capture(page,phase,'07-pause');await page.locator('#btn-resume').click();
  for(const i of indices.slice(1))await buttons.nth(i).tap();
  await page.locator('#btn-cheer-continue').waitFor({state:'visible'});await page.locator('#btn-cheer-continue').click();
  await page.locator('#result-layer').waitFor({state:'visible'});await capture(page,phase,'08-puzzle-result');
  await page.locator('#btn-result-menu').click();await enter(page,'montage');await capture(page,phase,'09-portrait');
  const answer=await page.evaluate(()=>[...document.querySelectorAll('#picture-board img')].findIndex(i=>i.src===document.querySelector('#target-preview img').src));
  await page.locator('#picture-board button').nth((answer+1)%4).tap();
  await page.locator('.is-answer-hint').waitFor({state:'visible'});await capture(page,phase,'10-portrait-wrong',['.is-answer-hint','.is-wrong']);
  await page.locator('#picture-board button').nth(answer).tap();
  await page.waitForFunction(()=>!document.querySelector('.is-answer-hint'));
  await page.locator('#btn-back').click();await enter(page,'memory');
  await page.waitForFunction(()=>document.querySelector('#picture-board .memory-back')&&getComputedStyle(document.querySelector('#picture-board .memory-back')).opacity==='1');
  await capture(page,phase,'11-position');
  const pairs=await page.evaluate(()=>{const g={};[...document.querySelectorAll('#picture-board button')].forEach((b,i)=>(g[b.querySelector('img').src]??=[]).push(i));return Object.values(g);});
  await page.locator('#picture-board button').nth(pairs[0][0]).tap();await page.locator('#picture-board button').nth(pairs[0][1]).tap();
  await page.waitForTimeout(300);await capture(page,phase,'12-position-matched');
  await page.locator('#btn-back').click();await page.locator('#btn-title-settings').click();await capture(page,phase,'13-settings');
  await page.locator('[data-setting="haptics"]').tap();await page.waitForTimeout(200);await capture(page,phase,'14-settings-on');
  await page.locator('#btn-privacy').click();await page.frameLocator('#legal-frame').locator('h1').first().waitFor();await capture(page,phase,'15-privacy');
  await context.close();
}
function compare() {
  const accentSelectors=new Set(['.pick-intro-mark','.wood-btn','.wood-btn::before','.settings-screen .switch','.settings-screen .switch[aria-checked="true"]','.switch-knob']);
  const names=Object.keys(report.screens).filter(k=>k.startsWith('before/')).map(k=>k.slice(7));
  for(const name of names) {
    const a=report.screens['before/'+name],b=report.screens['after/'+name];assert.ok(b,name+' captured after');
    assert.deepEqual(Object.keys(b.boxes),Object.keys(a.boxes),name+' same visible elements');
    for(const [key,box] of Object.entries(a.boxes)) {
      const other=b.boxes[key];assert.deepEqual(other.type,box.type,name+' '+key+' font/spacing unchanged');
      for(const k of ['x','y','w','h'])assert.ok(Math.abs(other[k]-box[k])<.1,name+' '+key+' '+k+' unchanged');
    }
    assert.deepEqual(b.game,a.game,name+' gameplay paint/effects unchanged');
    assert.deepEqual(b.variables,a.variables,name+' gameplay tokens unchanged');
    assert.equal(b.boardCount,a.boardCount,name+' board count unchanged');
    for(const [key,c] of Object.entries(b.paints)) {
      if(['.brand-mark','html','body','#app','#app::before','.screen:not(.hidden)','.progress-track i','.is-answer-hint','.is-wrong'].includes(key)||(accentMode&&accentSelectors.has(key)))continue;
      assert.equal(c.backgroundImage,'none',name+' '+key+' no UI gradient');
      assert.equal(c.boxShadow,'none',name+' '+key+' no UI shadow');
    }
    report.checks.push({screen:name,layoutAndTypographyUnchanged:true,gameplayPaintUnchanged:true,neutralSurfacesFlat:true});
  }
  const menu=report.screens['after/03-menu'].paints;
  assert.equal(menu['html'].backgroundColor,'rgb(255, 255, 255)');
  assert.equal(menu['#app'].backgroundColor,'rgb(255, 255, 255)');
  assert.equal(menu['.brand-mark'].filter,'none');
  assert.equal(menu['.mode-btn'].backgroundColor,'rgb(245, 246, 248)');
  assert.equal(menu['.mode-btn'].borderColor,'rgb(205, 210, 218)');
  assert.equal(menu['.mode-name'].color,accentMode?'rgb(44, 127, 224)':'rgb(54, 60, 70)');
  assert.equal(menu['.mode-desc'].color,'rgb(98, 107, 120)');
  if(accentMode)compareOriginalAccents();
  else {
    assert.equal(report.screens['after/04-start'].paints['.wood-btn'].backgroundColor,'rgb(245, 246, 248)');
    assert.equal(report.screens['after/08-puzzle-result'].paints['.result-primary'].color,'rgb(54, 60, 70)');
    assert.equal(report.screens['after/14-settings-on'].paints['.settings-screen .switch'].backgroundColor,'rgb(237, 240, 244)');
  }
  assert.equal(report.errors.length,0,JSON.stringify(report.errors));
}
function compareOriginalAccents() {
  // Evidence from the immutable pre-neutral build, not guessed new colors.
  const original=JSON.parse(fs.readFileSync(path.join(root,'docs/research/2026-10-01-neutral-ui/final/verification.json'),'utf8'));
  const paint=name=>report.screens['after/'+name].paints;
  const restored=[];
  for(const [screen,selector,properties] of [
    ['01-studio','.screen:not(.hidden)',['backgroundColor']],
    ['03-menu','.mode-name',['color']],
    ['04-start','.pick-intro-mark',['color','backgroundImage','boxShadow']],
    ['04-start','.wood-btn',['color','backgroundImage','boxShadow','textShadow']],
    ['04-start','.wood-btn::before',['backgroundImage']],
    ['07-pause','.wood-btn',['color','backgroundImage','boxShadow']],
    ['08-puzzle-result','.result-primary',['color']],
    ['08-puzzle-result','.result-best',['backgroundColor']],
    ['08-puzzle-result','.wood-btn',['color','backgroundImage','boxShadow']],
    ['11-position','.memory-target-badge',['color']],
    ['12-position-matched','.progress-track i',['backgroundImage']],
    ['13-settings','.settings-title',['color']],
    ['13-settings','.settings-screen .switch',['backgroundColor','backgroundImage','borderColor','boxShadow']],
    ['13-settings','.switch-knob',['backgroundColor','boxShadow']]
  ]) {
    const before=original.screens['before/'+screen].paints[selector],after=paint(screen)[selector];
    for(const property of properties)assert.equal(after[property],before[property],screen+' '+selector+' original '+property);
    restored.push({screen,selector,properties});
  }
  assert.equal(paint('04-start')['.pick-intro-body h2'].color,'rgb(212, 54, 0)');
  for(const [screen,selector] of [['03-menu','#btn-title-settings'],['07-pause','#btn-pause-menu'],['07-pause','#btn-pause-music'],['08-puzzle-result','#btn-result-menu']])assert.equal(paint(screen)[selector].color,'rgb(212, 54, 0)');
  assert.equal(paint('09-portrait')['.montage-status'].color,'rgb(255, 80, 0)');
  assert.equal(paint('10-portrait-wrong')['.montage-status'].color,'rgb(255, 80, 0)');
  if(accentAuditMode) {
    const retry=paint('16-storage-retry')['.storage-notice button'];
    assert.equal(retry.backgroundColor,'rgb(34, 160, 63)');
    assert.equal(retry.color,'rgb(255, 255, 255)');
    report.additionalAccentAudit={settings:'original orange',portraitStage:'original orange',retry:'original green and white',storageFailureSimulated:true};
  }
  assert.equal(paint('08-puzzle-result')['.result-kicker'].color,'rgb(255, 80, 0)');
  assert.equal(paint('14-settings-on')['.settings-screen .switch[aria-checked="true"]'].backgroundImage,'linear-gradient(rgb(34, 160, 63), rgb(22, 117, 44))');
  report.restoredAccents=restored;
}
async function main() {
  assert.ok(out&&baseline);assert.ok(!fs.existsSync(out),'Never overwrite old research captures');
  fs.mkdirSync(path.join(out,'before'),{recursive:true});fs.mkdirSync(path.join(out,'after'));
  const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--mute-audio']});
  report.browser=browser.version();
  try {
    await captureRun(browser,await serve(baseline),'before');
    if(!beforeOnly){await captureRun(browser,await serve(path.join(root,'dist')),'after');compare();}
    const mimeUnchanged=[],scriptsUnchanged=[];
    const assetFiles=fs.readdirSync(path.join(baseline,'assets'),{recursive:true});
    for(const file of assetFiles) {
      if(file.endsWith('.css'))continue;
      const old=path.join(baseline,'assets',file),current=path.join(root,'dist/assets',file);
      if(!fs.statSync(old).isFile())continue;
      if(file.endsWith('.js')) {
        const name=file.split('-')[0],candidate=fs.readdirSync(path.join(root,'dist/assets')).find(f=>f.startsWith(name+'-')&&f.endsWith('.js'));
        const normalize=s=>s.replace(/(index|web)-[A-Za-z0-9_-]+\.(js|css)/g,'$1-HASH.$2');
        assert.ok(candidate,'script retained '+name);
        assert.equal(normalize(fs.readFileSync(old,'utf8')),normalize(fs.readFileSync(path.join(root,'dist/assets',candidate),'utf8')),'logic unchanged; only stylesheet/bundle hash references '+name);
        scriptsUnchanged.push(name);continue;
      }
      assert.ok(fs.existsSync(current),'original asset retained '+file);assert.equal(hash(old),hash(current),'unchanged asset '+file);mimeUnchanged.push(file);
    }
    report.unchangedAssets=mimeUnchanged;
    report.unchangedScriptLogic=scriptsUnchanged;
    fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify(report,null,2)+'\n');
    console.log(JSON.stringify({screens:report.checks.length,pngs:Object.keys(report.screens).length,unchangedAssets:mimeUnchanged.length,errors:report.errors}));
  } finally {await browser.close();for(const server of servers)server.close();}
}
async function verifyGallery() {
  const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
  try {
    const page=await browser.newPage({viewport:{width:1000,height:1500}});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    const galleryDir=process.env.NEUTRAL_GALLERY_DIR||path.join(root,'docs/research/2026-10-01-neutral-ui');
    const url=await serve(galleryDir);
    await page.goto(url);
    await page.evaluate(async()=>{
      const images=[...document.images];
      for(const image of images)image.loading='eager';
      await Promise.all(images.map(image=>image.decode()));
    });
    assert.equal(await page.locator('main section').count(),15);
    assert.equal(await page.locator('main img').count(),30);
    const sizes=await page.locator('main img').evaluateAll(images=>images.map(image=>[image.naturalWidth,image.naturalHeight]));
    assert.ok(sizes.every(([w,h])=>w===780&&h===1688),'all gallery PNGs load at exact requested size');
    const localLinks=await page.locator('a[href]:not([href^="#"])').evaluateAll(links=>links.map(link=>link.getAttribute('href')));
    for(const file of localLinks)assert.ok(fs.existsSync(path.join(galleryDir,file)),file+' exists');
    assert.deepEqual(errors,[]);
    await page.locator('[id="03-menu"]').scrollIntoViewIfNeeded();
    await page.screenshot({path:'/private/tmp/taptotest-neutral-gallery-review.png'});
    console.log(JSON.stringify({gallerySections:15,loadedPNGs:30,pngSize:[780,1688],errors}));
  } finally {await browser.close();for(const server of servers)server.close();}
}
(process.argv.includes('--gallery')?verifyGallery():main()).catch(e=>{console.error(e);for(const server of servers)server.close();process.exitCode=1;});
