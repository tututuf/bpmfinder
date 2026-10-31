import { createDemo } from '../src/lib/demo.ts';

// Test-only observation of analysis worker output; no app storage or export API.
export async function captureAnalysis(page) {
  await page.addInitScript(() => {
    window.__analysisResults = [];
    const OriginalWorker = window.Worker;
    window.Worker = class extends OriginalWorker {
      constructor(...args) {
        super(...args);
        if (!String(args[0]).includes('/analysis-worker.mjs')) return;
        this.addEventListener('message', event => {
          if (event.data.result) window.__analysisResults.push(event.data.result);
        });
      }
    };
  });
}

export async function readResults(page) {
  const count = await page.locator('tbody .bpm-value').count();
  return count ? page.evaluate(count => window.__analysisResults.slice(-count), count) : [];
}

// UI-only fixtures enter through file upload and a stub analysis worker.
// They never depend on application storage or a production testing API.
export async function uploadFixtureTracks(page, tracks) {
  await page.route('**/analysis-worker.mjs*', route => route.fulfill({
    contentType: 'text/javascript',
    body: `const tracks = ${JSON.stringify(tracks)}; let index = 0; self.onmessage = () => self.postMessage({ result: tracks[index++] });`,
  }));
  const buffer = Buffer.from(await createDemo(0).arrayBuffer());
  await page.locator('input[type=file]').setInputFiles(tracks.map(track => ({ name: `${track.name}.wav`, mimeType: 'audio/wav', buffer })));
  await page.waitForFunction(count => document.querySelectorAll('tbody .bpm-value').length === count, tracks.length);
}
