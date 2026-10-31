import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true });
const page = await browser.newPage();
try {
  await page.goto(process.env.BASE_URL || 'http://127.0.0.1:3000', { waitUntil: 'networkidle' });
  for (const width of [375, 390, 540, 541, 640, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 950 });
    const detail = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth, offenders: [...document.querySelectorAll('body *')].map(el => ({ tag: el.tagName, class: el.className?.baseVal ?? el.className, left: el.getBoundingClientRect().left, right: el.getBoundingClientRect().right })).filter(el => el.right > innerWidth + 1 || el.left < -1) }));
    console.log(JSON.stringify(detail));
  }
} finally { await browser.close(); }
