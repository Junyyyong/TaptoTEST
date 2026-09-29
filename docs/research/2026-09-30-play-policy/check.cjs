// Run with a NEW CAPTURE_OUT path. Uses isolated browser profiles; never user saves.
const {chromium}=require('playwright');
const fs=require('node:fs/promises');
const path=require('node:path');
const assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../../..');
const out=process.env.CAPTURE_OUT;
const prefs='taptopick.preferences.v1',records='taptopick.records.v1';
const sample=JSON.stringify({version:1,bestByKey:{'unit:tepee:9':{mode:'unit',won:true,elapsedMs:6600,mistakes:0,found:9,total:9,stage:1,score:1500,characterId:'tepee'}}});
const report={capturedAt:new Date().toISOString(),baseline:'36848af66490811127803f5400b3553e1df1982c',reference:'cae2e49b5af230a95b2f1890daf01b47b321b621',conditions:{locale:'en-US',timezone:'Asia/Seoul',viewport:'390×844',deviceScaleFactor:2},layouts:[],checks:[],errors:[]};
const metrics=()=>{
 const read=selector=>{const el=document.querySelector(selector),r=el.getBoundingClientRect(),s=getComputedStyle(el);return{x:r.x,y:r.y,width:r.width,height:r.height,fontSize:s.fontSize,fontWeight:s.fontWeight,fontFamily:s.fontFamily,lineHeight:s.lineHeight};};
 return Object.fromEntries(['.settings-links','#btn-privacy','#btn-licenses'].map(s=>[s,read(s)]));
};
async function settings(page){
 await page.locator('#btn-title-settings').waitFor({state:'visible'});await page.locator('#btn-title-settings').click();
 await page.evaluate(async()=>{
  await document.fonts.ready;
  // TEN starts its screen transition in requestAnimationFrame. Let it start,
  // then await finite animations naturally before comparing settled geometry.
  await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  await Promise.all(document.getAnimations().filter(a=>a.effect?.getTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{})));
 });
}
async function capture(page,name){await page.screenshot({path:path.join(out,name)});}
async function snapshot(page){return page.evaluate(()=>Object.fromEntries(Object.entries(localStorage)));}

