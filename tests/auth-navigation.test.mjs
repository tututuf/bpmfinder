import test from 'node:test';
import assert from 'node:assert/strict';
import { safeReturnPath, authErrorMessage } from '../src/lib/auth-navigation.ts';

test('login returns only to existing local pages and preserves workspace anchors', () => {
  assert.equal(safeReturnPath('/#workspace'), '/#workspace');
  assert.equal(safeReturnPath('/pricing'), '/pricing');
  assert.equal(safeReturnPath('/key-finder'), '/#song-key-finder');
  assert.equal(safeReturnPath('/key-finder#workspace'), '/#workspace');
  assert.equal(safeReturnPath('/saved-results'), '/saved-results');
  for (const route of ['/tap-tempo', '/camelot-wheel', '/bpm-to-ms', '/blogs/how-to-find-key-of-a-song']) assert.equal(safeReturnPath(`${route}#workspace`), `${route}#workspace`);
  assert.equal(safeReturnPath('https://bpmfder.com/blogs', 'https://bpmfder.com'), '/blogs');
  assert.equal(safeReturnPath('/?code=private&state=private'), '/');
});

test('login rejects external redirects, unexpected pages and malformed destinations', () => {
  for (const value of ['https://example.com', '//example.com', '/\\example.com', 'javascript:alert(1)', '/api/auth/signout', '/login', '/missing', 'http://[', '/\r\nLocation: evil', undefined, ['/', '/pricing']]) {
    assert.equal(safeReturnPath(value), '/');
  }
});

test('auth failures show safe messages without reflecting provider error text', () => {
  assert.equal(authErrorMessage(), null);
  assert.match(authErrorMessage('AccessDenied'), /guest/);
  assert.match(authErrorMessage('Configuration'), /temporarily unavailable/);
  assert.equal(authErrorMessage('<script>private response</script>'), authErrorMessage('OAuthCallback'));
});
