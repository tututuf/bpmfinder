import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AccountStore, CODE_LIFETIME_MS, CODE_MAX_ATTEMPTS, CODE_COOLDOWN_MS } from '../src/lib/account-store.ts';
import { normalizeEmail, validPassword, hashPassword, verifyPassword, digestCode, privateRateKey } from '../src/lib/account-security.ts';
import { registrationEmail } from '../src/lib/registration-email.ts';

const email = 'listener@example.test';
const secret = 'isolated-unit-test-secret';
const digest = (code, address = email) => digestCode(secret, address, code);
const now = 1900000000000;
function issue(store, code = '034567', time = now) {
  const reservation = store.reserveCode(email, digest(code), time);
  assert.ok(reservation.id); store.markDelivered(email, reservation.id); return reservation.id;
}

test('email normalization rejects malformed input and passwords require only a nonempty string', () => {
  assert.equal(normalizeEmail(' Listener@Example.test '), email);
  for (const input of ['a@localhost', 'a@-example.test', 'a@exam_ple.test', 'a\nb@example.test', '<b>@example.test', null, {}, ['a@example.test']]) assert.equal(normalizeEmail(input), null);
  for (const input of ['1', 'short', '中文', ' ', 'x'.repeat(1024), 'this is a long passphrase']) assert.ok(validPassword(input));
  for (const input of ['', null, undefined, 123, [], {}]) assert.equal(validPassword(input), false);
});

test('passwords use unique salts, verify correctly and never store plaintext', async () => {
  const password = '1';
  const one = await hashPassword(password), two = await hashPassword(password);
  assert.notEqual(one, two); assert.match(one, /^scrypt\$[a-f0-9]{32}\$[a-f0-9]{128}$/);
  assert.ok(await verifyPassword(password, one));
  assert.equal(await verifyPassword('incorrect password', one), false);
  assert.equal(await verifyPassword(password), false);
  assert.equal(await verifyPassword(password, 'malformed'), false);
});

test('code and rate digests are keyed, scoped and do not contain personal inputs', () => {
  assert.notEqual(digest('123456'), digest('654321'));
  assert.notEqual(digest('123456'), digest('123456', 'other@example.test'));
  assert.notEqual(digest('123456'), digestCode('different', email, '123456'));
  assert.match(privateRateKey(secret, email), /^[a-f0-9]{64}$/);
  assert.ok(!privateRateKey(secret, email).includes(email));
});

test('undelivered/failed codes cannot register; verified registration is single use', () => {
  const store = new AccountStore(':memory:');
  try {
    const reservation = store.reserveCode(email, digest('034567'), now);
    assert.equal(store.register(email, digest('034567'), 'hash', now), false);
    store.markDelivered(email, reservation.id);
    assert.equal(store.register(email, digest('034567'), 'salted-password-hash', now), true);
    assert.equal(store.account(email).password_hash, 'salted-password-hash');
    assert.equal(store.register(email, digest('034567'), 'replacement', now), false);
    assert.equal(store.account(email).password_hash, 'salted-password-hash');
    issue(store, '654321', now + 61000);
    assert.equal(store.register(email, digest('654321'), 'overwrite-attempt', now + 61001), false);
    assert.equal(store.account(email).password_hash, 'salted-password-hash');
  } finally { store.close(); }
});

test('resending enforces cooldown, replaces old code and ignores stale mail completions', () => {
  const store = new AccountStore(':memory:');
  try {
    const old = issue(store);
    assert.equal(store.reserveCode(email, digest('654321'), now + 1000).retryAfter, 59);
    assert.equal(store.reserveCode(email, digest('654321'), now + 1000).id, null);
    const next = store.reserveCode(email, digest('654321'), now + CODE_COOLDOWN_MS);
    store.markDelivered(email, old);
    assert.equal(store.register(email, digest('654321'), 'hash', now + 61000), false);
    store.markDelivered(email, next.id);
    store.invalidateCode(email, old);
    assert.equal(store.register(email, digest('034567'), 'hash', now + 61000), false);
    assert.ok(store.register(email, digest('654321'), 'hash', now + 61000));
  } finally { store.close(); }
});

test('expired codes and five incorrect attempts cannot create accounts', () => {
  const store = new AccountStore(':memory:');
  try {
    issue(store);
    assert.equal(store.register(email, digest('034567'), 'hash', now + CODE_LIFETIME_MS), false);
    assert.equal(store.account(email), undefined);
    issue(store, '654321', now + CODE_LIFETIME_MS);
    for (let i = 0; i < CODE_MAX_ATTEMPTS; i++) assert.equal(store.register(email, digest('111111'), 'hash', now + CODE_LIFETIME_MS), false);
    assert.equal(store.register(email, digest('654321'), 'hash', now + CODE_LIFETIME_MS), false);
    const row = store.db.prepare('SELECT code_hash, attempts FROM registration_codes WHERE email=?').get(email);
    assert.equal(row.attempts, 5); assert.notEqual(row.code_hash, '654321');
  } finally { store.close(); }
});

test('failed mail invalidates its code and preserves resend cooldown', () => {
  const store = new AccountStore(':memory:');
  try {
    const id = issue(store); store.invalidateCode(email, id);
    assert.equal(store.register(email, digest('034567'), 'hash', now), false);
    assert.equal(store.reserveCode(email, digest('654321'), now + 1000).id, null);
  } finally { store.close(); }
});

test('accounts and rate limits persist across connections and reset on schedule', () => {
  const dir = mkdtempSync(join(tmpdir(), 'bpm-accounts-'));
  const path = join(dir, 'accounts.sqlite');
  let store = new AccountStore(path);
  try {
    issue(store); assert.ok(store.register(email, digest('034567'), 'hash', now));
    assert.equal(store.limit('private-scope', 2, 60000, now).allowed, true);
    store.close(); store = new AccountStore(path);
    assert.equal(store.account(email).email, email);
    assert.equal(store.limit('private-scope', 2, 60000, now + 1000).allowed, true);
    const limited = store.limit('private-scope', 2, 60000, now + 2000);
    assert.equal(limited.allowed, false); assert.equal(limited.retryAfter, 58);
    assert.equal(store.limit('other-scope', 2, 60000, now + 2000).allowed, true);
    assert.equal(store.limit('private-scope', 2, 60000, now + 60000).allowed, true);
  } finally { store.close(); rmSync(dir, { recursive: true }); }
});

test('verification email provides matching text and HTML without accepting injected markup', () => {
  const mail = registrationEmail('034567');
  assert.match(mail.text, /034567/); assert.match(mail.html, />034567</);
  assert.match(mail.text, /10 minutes/); assert.match(mail.subject, /verification code/);
  assert.throws(() => registrationEmail('<img>'));
});
