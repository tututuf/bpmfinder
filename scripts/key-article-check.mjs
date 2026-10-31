import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const base = process.env.BASE_URL || 'http://127.0.0.1:3000';
const route = '/blogs/how-to-find-key-of-a-song';
await mkdir('artifacts/key-lesson', { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const report = { url: base + route, errors: [], checks: [], layouts: [] };
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, reducedMotion: 'reduce', acceptDownloads: true });
  page.on('pageerror', error => report.errors.push(error.message));
  const requests = [];
  page.on('request', request => requests.push(request.url()));
  const response = await page.goto(base + route, { waitUntil: 'networkidle' });
  assert.equal(response.status(), 200);
  assert.equal(await page.getByRole('heading', { level: 1 }).innerText(), 'How to find the key of a song');
  assert.equal(await page.locator('audio').count(), 2);
  assert.equal(requests.filter(url => /\/audio\/key-lesson\/.*\.wav/.test(url)).length, 0, 'Audio is not fetched before the reader chooses to play');
  const brokenAnchors = await page.locator('main a[href^="#"]').evaluateAll(links => links.filter(link => !document.getElementById(decodeURIComponent(link.hash.slice(1)))).map(link => link.getAttribute('href')));
  assert.deepEqual(brokenAnchors, []);
  assert.equal(await page.locator('.article-sources li').count(), 5);
  const post = await page.locator('script[type="application/ld+json"]').evaluateAll(scripts => scripts.map(script => JSON.parse(script.textContent)).find(value => value['@type'] === 'BlogPosting'));
  assert.equal(post.citation.length, 5);
  assert.equal(post.hasPart.length, 2);
  for (const source of post.citation) assert.equal(await page.locator(`.article-sources a[href="${source.url}"]`).count(), 1);
  report.checks.push('Server HTML, single H1, working section/reference anchors, five visible sources and matching BlogPosting citations/audio');
  await page.locator('.article-citation a').first().click();
  await page.waitForURL(url => url.hash === '#source-1');
  assert.equal(await page.locator('#source-1').evaluate(el => el.matches(':target')), true);
  assert.equal(await page.locator('.key-lesson-method').count(), 0);
  assert.equal(await page.locator('a[href$="verification.txt"]').count(), 0);
  const verification = await page.request.get(base + '/audio/key-lesson/verification.txt');
  assert.equal(verification.status(), 200);
  assert.match(await verification.text(), /commercial-clap-2/);
  const manifest = JSON.parse(await readFile('public/audio/key-lesson/manifest.json', 'utf8'));
  for (const example of manifest.examples) {
    const name = example.intendedKey;
    const downloadEvent = page.waitForEvent('download');
    await page.getByRole('link', { name: `Download ${name} WAV`, exact: false }).click();
    const download = await downloadEvent;
    assert.equal(download.suggestedFilename(), example.filename);
    const path = `artifacts/key-lesson/download-${example.filename}`;
    await download.saveAs(path);
    const bytes = await readFile(path);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), example.sha256);
    assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
    assert.equal(bytes.readUInt32LE(24), 22050);
    assert.equal((bytes.length - 44) / 2 / 22050, 16);
  }
  for (const audio of await page.locator('audio').all()) {
    await audio.evaluate(async el => { el.load(); await el.play(); });
    await page.waitForTimeout(250);
    const media = await audio.evaluate(el => ({ duration: el.duration, playing: !el.paused, time: el.currentTime }));
    assert.equal(media.duration, 16);
    assert.equal(media.playing, true);
    assert.ok(media.time > 0);
    await audio.evaluate(el => el.pause());
  }
  report.checks.push('Both native players play 16-second audio; no autoplay/preload, WAV downloads match published SHA256; technical boilerplate is absent from the article');
  await page.locator('.tutorial-screenshot').last().getByRole('link', { name: /^View full-size/ }).click();
  await page.getByRole('dialog').waitFor();
  await page.keyboard.press('Escape');
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  report.checks.push('Current upload/result screenshots open in the existing dialog and close with Escape');
  await page.evaluate(() => { window.keyArticleHeader = document.querySelector('.site-header'); window.keyArticleDocument = document; });
  for (const width of [1440, 768, 390, 375]) {
    await page.setViewportSize({ width, height: 1100 });
    const sizes = await page.evaluate(() => ({ width: innerWidth, content: document.documentElement.scrollWidth }));
    assert.ok(sizes.content <= width, `Page overflow at ${width}`);
    const overflow = await page.locator('.key-lesson-audio, .key-lesson-diagram, .key-lesson-table-wrap').evaluateAll(elements => elements.filter(el => el.getBoundingClientRect().right > innerWidth || el.scrollWidth > el.clientWidth + 1).map(el => ({ class: el.className, scroll: el.scrollWidth, client: el.clientWidth })));
    assert.deepEqual(overflow, [], 'New figures, players and tables fit');
    await page.screenshot({ path: `artifacts/key-lesson/article-${width}.png`, fullPage: true });
    await page.locator('.key-lesson-diagram').screenshot({ path: `artifacts/key-lesson/diagram-${width}.png` });
    await page.locator('#worked-example').screenshot({ path: `artifacts/key-lesson/example-${width}.png` });
    report.layouts.push(sizes);
  }
  await page.getByRole('link', { name: 'Find a song’s key →', exact: true }).click();
  await page.waitForURL('**/#workspace');
  assert.equal(await page.evaluate(() => window.keyArticleDocument === document && window.keyArticleHeader === document.querySelector('.site-header')), true);
  report.checks.push('375/390/768/1440 layouts and persistent-header same-document tool navigation');
  const nojs = await browser.newContext({ javaScriptEnabled: false });
  const nojsPage = await nojs.newPage();
  await nojsPage.goto(base + route, { waitUntil: 'domcontentloaded' });
  assert.equal(await nojsPage.locator('.article-sources li').count(), 5);
  assert.equal(await nojsPage.locator('.key-lesson-table').count(), 3);
  assert.equal(await nojsPage.locator('audio').count(), 2);
  assert.match(await nojsPage.locator('#worked-example').innerText(), /A minor, 8A, 120 BPM/);
  await nojs.close();
  report.checks.push('Methods, examples, native audio and references remain in server-rendered no-JavaScript content');
  assert.deepEqual(report.errors, []);
  await writeFile('artifacts/key-lesson/article-report.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
} finally { await browser.close(); }