(async()=>{
 assert.ok(out,'Specify a fresh CAPTURE_OUT directory');await fs.mkdir(out,{recursive:false});
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 report.browser=browser.version();
 try {
  for(const width of [390,320,768])for(const on of [false,true]){
   const height=width===390?844:width===320?568:1024;
   const compare=[];
   for(const [name,url,key] of [['TEN','http://127.0.0.1:5241/','makezero.settings.v1'],['TEST','http://127.0.0.1:5239/',prefs]]){
    const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:2,isMobile:true,hasTouch:true,locale:'en-US',timezoneId:'Asia/Seoul'});
    await context.addInitScript(({key,on,sample,records})=>{if(window===window.top){localStorage.setItem(key,JSON.stringify({musicOn:false,soundOn:false,hapticsOn:on,tutorialDone:true}));localStorage.setItem(records,sample);Object.defineProperty(navigator,'vibrate',{value:undefined,configurable:true});}}, {key,on,sample,records});
    const external=[];await context.route('**/*',route=>{const u=route.request().url();if(/^https?:/.test(u)&&!u.startsWith(new URL(url).origin)){external.push(u);return route.abort();}return route.continue();});
    const page=await context.newPage();page.on('pageerror',e=>report.errors.push(`${name}: ${e.message}`));
    await page.goto(url);await settings(page);const initial=await snapshot(page);const layout=await page.evaluate(metrics);
    if(name==='TEST')assert.equal(initial[records],sample);
    compare.push(layout);report.layouts.push({name,width,height,haptics:on,layout});
    if(width===390&&!on)await capture(page,name==='TEN'?'reference-ten-settings.png':'after-settings.png');
    if(width===320&&on&&name==='TEST')await capture(page,'after-settings-small-note.png');
    for(const [button,title] of [['btn-privacy','Privacy policy'],['btn-licenses','Open-source licenses']]){
     await page.locator('#'+button).click();const frame=page.frameLocator('#legal-frame');await frame.locator('h1').first().waitFor();
     const dialog=await page.locator('#legal-dialog').boundingBox();
     if(width===390&&!on)report.layouts.at(-1)[button]=dialog;
     assert.ok(dialog.x>=0&&dialog.y>=0&&dialog.width<=width&&dialog.height<=height);
     const overflow=await frame.locator('html').evaluate(el=>el.scrollWidth>el.clientWidth+1);assert.equal(overflow,false);
     if(name==='TEST'&&width===390&&!on)await capture(page,button==='btn-privacy'?'after-privacy.png':'after-licenses.png');
     if(button==='btn-privacy'){
      await frame.locator('a[href="#korean"]').click();
      if(name==='TEST'&&width===390&&!on)await capture(page,'after-privacy-korean.png');
      await frame.locator('h1').first().evaluate(el=>el.focus());
      await frame.locator('a[href="#korean"]').press('Escape');
     }else await page.locator('#btn-legal-close').click();
     await page.waitForFunction(()=>!document.querySelector('#legal-dialog').open);
     assert.equal(await page.locator('#screen-settings').isVisible(),true);
     await page.waitForFunction(id=>document.activeElement.id===id,button);
    }
    assert.deepEqual(await snapshot(page),initial);assert.equal(external.length,0);
    if(name==='TEST'&&width===390&&!on){
     // Escape on the parent dialog must not also close Settings.
     await page.locator('#btn-privacy').click();await page.locator('#btn-legal-close').press('Escape');
     await page.waitForFunction(()=>!document.querySelector('#legal-dialog').open);assert.equal(await page.locator('#screen-settings').isVisible(),true);
     await page.locator('#btn-settings-back').click();
     for(const [mode,count] of [['unit',49],['montage',4],['memory',4]]){
      await page.locator('#mode-'+mode).click();await page.locator('#btn-mode-intro-start').click();
      assert.equal(await page.locator('#picture-board button').count(),count);await page.locator('#btn-back').click();
     }
     assert.deepEqual(await snapshot(page),initial);
    }
    await context.close();
   }
   // Same type/weight/position/touch size on the requested phone; responsive cases must fit.
   if(width===390){for(const selector of Object.keys(compare[0]))for(const key of ['x','y','width','height','fontSize','fontWeight','fontFamily'])assert.deepEqual(compare[1][selector][key],compare[0][selector][key],`${selector} ${key} haptics=${on}`);}
  }
  report.checks.push('TEN/TEST exact legal link metrics at 390×844 (vibration off and unsupported/on)','320×568 and 768×1024: local documents fit; close remains accessible','Privacy/KO/licenses, Close and both Escape paths restore Settings and opener focus','No external HTTP requests; document viewing preserves all localStorage values','Three game start boards retain 49/4/4 tiles');
  const before=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,locale:'en-US',timezoneId:'Asia/Seoul'});
  await before.addInitScript(({prefs,records,sample})=>{if(window===window.top){localStorage.setItem(prefs,JSON.stringify({musicOn:false,soundOn:false,hapticsOn:false,tutorialDone:true}));localStorage.setItem(records,sample);}}, {prefs,records,sample});
  const beforePage=await before.newPage();await beforePage.goto('http://127.0.0.1:5240/');await settings(beforePage);assert.equal(await beforePage.locator('#btn-privacy').count(),0);await capture(beforePage,'before-settings.png');await before.close();

  // Real Capacitor JS adapter with a simulated native Preferences bridge, not a real Android device.
  const native=new Map();let failReads=true,failWrites=false;
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,locale:'en-US',timezoneId:'Asia/Seoul'});
  await context.exposeBinding('testNativePreferences',async(_source,method,options)=>{
   if(method==='get'){if(failReads)throw Error('Simulated unavailable bridge');return{value:native.get(options.key)??null};}
   if(failWrites)throw Error('Simulated full storage');await new Promise(r=>setTimeout(r,15));native.set(options.key,options.value);
  });
  await context.addInitScript(({prefs,records,sample})=>{
   if(window!==window.top)return;
   if(!localStorage.getItem(prefs))localStorage.setItem(prefs,JSON.stringify({musicOn:false,soundOn:false,hapticsOn:false,tutorialDone:true}));
   if(!localStorage.getItem(records))localStorage.setItem(records,sample);
   window.androidBridge={};window.Capacitor={PluginHeaders:[{name:'Preferences',methods:[{name:'get',rtype:'promise'},{name:'set',rtype:'promise'}]}],nativePromise:(_plugin,method,options)=>window.testNativePreferences(method,options)};
  },{prefs,records,sample});
  const page=await context.newPage();page.on('pageerror',e=>report.errors.push('Native simulation: '+e.message));await page.goto('http://127.0.0.1:5239/');
  await page.locator('.storage-blocking').waitFor();assert.equal(native.size,0);assert.equal(await page.locator('#app').evaluate(el=>el.inert),true);await capture(page,'storage-read-retry.png');
  failReads=false;await page.locator('#storage-notice button').click();await page.locator('#storage-notice').waitFor({state:'hidden'});
  assert.equal(await page.locator('#storage-notice').evaluate(el=>getComputedStyle(el).display),'none');
  assert.equal(await page.locator('#storage-notice').evaluate(el=>el.classList.contains('storage-blocking')),false);
  assert.equal(await page.locator('#app').evaluate(el=>el.inert),false);
  // No force clicks: a dismissed blocking panel must release normal app input.
  await settings(page);
  assert.equal(native.get(records),sample);const legacy=await snapshot(page);assert.equal(legacy[records],sample);
  failWrites=true;await page.locator('[data-setting="sound"]').click();await page.locator('#storage-notice:not([hidden])').waitFor();await capture(page,'storage-write-retry.png');
  failWrites=false;await page.locator('#storage-notice button').click();await page.locator('#storage-notice').waitFor({state:'hidden'});
  assert.equal(JSON.parse(native.get(prefs)).soundOn,true);assert.deepEqual(await snapshot(page),legacy);
  await page.reload();await settings(page);assert.equal(await page.locator('[data-setting="sound"]').getAttribute('aria-checked'),'true');assert.equal(native.get(records),sample);assert.deepEqual(await snapshot(page),legacy);
  await context.close();report.checks.push('Native adapter simulation: failed initial reads block play and preserve data; Retry migrates exact legacy bytes and removes blocking UI (normal Settings clicks work)','Failed native saves show Retry; queued latest settings survive reload, stale localStorage does not overwrite native data');
  assert.equal(report.errors.length,0);
  report.files={};for(const file of await fs.readdir(out)){report.files[file]=createHash('sha256').update(await fs.readFile(path.join(out,file))).digest('hex');}
  report.sources={};for(const file of ['src/main.ts','src/ui/persistentStore.ts','src/ui/pickStorage.ts','src/ui/storageNotice.ts','src/ui/styles/storage.css','src/ui/talkApp.ts','public/privacy.html','public/licenses.html','src/ui/styles/legal.css'])report.sources[file]=createHash('sha256').update(await fs.readFile(path.join(root,file))).digest('hex');
  report.headAtCapture=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
  await fs.writeFile(path.join(out,'verification.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({checks:report.checks,errors:report.errors,files:report.files},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
