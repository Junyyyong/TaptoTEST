const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const base = process.env.BASE_URL || 'http://127.0.0.1:5239/';
const ten = process.env.TEN_URL || 'http://127.0.0.1:5240/';
const sizes = [{width:390,height:844}, {width:390,height:667}, {width:320,height:568}, {width:844,height:390}];
const report = { checkedAt: new Date().toISOString(), method: 'Isolated Chrome mobile emulation, 390×844 CSS px / DPR 2 for saved PNGs; synthetic personal-best fixtures, controlled clocks. Not a native install/update test.', layouts: [], checks: [] };

async function open(browser, viewport, reference = false) {
  const page = await browser.newPage({ viewport, deviceScaleFactor:2, isMobile:true, hasTouch:true });
  await page.addInitScript(reference => {
    Math.random = () => 0;
    if (reference) {
      localStorage.setItem('makezero.settings.v1', JSON.stringify({ musicOn:false, soundOn:false, hapticsOn:false }));
      localStorage.setItem('makezero.progress.v1', JSON.stringify({ tutorialDone:true, bestEndless:720, bestEndlessMs:83300 }));
    } else {
      localStorage.setItem('taptopick.preferences.v1', JSON.stringify({ musicOn:false, soundOn:false, hapticsOn:false }));
    }
  }, reference);
  await page.clock.install();
  await page.goto(reference ? ten : base, {waitUntil:'networkidle'});
  await page.clock.runFor(7100);
  await page.evaluate(() => document.fonts.ready);
  return page;
}

async function seed(page) {
  return page.evaluate(async () => {
    const { UNIT_TARGET_CHARACTERS } = await import('/src/content/puzzles.ts');
    const target = UNIT_TARGET_CHARACTERS[0];
    const best = {mode:'unit',won:true,elapsedMs:24800,mistakes:0,found:target.pieces.length,total:target.pieces.length,stage:1,score:1000,characterId:target.id};
    const raw = JSON.stringify({version:1,bestByKey:{
      [`unit:${target.id}:${target.pieces.length}`]:best,
      montage:{mode:'montage',won:false,elapsedMs:70000,mistakes:5,found:12,total:18,stage:3,score:12},
      'memory:2x2-4x4-6x6':{mode:'memory',memoryVersion:2,won:true,elapsedMs:83400,mistakes:3,found:18,total:18,stage:3,score:4000},
      memory:{mode:'memory',won:true,elapsedMs:1000,mistakes:0,found:24,total:24,stage:4,score:8000},
    }});
    localStorage.setItem('taptopick.records.v1',raw);
    return {raw,target:{id:target.id,name:target.name,displayName:target.displayName,folder:target.folder,total:target.pieces.length}};
  });
}

async function layout(page, reference = false) {
  return page.evaluate(reference => {
    const ids = reference ? ['intro-title','intro-mark','intro-note','intro-stats','btn-intro-start']
      : ['mode-intro-title','mode-intro-mark','mode-intro-note','mode-intro-stats','btn-mode-intro-start'];
    const stats = document.getElementById(ids[3]);
    const style = element => {
      const c = getComputedStyle(element);
      return Object.fromEntries(['fontFamily','fontSize','fontWeight','letterSpacing','color','textAlign','fontVariantNumeric'].map(key=>[key,c[key]]));
    };
    return {
      boxes:ids.map(id=>document.getElementById(id).getBoundingClientRect().toJSON()),
      label:style(stats.querySelector('dt')), value:style(stats.querySelector('dd')),
      rowGap:getComputedStyle(stats).rowGap,columnGap:getComputedStyle(stats).columnGap,
      overflow:document.documentElement.scrollWidth>innerWidth,
      rows:[...stats.children].map(e=>e.textContent),
    };
  }, reference);
}

