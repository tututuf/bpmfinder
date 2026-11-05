import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const base = process.env.BASE_URL || 'http://127.0.0.1:3002';
const output = process.env.CHECK_OUTPUT || 'artifacts/geo';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const report = { base, checks: [], pages: [], errors: [], screenshots: [] };
const schemasFor = page => page.locator('script[type="application/ld+json"]').evaluateAll(scripts => scripts.flatMap(s => { const value = JSON.parse(s.textContent); return value['@graph'] || [value]; }));
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', acceptDownloads: true });
  // Keep analytics out of functional checks without changing production code.
  await context.route(/https:\/\/[^/]*(google-analytics\.com|googletagmanager\.com)\//, route => route.abort());
  const page = await context.newPage();
  page.on('pageerror', e => report.errors.push(e.message));
  const sitemapResponse = await context.request.get(base + '/sitemap.xml');
  assert.equal(sitemapResponse.status(), 200);
  const sitemap = await sitemapResponse.text();
  const paths = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => new URL(m[1]).pathname);
  assert.equal(paths.length, 18);
  assert.ok(paths.includes('/blogs/common-dj-mistakes'));
  assert.ok(paths.includes('/about') && paths.includes('/analysis-methodology'));
  assert.ok(!paths.some(p => /login|saved-results|billing/.test(p)));
  for (const path of paths) {
    const response = await page.goto(base + path, { waitUntil: 'networkidle' });
    assert.equal(response.status(), 200, path);
    await expect(page.locator('h1')).toHaveCount(1);
    assert.equal(new URL(await page.locator('link[rel="canonical"]').getAttribute('href')).pathname, path);
    const schemas = await schemasFor(page);
    const site = schemas.find(s => s['@type'] === 'WebSite');
    const organization = schemas.find(s => s['@id'] === 'https://bpmfder.com/#organization');
    const editorial = schemas.find(s => s['@id'] === 'https://bpmfder.com/about#editorial');
    assert.equal(site.publisher['@id'], organization['@id']);
    assert.equal(organization.email, 'support@bpmfder.com');
    assert.equal(editorial.url, 'https://bpmfder.com/about#editorial');
    assert.ok(!('sameAs' in organization), 'No invented social profiles');
    await expect(page.locator('footer a[href="/about"]')).toHaveCount(1);
    await expect(page.locator('footer a[href="/analysis-methodology"]')).toHaveCount(1);
    const article = schemas.find(s => s['@type'] === 'BlogPosting');
    if (article) {
      assert.equal(article.author['@id'], editorial['@id']);
      assert.equal(article.publisher['@id'], organization['@id']);
      await expect(page.locator('.article-byline a[rel="author"]')).toHaveAttribute('href', '/about#editorial');
      assert.ok(article.citation.length >= 3);
    }
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), path);
    report.pages.push({ path, schemaTypes: schemas.map(s => s['@type']), status: response.status() });
  }
  for (const width of [1440, 1024, 768, 390, 375]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const path of ['/about', '/analysis-methodology']) {
      await page.goto(base + path, { waitUntil: 'networkidle' });
      const missing = await page.locator('main a[href^="#"]').evaluateAll(links => links.filter(a => !document.getElementById(a.hash.slice(1))).map(a => a.hash));
      assert.deepEqual(missing, []);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Overflow ${path}@${width}`);
      const aside = page.locator('.information-contents');
      assert.equal(await aside.evaluate(el => getComputedStyle(el).position), width > 700 ? 'sticky' : 'static');
      if ([1440, 390].includes(width)) {
        const name = `${path.slice(1)}-${width}.png`;
        await page.screenshot({ path: `${output}/${name}`, fullPage: true });
        report.screenshots.push(name);
      }
    }
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(base + '/blogs/how-to-find-key-of-a-song', { waitUntil: 'networkidle' });
  await page.evaluate(() => { window.geoHeader = document.querySelector('.site-header'); window.geoDocument = document; });
  await page.locator('.article-byline a').click();
  await page.waitForURL('**/about#editorial');
  await expect(page.locator('#editorial h2')).toBeVisible();
  assert.equal(await page.evaluate(() => window.geoHeader === document.querySelector('.site-header') && window.geoDocument === document), true);
  await page.locator('.information-contents > a').click();
  await page.waitForURL('**/analysis-methodology');
  await page.locator('a[href="#examples"]').click();
  await expect(page.locator('#examples h2')).toBeVisible();
  await expect(page.locator('audio')).toHaveCount(2);
  for (const id of ['a-minor', 'c-major']) {
    const relative = `audio/key-lesson/${id}-lesson.wav`;
    const response = await context.request.get(base + '/' + relative);
    assert.equal(response.status(), 200);
    assert.equal(createHash('sha256').update(await response.body()).digest('hex'), createHash('sha256').update(await readFile('public/' + relative)).digest('hex'));
  }
  const audio = page.locator('audio').first();
  await audio.evaluate(el => el.play());
  await expect.poll(() => audio.evaluate(el => el.currentTime)).toBeGreaterThan(0);
  await audio.evaluate(el => el.pause());
  const downloadWait = page.waitForEvent('download');
  await page.getByRole('link', { name: 'Download A minor WAV', exact: true }).click();
  assert.equal((await downloadWait).suggestedFilename(), 'a-minor-lesson.wav');
  for (const path of ['/analysis-notices.txt', '/audio/key-lesson/verification.txt', '/models/clap-audio/manifest.json', '/google17fab2ec21256fb7.html']) {
    const response = await context.request.get(base + path);
    assert.equal(response.status(), 200, path);
    if (path.endsWith('.html')) assert.equal((await response.text()).trim(), 'google-site-verification: google17fab2ec21256fb7.html');
  }
  const noJs = await browser.newContext({ javaScriptEnabled: false });
  const serverPage = await noJs.newPage();
  for (const [path, text] of [['/about', 'BPM Finder editorial is the project byline'], ['/analysis-methodology', 'not an accuracy benchmark for real-world music']]) {
    await serverPage.goto(base + path);
    assert.ok((await serverPage.locator('main').innerText()).includes(text));
    assert.ok((await serverPage.locator('main').innerText()).length > 3000);
  }
  await noJs.close();
  assert.deepEqual(report.errors, []);
  report.checks.push('18 public routes: linked site/publisher/editorial schema, author attribution, public footer entries and canonical metadata', 'New pages at 375/390/768/1024/1440: no overflow, valid contents anchors and responsive sticky index', 'Article author → About → Methods preserves header and document; native audio playback/download and file hashes match', 'Original Google HTML verification file and public technical evidence remain accessible', 'Full About/Methods text remains in HTML with JavaScript disabled');
} finally {
  await writeFile(`${output}/report.json`, JSON.stringify(report, null, 2));
  await browser.close();
}
console.log(JSON.stringify(report, null, 2));
