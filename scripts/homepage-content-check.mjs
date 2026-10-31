import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3000';
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true });
await mkdir('artifacts/homepage', { recursive: true });
const report = { checks: [], widths: [], errors: [] };
try {
  const plainContext = await browser.newContext({ javaScriptEnabled: false });
  const plainPage = await plainContext.newPage();
  const response = await plainPage.goto(baseUrl);
  assert.equal(response.status(), 200);
  assert.equal(await plainPage.locator('h1').count(), 1);
  assert.match(await plainPage.locator('h1').innerText(), /BPM Finder/);
  assert.match(await plainPage.title(), /^BPM Finder.*BPM.*Key/);
  assert.match(await plainPage.locator('meta[name="description"]').getAttribute('content'), /BPM finder/);
  for (const name of ['How to find the BPM of a song', 'Three ways to measure BPM', 'What your BPM and key results mean']) {
    assert.equal(await plainPage.getByRole('heading', { name, exact: true }).isVisible(), true);
  }
  await plainPage.getByText('Can I analyze an entire song?', { exact: true }).click();
  assert.equal(await plainPage.getByText(/rather than just three excerpts/).isVisible(), true);
  const plainNav = plainPage.getByRole('navigation', { name: 'Main navigation' });
  assert.equal(await plainNav.getByRole('link', { name: 'Blogs', exact: true }).getAttribute('href'), '/blogs');
  assert.equal(await plainNav.getByRole('link', { name: /Learn|How it works/ }).count(), 0);
  await plainContext.close();
  report.checks.push('Title, description, single H1 and full guide render without JavaScript; FAQ works without hydration');

  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  const page = await context.newPage();
  page.on('pageerror', e => report.errors.push(e.message));
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.getByRole('link', { name: 'Check with Tap Tempo', exact: true }).click();
  assert.equal(await page.getByRole('tab', { name: 'Tap tempo', exact: true }).getAttribute('aria-selected'), 'true');
  await page.getByRole('link', { name: 'Hear the metronome', exact: true }).click();
  assert.equal(await page.getByRole('tab', { name: 'Metronome', exact: true }).getAttribute('aria-selected'), 'true');
  await page.getByRole('tab', { name: 'BPM & key finder', exact: true }).click();
  report.checks.push('Main navigation contains Blogs and no Learn or How it works; homepage basics tool links work');
  const tutorialImages = page.locator('.tutorial-screenshot img');
  assert.equal(await tutorialImages.count(), 4);
  for (const img of await tutorialImages.all()) {
    await img.scrollIntoViewIfNeeded();
    await img.evaluate(image => image.decode());
    assert.equal(await img.getAttribute('loading'), 'lazy');
    assert.ok(await img.evaluate(image => image.naturalWidth > 0 && image.naturalHeight > 0));
    assert.ok((await img.getAttribute('alt')).length > 20);
  }
  report.checks.push('Four actual UI screenshots load, have descriptive alt text and lazy loading');
  const brokenAnchors = await page.locator('a[href^="#"]').evaluateAll(links => links.map(link => link.getAttribute('href')).filter(href => href.length > 1 && !document.getElementById(href.slice(1))));
  assert.deepEqual(brokenAnchors, []);
  await page.getByRole('link', { name: 'Open Tap Tempo', exact: true }).click();
  assert.equal(await page.getByRole('tab', { name: 'Tap tempo', exact: true }).getAttribute('aria-selected'), 'true');
  await page.locator('.tempo-check').getByRole('link', { name: 'metronome' }).click();
  assert.equal(await page.getByRole('tab', { name: 'Metronome', exact: true }).getAttribute('aria-selected'), 'true');
  await page.getByRole('link', { name: 'Analyze your audio', exact: true }).click();
  assert.equal(await page.getByRole('tab', { name: 'BPM & key finder', exact: true }).getAttribute('aria-selected'), 'true');
  report.checks.push('Guide links select analyzer, Tap Tempo and metronome; every on-page anchor resolves');
  assert.equal(await page.locator('h1').count(), 1);
  assert.equal(await page.locator('.faq-list details').count(), 9);
  const summary = page.locator('.faq-list summary').first();
  await summary.focus();
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('.faq-list details').first().getAttribute('open'), '');
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('.faq-list details').first().getAttribute('open'), null);
  report.checks.push('Nine FAQ answers; keyboard expansion and collapse');

  await page.locator('h1').click();
  for (const width of [375, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    const overflow = await page.evaluate(() => ({ page: document.documentElement.scrollWidth, viewport: innerWidth }));
    assert.ok(overflow.page <= width, `Overflow at ${width}: ${JSON.stringify(overflow)}`);
    const clipped = await page.locator('.homepage-guide h2, .homepage-guide h3, .counting-card, .hero h1').evaluateAll(nodes => nodes.filter(n => n.getBoundingClientRect().right > innerWidth || n.getBoundingClientRect().left < 0).map(n => n.textContent));
    assert.deepEqual(clipped, [], `Clipped guide content at ${width}`);
    report.widths.push(width);
    if ([390, 1440].includes(width)) {
      await page.screenshot({ path: `artifacts/homepage/full-${width}.png`, fullPage: true });
      await page.locator('#how-it-works').screenshot({ path: `artifacts/homepage/tutorial-${width}.png` });
      await page.locator('#understand-results').screenshot({ path: `artifacts/homepage/basics-${width}.png` });
      await page.locator('.measurement-section').screenshot({ path: `artifacts/homepage/measurement-${width}.png` });
      await page.locator('.faq-section').screenshot({ path: `artifacts/homepage/faq-${width}.png` });
    }
  }
  assert.deepEqual(report.errors, []);
  await context.close();
  report.checks.push('No horizontal overflow or clipped guide headings across mobile, tablet and desktop; no page errors');
  await writeFile('artifacts/homepage/content-check.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}
