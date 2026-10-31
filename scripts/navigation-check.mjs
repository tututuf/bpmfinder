import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3000';
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true });
const report = { checks: [], documentRequests: [], errors: [] };
try {
  await mkdir('artifacts/navigation', { recursive: true });
  for (const width of [1440, 768, 390, 375]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await context.newPage();
    page.on('pageerror', error => report.errors.push(error.stack));
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    await page.evaluate(() => {
      window.__navigationDocument = 'same-document';
      window.__navigationHeader = document.querySelector('.site-header');
      window.__navigationBrand = document.querySelector('.site-header .brand');
      window.__navigationNav = document.querySelector('.site-header .nav');
      window.__navigationAuth = document.querySelector('.site-header .header-auth');
    });
    page.on('request', request => {
      if (request.resourceType() === 'document' && request.frame() === page.mainFrame()) report.documentRequests.push(request.url());
    });
    const sameDocument = async () => {
      assert.equal(await page.evaluate(() => window.__navigationDocument), 'same-document');
      assert.deepEqual(report.documentRequests, []);
      assert.equal(await page.locator('.site-header').count(), 1);
      assert.ok(await page.evaluate(() => window.__navigationHeader === document.querySelector('.site-header') && window.__navigationBrand === document.querySelector('.site-header .brand') && window.__navigationNav === document.querySelector('.site-header .nav') && window.__navigationAuth === document.querySelector('.site-header .header-auth')), 'Navigation preserves the actual header, brand, nav and auth DOM nodes');
    };
    const showNav = async () => {
      const menu = page.getByRole('button', { name: 'Toggle navigation', exact: true });
      if (!await page.getByRole('navigation', { name: 'Main navigation' }).isVisible()) await menu.click();
    };
    const openBlogs = async () => {
      await showNav();
      await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Blogs', exact: true }).click();
      await page.waitForURL('**/blogs');
      await page.getByRole('heading', { name: /Notes on/ }).waitFor();
      await sameDocument();
    };
    const checkHash = async id => {
      await page.waitForURL(`**/#${id}`);
      await page.waitForFunction(id => Math.abs(document.getElementById(id).getBoundingClientRect().top) < 220, id);
      // Let route scroll restoration settle before immediately traversing history.
      await page.waitForTimeout(400);
      assert.ok(await page.locator(`#${id}`).evaluate(element => Math.abs(element.getBoundingClientRect().top) < 220));
      await sameDocument();
    };
    const nav = page.getByRole('navigation', { name: 'Main navigation' });
    if (width < 540) await page.getByRole('button', { name: 'Toggle navigation', exact: true }).click();
    assert.equal(await nav.getByRole('link', { name: 'Audio tools', exact: true }).count(), 0);
    await nav.getByRole('link', { name: 'Pricing', exact: true }).click();
    await page.waitForURL('**/pricing');
    await page.getByRole('heading', { name: /Your next mix/ }).waitFor();
    await sameDocument();
    assert.equal(await page.locator('.site-header .nav a[href="/pricing"]').getAttribute('aria-current'), 'page');
    assert.match(await page.title(), /Pricing/);
    assert.equal(await page.locator('.free-price-card .plan-price strong').textContent(), '$0');
    assert.equal(await page.locator('.pricing-cards .price-card').count(), 3);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Pricing overflow at ${width}`);
    for (const question of await page.locator('.pricing-questions summary').all()) {
      await question.click();
      assert.equal(await question.evaluate(element => element.parentElement.open), true);
      await question.press('Enter');
      assert.equal(await question.evaluate(element => element.parentElement.open), false);
    }
    await page.locator('.pricing-intro h1').click();
    await page.screenshot({ path: `artifacts/navigation/pricing-${width}.png`, fullPage: true });
    await openBlogs();
    // Navigating to the current route also stays in the same document.
    await showNav();
    await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Blogs', exact: true }).click();
    await sameDocument();
    await showNav();
    await nav.getByRole('link', { name: 'Pricing', exact: true }).click();
    await page.waitForURL('**/pricing');
    await sameDocument();
    await page.getByRole('link', { name: 'Use the free tools', exact: true }).click();
    await checkHash('workspace');
    await page.goBack();
    await page.waitForURL('**/pricing');
    await sameDocument();
    await page.goForward();
    await checkHash('workspace');

    for (const [name, id] of [['Find the BPM of a song', 'how-it-works'], ['Read your BPM and key', 'understand-results']]) {
      await openBlogs();
      await page.getByRole('link', { name: new RegExp(name) }).click();
      await checkHash(id);
    }
    await openBlogs();
    await page.getByRole('link', { name: 'Back to the audio tools', exact: true }).click();
    await checkHash('workspace');
    await openBlogs();
    await page.getByRole('link', { name: 'BPM Finder home', exact: true }).click();
    await page.waitForURL(baseUrl + '/');
    await sameDocument();
    await openBlogs();
    await page.getByRole('link', { name: 'Back to home', exact: true }).click();
    await page.waitForURL(baseUrl + '/');
    await sameDocument();
    await page.waitForTimeout(1400);
    assert.equal(await page.locator('.hero h1').evaluate(el => Number(getComputedStyle(el).opacity)), 1);
    await page.getByRole('tab', { name: 'Tap tempo', exact: true }).click();
    await page.getByRole('button', { name: 'Tap the beat', exact: false }).waitFor();
    report.checks.push(`${width}px: Pricing navigation/content/FAQ/bounds, all cross-page links, hash targets, back/forward, same-route click and tools after navigation use the same document`);
    await context.close();
  }
  const plain = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 900 } });
  const plainPage = await plain.newPage();
  await plainPage.goto(`${baseUrl}/pricing`);
  assert.equal(await plainPage.locator('h1').count(), 1);
  assert.equal(await plainPage.locator('.pricing-cards .price-card').count(), 3);
  await plainPage.locator('.pricing-questions summary').first().click();
  assert.equal(await plainPage.locator('.pricing-questions details').first().getAttribute('open'), '');
  assert.equal(await plainPage.getByRole('link', { name: 'Use the free tools', exact: true }).getAttribute('href'), '/#workspace');
  await plain.close();
  report.checks.push('Pricing content, FAQ and analyzer link work without JavaScript');
  assert.deepEqual(report.errors, []);
  await mkdir('artifacts/navigation', { recursive: true });
  await writeFile('artifacts/navigation/report.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally { await browser.close(); }
