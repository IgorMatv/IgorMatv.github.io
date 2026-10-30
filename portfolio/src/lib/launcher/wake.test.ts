import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildTarget, cleanWakeParams, parseWake, sanitizeNext } from './wake.ts';

test('sanitizeNext keeps safe paths', () => {
  for (const path of ['/', '/?room=WRY3H2', '/a?b=//c', '/rooms/42#chat']) {
    assert.equal(sanitizeNext(path), path);
  }
});

test('sanitizeNext rejects unsafe values', () => {
  for (const bad of [null, '', 'evil', '//evil.com', 'https://evil.com', '/\\evil.com', '/a\\b', ' /x']) {
    assert.equal(sanitizeNext(bad), '/', String(bad));
  }
});

test('parseWake decodes next', () => {
  assert.deepEqual(parseWake('?wake=beatgame&next=%2F%3Froom%3DWRY3H2'), {
    id: 'beatgame',
    next: '/?room=WRY3H2',
  });
});

test('parseWake sanitizes next', () => {
  assert.deepEqual(parseWake('?wake=beatgame&next=%2F%2Fevil.com'), { id: 'beatgame', next: '/' });
  assert.deepEqual(parseWake('?wake=beatgame'), { id: 'beatgame', next: '/' });
});

test('parseWake without wake → null', () => {
  assert.equal(parseWake(''), null);
  assert.equal(parseWake('?next=%2F'), null);
  assert.equal(parseWake('?wake='), null);
});

test('buildTarget joins without double slash', () => {
  assert.equal(buildTarget('https://play.beatgame.app', '/x'), 'https://play.beatgame.app/x');
  assert.equal(buildTarget('https://play.beatgame.app/', '/?room=A'), 'https://play.beatgame.app/?room=A');
});

test('cleanWakeParams drops wake and next, keeps the rest', () => {
  assert.equal(
    cleanWakeParams('https://igormatv.github.io/demos/?wake=beatgame&next=%2F&mock=stopped#top'),
    '/demos/?mock=stopped#top',
  );
  assert.equal(cleanWakeParams('https://igormatv.github.io/demos/?wake=beatgame'), '/demos/');
});

test('buildTarget works with any appUrl host', () => {
  assert.equal(buildTarget('https://other.example:8443', '/?room=A'), 'https://other.example:8443/?room=A');
  assert.equal(
    buildTarget('https://play.beatgame.app', sanitizeNext('//evil.com')),
    'https://play.beatgame.app/',
  );
});
