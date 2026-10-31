import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3000';
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true });
const report = { checks: [], errors: [] };
await mkdir('artifacts/motion', { recursive: true });
const watch = async context => {
  await context.addInitScript(() => {
    window.__motionSamples = [];
    const selector = '.hero-copy > *, .record-card, .blogs-intro > *, .usage-steps > li, .custom-select-menu, .secondary-tool, .guide-modal';
    new MutationObserver(records => {
      for (const { target } of records) {
        if (target instanceof HTMLElement && target.matches(selector) && target.style.opacity !== '') {
          window.__motionSamples.push({ selector: target.matches('.usage-steps > li') ? 'usage-step' : target.className || target.tagName, opacity: Number(target.style.opacity) });
        }
      }
    }).observe(document, { subtree: true, attributes: true, attributeFilter: ['style'] });
  });
};
const errors = page => page.on('pageerror', e => report.errors.push(e.stack));
const readable = async page => {
  const hidden = await page.locator('.hero-copy > *, .blogs-intro > *, .usage-steps > li, .faq-list details, .site-footer, .blogs-footer').evaluateAll(nodes => nodes.filter(node => Number(getComputedStyle(node).opacity) < 0.99 || getComputedStyle(node).visibility === 'hidden').map(node => node.textContent.slice(0, 60)));
  assert.deepEqual(hidden, []);
};

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, reducedMotion: 'no-preference' });
  await watch(context);
  const page = await context.newPage();
  errors(page);
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1600);
  assert.ok(await page.evaluate(() => window.__motionSamples.some(sample => sample.opacity > 0 && sample.opacity < 1)), 'GSAP produces intermediate opacity values');
  assert.equal(await page.locator('.record-card').evaluate(el => el.style.transform), '', 'Sleeve returns to its responsive CSS transform');
  assert.equal(await page.locator('.workspace').evaluate(el => el.style.transform), '', 'Fixed menus keep their viewport containing block');
  await readable(page);
  await page.screenshot({ path: 'artifacts/motion/home-1440.png' });
  report.checks.push('Normal-motion GSAP intro renders intermediate frames and restores CSS sleeve/viewport positioning');

  await page.locator('.usage-steps > li').first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(700);
  assert.ok(await page.evaluate(() => window.__motionSamples.some(sample => sample.selector.includes('usage-step') && sample.opacity < 1)), 'Tutorial animates on entering the viewport');
  const tutorialLink = page.locator('.tutorial-screenshot > a').first();
  await tutorialLink.hover();
  await page.waitForTimeout(300);
  assert.ok(await tutorialLink.evaluate(el => new DOMMatrix(getComputedStyle(el).transform).m42 < -2));
  await page.mouse.move(0, 0);
  await page.waitForTimeout(300);
  assert.ok(await tutorialLink.evaluate(el => Math.abs(new DOMMatrix(getComputedStyle(el).transform).m42) < 0.1));
  report.checks.push('Tutorial scroll entrances and reversible hover motion run');

  await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }));
  const faq = page.locator('.faq-list summary').first();
  await faq.focus();
  assert.equal(await faq.evaluate(el => Number(getComputedStyle(el.parentElement).opacity)), 1, 'Focused content immediately finishes its entrance');
  await page.waitForTimeout(700);
  await readable(page);
  report.checks.push('Fast scroll and keyboard focus leave content visible');

  // Toggle while interface tweens are active, so cleanup is exercised rather
  // than merely checking a separate page that never created animations.
  await page.getByRole('tab', { name: 'Tap tempo', exact: true }).click();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForTimeout(150);
  assert.equal(await page.locator('.secondary-tool').evaluate(el => el.style.opacity), '');
  assert.equal(await page.locator('.secondary-tool').evaluate(el => el.style.transform), '');
  for (let i = 0; i < 3; i++) {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.waitForTimeout(80);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForTimeout(100);
  }
  await readable(page);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.waitForTimeout(1500);
  report.checks.push('Live reduced-motion toggles cancel in-flight tweens and repeated context cleanup stays error-free');

  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Blogs', exact: true }).click();
  await page.waitForURL('**/blogs');
  await page.waitForTimeout(1400);
  await readable(page);
  await page.screenshot({ path: 'artifacts/motion/blogs-1440.png', fullPage: true });
  await page.getByRole('link', { name: 'BPM Finder home', exact: true }).click();
  await page.waitForURL(baseUrl + '/');
  await page.waitForTimeout(1400);
  await readable(page);
  report.checks.push('Blogs and home navigation retain content and clean animation state');

  const reducedContext = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', isMobile: true, hasTouch: true });
  await watch(reducedContext);
  const reduced = await reducedContext.newPage();
  errors(reduced);
  await reduced.goto(baseUrl, { waitUntil: 'networkidle' });
  await reduced.getByRole('tab', { name: 'Tap tempo', exact: true }).tap();
  await reduced.getByRole('tab', { name: 'BPM & key finder', exact: true }).tap();
  await reduced.locator('.usage-steps > li').first().scrollIntoViewIfNeeded();
  await reduced.waitForTimeout(100);
  assert.deepEqual(await reduced.evaluate(() => window.__motionSamples), [], 'Reduced motion does not create entrance tweens');
  await readable(reduced);
  await reduced.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await reduced.screenshot({ path: 'artifacts/motion/home-390-reduced.png', fullPage: true });
  report.checks.push('Mobile reduced-motion load keeps content immediately visible and tool switching usable');

  assert.deepEqual(report.errors, []);
  await writeFile('artifacts/motion/report.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally { await browser.close(); }
