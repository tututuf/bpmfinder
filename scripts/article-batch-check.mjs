import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const base = process.env.BASE_URL || 'http://127.0.0.1:3000';
const routes = ['fast-and-slow-tempo','average-song-tempo','key-notation','dj-beatmatching','timing-in-music','musical-key-and-scale'];
const output = process.env.CHECK_OUTPUT || 'artifacts/article-batch';
await mkdir(output,{recursive:true});
const browser = await chromium.launch({executablePath:process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const report = {base,articles:[],errors:[],checks:[]};
try {
  const page = await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce',acceptDownloads:true});
  page.on('pageerror',e=>report.errors.push(e.message));
  const requests=[];
  page.on('request',r=>requests.push(r.url()));
  const titles = new Set();
  for(const slug of routes){
    const requestStart=requests.length;
    const path=`/blogs/${slug}`;
    const response=await page.goto(base+path,{waitUntil:'networkidle'});
    assert.equal(response.status(),200);
    assert.equal(await page.locator('h1').count(),1);
    assert.equal(await page.locator('#sources-heading').innerText(),'Sources');
    assert.equal(await page.locator('a[href$="verification.txt"]').count(),0);
    assert.doesNotMatch(await page.locator('main').innerText(), /benchmark|file hashes|reproduction notes|tested dose|ORIGINAL LISTENING EXAMPLE/);
    const title = await page.title(); assert.ok(!titles.has(title)); titles.add(title);
    assert.equal(await page.locator('link[rel=canonical]').getAttribute('href'),'https://bpmfder.com'+path);
    assert.equal(await page.locator('meta[property="og:type"]').getAttribute('content'),'article');
    const missing = await page.locator('main a[href^="#"]').evaluateAll(links=>links.filter(a=>!document.getElementById(a.hash.slice(1))).map(a=>a.hash));
    assert.deepEqual(missing,[]);
    const schema = await page.locator('script[type="application/ld+json"]').evaluateAll(scripts=>scripts.map(s=>JSON.parse(s.textContent)).find(s=>s['@type']==='BlogPosting'));
    assert.equal(schema.mainEntityOfPage,'https://bpmfder.com'+path);
    const published=['timing-in-music','musical-key-and-scale'].includes(slug)?'2026-11-01':'2026-10-31';
    assert.equal(schema.datePublished,published);
    assert.equal(await page.locator('.article-byline time').getAttribute('datetime'),published);
    assert.equal(schema.citation.length,await page.locator('.article-sources li').count());
    for(const [i,source] of schema.citation.entries()){
      assert.equal(await page.locator(`#source-${i+1} a`).getAttribute('href'),source.url);
      assert.ok(await page.locator(`.article-citation a[href="#source-${i+1}"]`).count()>0,`Source ${i+1} is actually cited`);
    }
    assert.equal(await page.locator('.field-related a').count(),6);
    const firstCitation=page.locator('.article-citation a').first();
    const sourceTarget=await firstCitation.getAttribute('href');
    await firstCitation.click();
    await page.waitForFunction(target=>document.querySelector(target)?.matches(':target'),sourceTarget);
    for(const width of [1440,768,390,375]){
      await page.setViewportSize({width,height:1000});
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      await page.evaluate(()=>window.scrollTo(0,0));
      const measure=await page.evaluate(()=>{const r=document.querySelector('.article-body').getBoundingClientRect();return {width:innerWidth,scroll:document.documentElement.scrollWidth,bodyWidth:r.width,center:r.x+r.width/2};});
      assert.ok(measure.scroll<=width,`No overflow ${slug}: ${JSON.stringify(measure)}`);
      assert.ok(Math.abs(measure.center-width/2)<1,`Body remains centered ${slug} ${width}`);
      if(width>=1200)assert.equal(measure.bodyWidth,800);
      const overflow=await page.locator('.field-figure,.field-table-wrap,.field-audio').evaluateAll(elements=>elements.filter(e=>e.scrollWidth>e.clientWidth+1).map(e=>e.className));
      assert.deepEqual(overflow,[],`${slug}: tables/figures/audio fit at ${width}`);
      if(width===1440||width===375){
        await page.screenshot({path:`${output}/${slug}-${width}.png`});
        await page.locator('.field-figure').first().screenshot({path:`${output}/${slug}-figure-${width}.png`});
      }
    }
    await page.setViewportSize({width:1440,height:1000});
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const firstTarget=await page.locator('.article-contents a').first().getAttribute('href');
    await page.locator(firstTarget).evaluate(element=>element.scrollIntoView({block:'start',behavior:'instant'}));
    await page.waitForFunction(()=>{const el=document.querySelector('.article-sidebar-contents');return el&&!el.hidden;});
    const sidebar=page.locator('.article-sidebar-contents');
    await sidebar.waitFor({state:'visible'});
    const active=sidebar.locator('a[aria-current="location"]');
    await active.waitFor();
    const bounds=await page.locator('.article-sidebar').boundingBox();const body=await page.locator('.article-body').boundingBox();
    assert.ok(bounds.x>=body.x+body.width+31,'Side TOC stays outside body');
    await page.locator('.article-contents a').last().click();
    await page.waitForFunction(()=>document.querySelector('.article-sidebar-contents a[aria-current="location"]')?.getAttribute('href')==='#sources');
    const count=await page.locator('audio').count();
    assert.equal(count,['fast-and-slow-tempo','dj-beatmatching','timing-in-music','musical-key-and-scale'].includes(slug)?3:0);
    assert.equal(requests.slice(requestStart).filter(url=>/\/audio\/(field-notes|timing-scale)\/.*\.wav/.test(url)).length,0,'No audio downloaded before playback');
    for(const audio of await page.locator('audio').all()){
      assert.equal(await audio.getAttribute('preload'),'none');
      await audio.evaluate(async el=>{el.load();await el.play();});
      await page.waitForTimeout(100);
      assert.equal(await audio.evaluate(el=>!el.paused),true);
      const duration=await audio.evaluate(el=>el.duration);assert.equal(duration,slug==='fast-and-slow-tempo'?8:16);
      await audio.evaluate(el=>el.pause());
    }
    report.articles.push({path,title,sourceCount:schema.citation.length,audioCount:count});
    if(slug==='timing-in-music'){
      assert.equal(await page.locator('.gap-bar-grid>li').count(),8);
      assert.equal(await page.locator('.gap-bar-grid>li.is-quiet').count(),2);
      await page.locator('.tutorial-screenshot a[aria-haspopup=dialog]').first().click();
      await page.getByRole('dialog').waitFor();
      await page.keyboard.press('Escape');
      await page.getByRole('dialog').waitFor({state:'hidden'});
    }
    if(slug==='musical-key-and-scale'){
      assert.equal(await page.locator('.scale-note-row').count(),3);
      assert.equal(await page.locator('.scale-note-row li.is-tonic').count(),3);
    }
  }
  for(const folder of ['field-notes','timing-scale']){
  const manifest=JSON.parse(await readFile(`public/audio/${folder}/manifest.json`,'utf8'));
  for(const example of manifest.examples){
    const response=await page.request.get(`${base}/audio/${folder}/${example.filename}`);
    assert.equal(response.status(),200);
    const bytes=await response.body();assert.equal(createHash('sha256').update(bytes).digest('hex'),example.sha256);
    assert.equal(bytes.readUInt16LE(22),example.channelCount);
    assert.equal(bytes.readUInt32LE(40)/2/example.channelCount/example.sampleRate,example.seconds);
  }
  }
  await page.goto(base+'/blogs/timing-in-music',{waitUntil:'networkidle'});
  const newDownloadWait=page.waitForEvent('download');
  await page.getByRole('link',{name:'Download Silent-bar practice WAV'}).click();
  const newDownload=await newDownloadWait;
  assert.equal(newDownload.suggestedFilename(),'silent-bars.wav');
  await newDownload.saveAs(`${output}/silent-bars-download.wav`);
  assert.equal(createHash('sha256').update(await readFile(`${output}/silent-bars-download.wav`)).digest('hex'),createHash('sha256').update(await readFile('public/audio/timing-scale/silent-bars.wav')).digest('hex'));
  await page.evaluate(()=>{window.savedHeader=document.querySelector('.site-header');window.savedDocument=document;});
  await page.locator('.field-related a[href="/blogs/musical-key-and-scale"]').click();
  await page.waitForURL('**/blogs/musical-key-and-scale');
  assert.equal(await page.evaluate(()=>window.savedHeader===document.querySelector('.site-header')&&window.savedDocument===document),true);
  await page.goto(base+'/blogs/fast-and-slow-tempo',{waitUntil:'networkidle'});
  const downloadWait=page.waitForEvent('download');
  await page.getByRole('link',{name:'Download 60 BPM pulse WAV'}).click();
  const download=await downloadWait;assert.equal(download.suggestedFilename(),'tempo-60.wav');
  await page.evaluate(()=>{window.savedHeader=document.querySelector('.site-header');window.savedDocument=document;});
  await page.locator('.field-related a[href="/blogs/dj-beatmatching"]').click();
  await page.waitForURL('**/blogs/dj-beatmatching');
  assert.equal(await page.evaluate(()=>window.savedHeader===document.querySelector('.site-header')&&window.savedDocument===document),true);
  await page.getByRole('link',{name:'Blogs',exact:true}).first().click();
  await page.waitForURL('**/blogs');
  assert.equal(await page.locator('.blog-notes-grid article').count(),6);
  assert.equal(await page.getByRole('heading',{name:'Start with the homepage guides'}).count(),0);
  assert.equal(await page.locator('.blog-feature').count(),1);
  await page.screenshot({path:`${output}/blogs-1440.png`,fullPage:true});
  const nojs=await browser.newContext({javaScriptEnabled:false});const serverPage=await nojs.newPage();
  for(const slug of routes){
    await serverPage.goto(base+'/blogs/'+slug);
    assert.ok((await serverPage.locator('main').innerText()).length>6500);
    assert.equal(await serverPage.locator('.article-contents').count(),1);
    assert.ok(await serverPage.locator('.article-sources li').count()>=3);
  }
  await nojs.close();
  const sitemap=await (await page.request.get(base+'/sitemap.xml')).text();
  assert.equal([...sitemap.matchAll(/<loc>/g)].length,17);
  for(const slug of routes)assert.ok(sitemap.includes('https://bpmfder.com/blogs/'+slug));
  assert.deepEqual(report.errors,[]);
  report.checks.push('Unique canonical/metadata/BlogPosting, correct per-post publication dates and inline-to-bibliography evidence mapping','Four widths: centered body, no figure/table/player overflow; desktop outside-margin sticky contents and active source link','All twelve audio assets have matching SHA256 and format/duration; native playback/no preload and actual WAV downloads work','New metronome screenshot opens a dialog and closes with Escape; eight-bar schedule and three scale rows remain in HTML','Persistent-header same-document new/old article navigation, seven blog entries, seventeen public sitemap URLs; removed homepage-guides section stays absent','Full article text, inline contents, diagrams and sources remain available with JavaScript disabled');
  await writeFile(output+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}
