import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { camelotKeys } from '../src/lib/music-tools.ts';

const base = process.env.BASE_URL || 'http://127.0.0.1:3000';
const output = process.env.CHECK_OUTPUT || 'artifacts/seo-first-batch';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless:true });
const report = { base, routes:[], interactions:[], screenshots:[], errors:[] };
const routes = ['/', '/tap-tempo','/camelot-wheel','/bpm-to-ms','/blogs','/blogs/how-to-find-key-of-a-song','/blogs/fast-and-slow-tempo','/blogs/average-song-tempo','/blogs/key-notation','/blogs/dj-beatmatching','/blogs/timing-in-music','/blogs/musical-key-and-scale','/about','/analysis-methodology','/pricing','/terms','/privacy'];
try {
  const context = await browser.newContext({ viewport:{width:1440,height:1000}, acceptDownloads:true, reducedMotion:'reduce' });
  const page = await context.newPage();
  page.on('pageerror', error => report.errors.push(error.message));
  const titles = new Set();
  for (const path of routes) {
    const response = await page.goto(`${base}${path}`, { waitUntil:'networkidle' });
    assert.equal(response.status(), 200, path);
    await expect(page.locator('h1')).toHaveCount(1);
    const title = await page.title();
    assert.ok(!titles.has(title), `Unique title: ${path}`); titles.add(title);
    const canonical = await page.locator('link[rel=canonical]').getAttribute('href');
    assert.equal(new URL(canonical).href, `https://bpmfder.com${path}`);
    assert.equal(await page.locator('meta[property="og:url"]').getAttribute('content'), canonical);
    assert.ok((await page.locator('meta[name=description]').getAttribute('content')).length > 50);
    assert.match(await page.locator('meta[property="og:image"]').getAttribute('content'), /bpm-finder-social\.png$/);
    assert.ok(!/noindex/.test(await page.locator('meta[name=robots]').getAttribute('content')));
    for (const raw of await page.locator('script[type="application/ld+json"]').allTextContents()) {
      const schema = JSON.parse(raw);
      assert.ok(schema['@type'] || (schema['@graph']?.length && schema['@graph'].every(node => node['@type'] && node['@id'])));
    }
    assert.equal(await page.locator('select').count(), 0, 'Custom selects only');
    assert.equal(await page.locator('a[href^="/key-finder"]').count(),0,'No links to discontinued key page');
    report.routes.push({path,title,canonical});
  }
  const sitemap = await (await context.request.get(`${base}/sitemap.xml`)).text();
  const locations = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]);
  assert.deepEqual(locations.sort(), routes.map(p => `https://bpmfder.com${p}`).sort());
  assert.ok(!/saved-results|login|billing|metronome|song-database/.test(sitemap));
  const merged = await context.request.get(`${base}/key-finder`, {maxRedirects:0});
  assert.equal(merged.status(),308);
  assert.equal(merged.headers().location,'/#song-key-finder');
  assert.ok(!sitemap.includes('/key-finder'));
  assert.match(await (await context.request.get(`${base}/robots.txt`)).text(), /Sitemap: https:\/\/bpmfder.com\/sitemap.xml/);
  const alternate = await context.request.get(`${base}/tap-tempo?source=check`, {headers:{host:'www.bpmfder.com'}, maxRedirects:0});
  assert.equal(alternate.status(),308);
  assert.equal(alternate.headers().location,'https://bpmfder.com/tap-tempo?source=check');
  const social = await context.request.get(`${base}/images/bpm-finder-social.png`);
  assert.equal(social.status(),200); assert.match(social.headers()['content-type'], /image\/png/);
  const noJs = await browser.newContext({javaScriptEnabled:false});
  const serverPage = await noJs.newPage();
  for (const [path, text] of [['/','How to find the BPM of a song'],['/','Song Key Finder.'],['/camelot-wheel','All 12 minor and 12 major Camelot keys'],['/blogs/how-to-find-key-of-a-song','Check a chord progression']]) {
    await serverPage.goto(`${base}${path}`);
    assert.ok((await serverPage.locator('main').innerText()).includes(text), `Server-rendered content ${path}`);
  }
  await serverPage.goto(`${base}/saved-results`);
  assert.match(await serverPage.locator('meta[name=robots]').getAttribute('content'), /noindex/);
  await noJs.close();
  report.interactions.push('Public sitemap/robots, social image, unique server metadata and no-JS content');

  await page.goto(`${base}/bpm-to-ms`, {waitUntil:'networkidle'});
  await expect(page.locator('.calculator-big-number')).toHaveText('500ms');
  const choose = async (label, option) => { await page.getByRole('combobox', {name:label,exact:true}).click(); await page.getByRole('option',{name:option,exact:true}).click(); };
  await choose('Note length','Eighth note'); await choose('Timing','Dotted');
  await expect(page.locator('.calculator-big-number')).toHaveText('375ms');
  await choose('Timing','Triplet'); await expect(page.locator('.calculator-big-number')).toHaveText('166.667ms');
  const input = page.locator('#tempo-input');
  await input.fill('96'); await expect(page.locator('.calculator-big-number')).toHaveText('208.333ms');
  await page.getByRole('button',{name:'Convert milliseconds to BPM',exact:true}).click();
  await expect(input).toHaveValue('625');
  await input.fill('500'); await expect(page.locator('.calculator-big-number')).toHaveText('166.667ms');
  await page.getByRole('button',{name:'Convert BPM to milliseconds',exact:true}).click();
  await expect(input).toHaveValue('120');
  await input.fill('0'); await expect(input).toHaveAttribute('aria-invalid','true');
  await expect(page.locator('.calculator-big-number')).toHaveText('—ms');
  await input.fill(''); await expect(page.locator('.calculator-big-number')).toHaveText('—ms');
  await input.fill('120.5'); await expect(page.locator('.calculator-big-number')).toHaveText('165.975ms');
  await input.fill('120');
  const noteSelect=page.getByRole('combobox',{name:'Note length',exact:true});
  await noteSelect.press('Home'); await noteSelect.press('Enter');
  await expect(noteSelect).toContainText('Whole note');
  report.interactions.push('Calculator straight/dotted/triplet, decimal, inverse conversion, empty/zero and keyboard selection');

  await page.goto(`${base}/camelot-wheel`,{waitUntil:'networkidle'});
  await expect(page.locator('.wheel-selected')).toHaveText('8AA minor');
  for (const key of camelotKeys) {
    await choose('Starting musical key',`${key.code} · ${key.key}`);
    await expect(page.locator('.wheel-selected')).toHaveText(`${key.code}${key.key}`);
    await expect(page.locator('.wheel-segment[aria-pressed=true]')).toHaveCount(1);
  }
  await choose('Starting musical key','12B · E major');
  await page.getByRole('button',{name:'12B, E major',exact:true}).press('ArrowRight');
  await expect(page.locator('.wheel-selected')).toHaveText('1BB major');
  await page.getByRole('button',{name:'1B, B major',exact:true}).press('ArrowUp');
  await expect(page.locator('.wheel-selected')).toHaveText('1AA♭ minor');
  await expect(page.locator('.wheel-segment[tabindex="0"]')).toBeFocused();
  await expect(page.locator('.compatible-key-list')).toContainText('12A');
  await expect(page.locator('.key-chart tbody tr')).toHaveCount(12);
  report.interactions.push('All 24 Camelot choices, canonical labels, relative keys, 12/1 wrap and SVG keyboard focus');

  await page.goto(`${base}/tap-tempo`, {waitUntil:'networkidle'});
  await page.clock.install();
  await page.clock.pauseAt(new Date());
  const tap = page.getByRole('button',{name:'Tap the beat',exact:true});
  for (let i=0;i<5;i++) { await tap.click(); if (i<4) await page.clock.runFor(500); }
  await expect(page.locator('.tempo-number')).toHaveText('120BPM');
  await expect(page.locator('.tap-count')).toContainText('5 taps');
  await page.getByRole('button',{name:'Reset',exact:true}).click();
  await page.locator('h1').click();
  await page.keyboard.press('Space'); await page.clock.runFor(500); await page.keyboard.press('Space');
  await expect(page.locator('.tempo-number')).toHaveText('120BPM');
  await page.clock.runFor(2501); await tap.click();
  await expect(page.locator('.tap-count')).toContainText('1 tap');
  await page.clock.resume();
  report.interactions.push('Tap pad and Space produce 120 BPM, reset and pause restart');

  await page.goto(`${base}/`,{waitUntil:'networkidle'});
  await page.locator('input[type=file]').setInputFiles('C:/Users/qq242/Downloads/beansandsausages-drum-loop-120-bpm-rock-funk-groove-553903.mp3');
  await expect(page.locator('.analysis-table .bpm-value')).toHaveText('120',{timeout:120000});
  assert.deepEqual((await page.locator('.analysis-table th').allTextContents()).slice(2,5).map(s=>s.trim()), ['BPM','KEY','CAMELOT']);
  const analyzedKey = await page.locator('.analysis-table .key-badge').innerText();
  const analyzedCode = await page.locator('.analysis-table .camelot-badge').innerText();
  assert.equal(camelotKeys.find(k=>k.key===analyzedKey)?.code, analyzedCode);
  assert.equal(await page.locator('.metric-lock').count(),3);
  await page.locator('.analysis-table .key-badge').click();
  const editKey=page.getByRole('combobox',{name:'Track key',exact:true});
  await editKey.click(); await page.getByRole('option',{name:'A minor',exact:true}).click();
  await page.getByRole('button',{name:'Save changes',exact:true}).click();
  await expect(page.locator('.analysis-table .key-badge')).toHaveText('A minor');
  await expect(page.locator('.analysis-table .camelot-badge')).toHaveText('8A');
  const downloadPromise=page.waitForEvent('download'); await page.getByRole('button',{name:'Export CSV',exact:true}).click();
  const csv=await readFile(await (await downloadPromise).path(),'utf8');
  assert.ok(csv.includes('A minor')); assert.ok(csv.includes('8A'));
  assert.ok(!/Energy|Dance|Happy|Engine|Source|Analysis version/.test(csv));
  report.interactions.push(`Real MP3 homepage BPM/key analysis: 120 BPM / ${analyzedKey} / ${analyzedCode}; edit updates Camelot and free CSV; Pro metrics remain gated`);
  for (const width of [390,375]) {
    await page.setViewportSize({width,height:1000});
    for (const selector of ['.analysis-table .key-badge','.analysis-table .camelot-badge','.analysis-table .bpm-value']) await expect(page.locator(selector)).toBeVisible();
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.screenshot({path:`${output}/key-results-${width}.png`,fullPage:true});
  }
  await page.evaluate(()=>{window.__seoHeader=document.querySelector('.site-header');});
  await page.getByRole('checkbox',{name:/Save Results/}).click();
  await page.waitForURL(`${base}/pricing`);
  assert.ok(await page.evaluate(()=>window.__seoHeader===document.querySelector('.site-header')));
  await page.goBack();
  await expect(page.locator('.analysis-table .key-badge')).toHaveText('A minor');
  report.interactions.push('Homepage populated results at 375/390; guest Save Results goes to Pricing without reloading, back restores draft');

  for (const width of [1440,768,390,375]) {
    await page.setViewportSize({width,height:1000});
    for (const path of ['/','/tap-tempo','/camelot-wheel','/bpm-to-ms','/blogs','/blogs/how-to-find-key-of-a-song']) {
      await page.goto(`${base}${path}`, {waitUntil:'networkidle'});
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`No overflow ${path}@${width}`);
      if ([1440,390].includes(width)) {
        const filename=`${path === '/' ? 'home' : path.slice(1).replaceAll('/','-')}-${width}.png`;
        await page.screenshot({path:`${output}/${filename}`,fullPage:true}); report.screenshots.push(filename);
      }
    }
    await page.goto(`${base}/`,{waitUntil:'networkidle'});
    await expect(page.locator('#song-key-finder h2')).toHaveCount(1);
    await page.getByRole('tab',{name:'Tap tempo',exact:true}).click();
    await page.locator('#song-key-finder a[href="#workspace"]').click();
    await expect(page.getByRole('tab',{name:'BPM & key finder',exact:true})).toHaveAttribute('aria-selected','true');
    await expect(page.locator('.dropzone').getByRole('button',{name:'Select audio files',exact:true})).toBeVisible();
    await page.locator('#song-key-finder').screenshot({path:`${output}/home-key-section-${width}.png`});
    await page.evaluate(()=>{window.__seoHeader=document.querySelector('.site-header');window.__seoDoc='same';});
    const documents=[];
    const onRequest = request=>{if(request.resourceType()==='document'&&request.frame()===page.mainFrame()) documents.push(request.url());};
    page.on('request',onRequest);
    for (const path of ['/tap-tempo','/camelot-wheel','/bpm-to-ms','/']) {
      await page.locator(`.related-tools a[href="${path}"]`).click();
      await page.waitForURL(`${base}${path}`);
      assert.ok(await page.evaluate(()=>window.__seoDoc==='same'&&window.__seoHeader===document.querySelector('.site-header')));
    }
    assert.deepEqual(documents,[]); page.off('request',onRequest);
  }
  await page.goto(`${base}/blogs/how-to-find-key-of-a-song`,{waitUntil:'networkidle'});
  const imageLink=page.locator('.tutorial-screenshot>a').first();
  await imageLink.click(); await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button',{name:'Close image preview',exact:true}).press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0); await expect(imageLink).toBeFocused();
  await page.locator('.article-tool-cta a').first().click();
  await page.waitForURL(`${base}/#workspace`);
  report.interactions.push('375/390/768/1440 layouts, persistent-header SPA tool navigation and article screenshot dialog/CTA');
  assert.deepEqual(report.errors,[]);
  await context.close();
  console.log(JSON.stringify(report,null,2));
} finally { await writeFile(`${output}/report.json`,JSON.stringify(report,null,2)); await browser.close(); }
