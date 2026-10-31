import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
const allowed = new Set(['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'NEXTAUTH_SECRET', 'RESEND_API_KEY', 'WAFFO_MERCHANT_ID', 'WAFFO_STORE_ID', 'WAFFO_PRIVATE_KEY', 'WAFFO_MONTHLY_PRODUCT_ID', 'WAFFO_YEARLY_PRODUCT_ID']);
const secrets = {};
for (const line of (await readFile('.env.local', 'utf8')).split(/\r?\n/)) {
  const match = line.match(/^([A-Z_][A-Z_0-9]*)=(.*)$/);
  if (!match || !allowed.has(match[1])) continue;
  let value = match[2].trim();
  if (value.startsWith('"') && value.endsWith('"')) { try { value = JSON.parse(value); } catch { value = value.slice(1, -1); } }
  else if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
  if (value) secrets[match[1]] = value;
}
if (!secrets.NEXTAUTH_SECRET) throw new Error('NEXTAUTH_SECRET is required.');
console.log(`Uploading ${Object.keys(secrets).length} server secrets using stdin; values are not logged.`);
const child = spawn(process.execPath, ['node_modules/wrangler/bin/wrangler.js', 'secret', 'bulk'], { stdio: ['pipe', 'pipe', 'pipe'], env: process.env });
child.stdout.on('data', chunk => process.stdout.write(chunk));
child.stderr.on('data', chunk => process.stderr.write(chunk));
child.stdin.end(JSON.stringify(secrets));
child.on('exit', code => { process.exitCode = code || 0; });
