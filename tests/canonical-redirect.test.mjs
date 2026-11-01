import test from 'node:test';
import assert from 'node:assert/strict';
import { canonicalRedirectUrl } from '../cloudflare/canonical.ts';

test('canonicalization upgrades public pages and assets while preserving path and query', () => {
  for (const path of ['/', '/blogs/how-to-find-key-of-a-song?source=music&b=2', '/images/bpm-finder-social.png', '/models/clap-audio/onnx/audio_model_quantized.onnx', '/google17fab2ec21256fb7.html']) {
    for (const origin of ['http://bpmfder.com', 'http://www.bpmfder.com', 'https://www.bpmfder.com']) {
      assert.equal(canonicalRedirectUrl(origin + path), 'https://bpmfder.com' + path);
    }
    assert.equal(canonicalRedirectUrl('https://bpmfder.com' + path), null);
  }
});

test('local and unrelated preview origins never redirect to production', () => {
  for (const origin of ['http://localhost:3000', 'http://127.0.0.1:3002', 'http://[::1]:3002', 'https://bpmfinder.example.workers.dev', 'https://bpmfder.com.attacker.example']) {
    assert.equal(canonicalRedirectUrl(origin + '/about?ref=preview'), null);
  }
  assert.equal(canonicalRedirectUrl('http://localhost:3000/', 'http://localhost:3000'), null);
});

test('canonicalization honors the configured HTTPS origin and encoded paths', () => {
  assert.equal(canonicalRedirectUrl('http://example.com/files/a%20b.wav?tag=a%2Fb', 'https://www.example.com'), 'https://www.example.com/files/a%20b.wav?tag=a%2Fb');
  assert.equal(canonicalRedirectUrl('https://www.example.com/', 'https://www.example.com'), null);
  assert.equal(canonicalRedirectUrl('https://bpmfder.com:8080/about'), 'https://bpmfder.com/about');
});