(async()=>{
  const browser = await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
  try {
    report.browser = browser.version();
    for(const viewport of sizes) {
      const reference = await open(browser,viewport,true);
      await reference.locator('#mode-endless').click();
      await reference.clock.runFor(400);
      const tenLayout = await layout(reference,true);
      if(viewport.height===844) await reference.screenshot({path:path.join(__dirname,'reference-ten.png'),animations:'disabled'});
      const page = await open(browser,viewport);
      const errors=[];page.on('pageerror',e=>errors.push(e.message));
      const {raw,target} = await seed(page);
      const expected = {
        unit:['PICTURE',target.name,'BEST TIME','24.8s'],
        montage:['BEST FOUND','12','BEST STAGE','3 / 4'],
        memory:['BEST TIME','83.4s','STAGES CLEARED','3 / 3'],
      };
      for(const mode of ['unit','montage','memory']) {
        await page.locator(`#mode-${mode}`).click();
        await page.clock.runFor(400);
        const current = await layout(page);
        assert.deepEqual(current.rows,expected[mode]);
        assert.deepEqual(current.label,tenLayout.label);
        assert.deepEqual(current.value,tenLayout.value);
        assert.equal(current.rowGap,tenLayout.rowGap);
        assert.equal(current.columnGap,tenLayout.columnGap);
        assert(!current.overflow);
        const [title,mark,note,stats,start] = current.boxes;
        assert(title.bottom<=mark.y && mark.bottom<=note.y && note.bottom<=stats.y && stats.bottom<=start.y);
        assert(start.width<=260 && start.height>=44);
        if(viewport.height>390) {
          assert(start.bottom<=viewport.height);
          // Same vertical anchors as TEN; differing labels naturally vary block width.
          for(const index of [0,1,2,3,4]) assert(Math.abs(current.boxes[index].y-tenLayout.boxes[index].y)<1,`${JSON.stringify(viewport)} ${mode}: boxes ${JSON.stringify(current.boxes)} vs TEN ${JSON.stringify(tenLayout.boxes)}`);
          assert(Math.abs(stats.x+stats.width/2-viewport.width/2)<1);
        } else {
          await page.locator('#btn-mode-intro-start').scrollIntoViewIfNeeded();
          const rect=await page.locator('#btn-mode-intro-start').boundingBox();
          assert(rect.y>=0 && rect.y+rect.height<=viewport.height);
        }
        if(viewport.height===844) await page.screenshot({path:path.join(__dirname,`after-${mode}.png`),animations:'disabled'});
        const board = await page.locator('#picture-board').innerHTML();
        await page.clock.runFor(5000);
        assert.equal(await page.locator('#picture-board').innerHTML(),board);
        assert.equal(await page.evaluate(()=>localStorage.getItem('taptopick.records.v1')),raw);
        await page.keyboard.press('Escape');
        assert(await page.locator('#screen-title').isVisible());
        report.layouts.push({viewport,mode,current,reference:tenLayout});
      }
      assert.deepEqual(errors,[]);
      await page.close();await reference.close();
    }
    report.checks.push('All three intro record panels: TEN typography, colors, spacing and portrait vertical anchors; short/landscape scrolling; no writes or game progress before START.');

    const fresh = await open(browser,sizes[0]);
    for(const mode of ['unit','montage','memory']) {
      await fresh.locator(`#mode-${mode}`).click();
      const values = await fresh.locator('#mode-intro-stats dd').allTextContents();
      assert(values.includes('—'));
      assert.equal(await fresh.evaluate(()=>localStorage.getItem('taptopick.records.v1')),null);
      if(mode==='unit') await fresh.screenshot({path:path.join(__dirname,'after-first-visit.png'),animations:'disabled'});
      await fresh.locator('#btn-mode-intro-back').click();
    }
    await fresh.close();

    const page = await open(browser,sizes[0]);
    const {target} = await seed(page);
    await page.locator('#mode-unit').click();
    // Changing RNG after the intro proves START reuses, rather than redraws, its target.
    await page.evaluate(()=>{Math.random=()=>.999;});
    await page.locator('#btn-mode-intro-start').click();
    assert.equal(await page.locator('#target-character-name').textContent(),target.displayName);
    assert.equal(await page.locator('#picture-board button').count(),49);
    await page.clock.runFor(1800);
    const answers = page.locator('#picture-board button').filter({has:page.locator(`img[src*="/optimized/${target.folder}/"]`)});
    assert.equal(await answers.count(),target.total);
    for(let i=0;i<target.total;i++) await answers.nth(i).click();
    await page.clock.runFor(1200);
    // End only the presentation video in this controlled-clock test.
    await page.locator('#cheer-clip').dispatchEvent('ended');
    await page.locator('#btn-cheer-continue').click();
    await page.waitForFunction(()=>!document.querySelector('#result-layer').classList.contains('hidden'));
    const stored = await page.evaluate(()=>JSON.parse(localStorage.getItem('taptopick.records.v1')));
    const best = stored.bestByKey[`unit:${target.id}:${target.total}`];
    assert(best.elapsedMs<24800 && best.won);
    await page.evaluate(()=>{Math.random=()=>0;});
    await page.locator('#btn-again').click();
    assert.equal(await page.locator('#mode-intro-stats dd').last().textContent(),`${(best.elapsedMs/1000).toFixed(1)}s`);
    await page.screenshot({path:path.join(__dirname,'after-improved.png'),animations:'disabled'});
    await page.reload({waitUntil:'networkidle'});await page.clock.runFor(7100);
    await page.locator('#mode-unit').click();
    assert.equal(await page.locator('#mode-intro-stats dd').last().textContent(),`${(best.elapsedMs/1000).toFixed(1)}s`);
    report.checks.push('Actual PUZZLE completion improves the existing best; Play again and a page reload both show it; next-round target matches intro despite RNG changing before START.');
    await page.close();

    report.images = Object.fromEntries(fs.readdirSync(__dirname).filter(file=>file.endsWith('.png')).map(file=>[file,crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,file))).digest('hex')]));
    fs.writeFileSync(path.join(__dirname,'verification.json'),JSON.stringify(report,null,2)+'\n');
    console.log(JSON.stringify({passed:true,checks:report.checks,layouts:report.layouts.length,images:Object.keys(report.images)}));
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
