import { readdir, stat, unlink, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
const root = '.open-next/assets';
const large = [];
async function visit(folder) {
  for (const item of await readdir(folder, { withFileTypes: true })) {
    const path = join(folder, item.name);
    if (item.isDirectory()) await visit(path);
    else if ((await stat(path)).size > 25 * 1024 * 1024) {
      const key = relative(root, path).replaceAll('\\', '/');
      large.push({ key, source: `public/${key}` });
      await unlink(path);
    }
  }
}
await visit(root);
await writeFile('.open-next/large-assets.json', JSON.stringify(large, null, 2));
console.log(`Prepared static assets; ${large.length} large files are served through the ANALYSIS_ASSETS R2 binding.`);
