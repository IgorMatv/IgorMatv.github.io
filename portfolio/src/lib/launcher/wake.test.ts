import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildTarget,
  cleanWakeParams,
  createAttemptCounter,
  decideRedirect,
  parseWake,
  sanitizeNext,
  type StorageLike,
} from './wake.ts';

function memoryStorage(): StorageLike {
  const data = new Map<string, string>();
  return {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
}

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
  assert.equal(buildTarget('https://beatgame.app', '/x'), 'https://beatgame.app/x');
  assert.equal(buildTarget('https://beatgame.app/', '/?room=A'), 'https://beatgame.app/?room=A');
});

test('counter increments per id and expires after 600000 ms', () => {
  let now = 1_000_000;
  const counter = createAttemptCounter(memoryStorage(), () => now);
  assert.equal(counter.available, true);
  assert.equal(counter.record('beatgame'), 1);
  assert.equal(counter.record('beatgame'), 2);
  assert.equal(counter.record('other'), 1);
  now += 600_001;
  assert.equal(counter.record('beatgame'), 1);
});

test('counter reset clears one id', () => {
  const counter = createAttemptCounter(memoryStorage(), () => 0);
  counter.record('beatgame');
  counter.record('beatgame');
  counter.reset('beatgame');
  assert.equal(counter.record('beatgame'), 1);
});

test('counter with throwing storage → available false, no throw', () => {
  const throwing: StorageLike = {
    getItem: () => {
      throw new Error('SecurityError');
    },
    setItem: () => {
      throw new Error('SecurityError');
    },
    removeItem: () => {
      throw new Error('SecurityError');
    },
  };
  const counter = createAttemptCounter(throwing, () => 0);
  assert.equal(counter.available, false);
  assert.equal(counter.record('beatgame'), 1);
  assert.doesNotThrow(() => counter.reset('beatgame'));
  assert.equal(createAttemptCounter(null, () => 0).available, false);
});

test('decideRedirect table', () => {
  assert.deepEqual(decideRedirect({ attempt: 1, wasReadyOnArrival: false, storageAvailable: true }), {
    action: 'redirect',
    delayMs: 0,
  });
  assert.deepEqual(decideRedirect({ attempt: 1, wasReadyOnArrival: true, storageAvailable: true }), {
    action: 'redirect',
    delayMs: 0,
  });
  assert.deepEqual(decideRedirect({ attempt: 2, wasReadyOnArrival: true, storageAvailable: true }), {
    action: 'redirect',
    delayMs: 15_000,
  });
  assert.deepEqual(decideRedirect({ attempt: 3, wasReadyOnArrival: false, storageAvailable: true }), {
    action: 'redirect',
    delayMs: 0,
  });
  assert.deepEqual(decideRedirect({ attempt: 4, wasReadyOnArrival: false, storageAvailable: true }), {
    action: 'manual',
  });
  assert.deepEqual(decideRedirect({ attempt: 1, wasReadyOnArrival: true, storageAvailable: false }), {
    action: 'manual',
  });
});

test('cleanWakeParams drops wake and next, keeps the rest', () => {
  assert.equal(
    cleanWakeParams('https://igormatv.github.io/demos/?wake=beatgame&next=%2F&mock=stopped#top'),
    '/demos/?mock=stopped#top',
  );
  assert.equal(cleanWakeParams('https://igormatv.github.io/demos/?wake=beatgame'), '/demos/');
});
