import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMockApi, scenarioFromSearch, type MockScenario } from './mock-api.ts';
import { ApiError, type LauncherApi } from './types.ts';

function setup(scenario: MockScenario) {
  let now = Date.parse('2026-10-30T12:00:00Z');
  const api = createMockApi({ scenario, bootSeconds: 12, latencyMs: 0, now: () => now });
  return {
    api,
    advance: (seconds: number) => {
      now += seconds * 1000;
    },
  };
}

const kindOf = async (p: Promise<unknown>) => {
  try {
    await p;
    return 'ok';
  } catch (err) {
    return err instanceof ApiError ? err.kind : 'other';
  }
};

const state = async (api: LauncherApi) => (await api.getStatus('beatgame')).state;

test('stopped: start → starting → booting → ready over bootSeconds', async () => {
  const { api, advance } = setup('stopped');
  const [initial] = await api.listProjects();
  assert.equal(initial.state, 'stopped');
  assert.equal(initial.appUrl, 'https://play.beatgame.app');
  const started = await api.start('beatgame');
  assert.equal(started.state, 'starting');
  assert.equal(started.startedAt, null);
  advance(3);
  assert.equal(await state(api), 'starting');
  advance(5);
  assert.equal(await state(api), 'booting');
  assert.notEqual((await api.getStatus('beatgame')).startedAt, null);
  advance(5);
  assert.equal(await state(api), 'ready');
});

test('stopped: start is idempotent once running', async () => {
  const { api, advance } = setup('stopped');
  await api.start('beatgame');
  advance(8);
  assert.equal((await api.start('beatgame')).state, 'booting');
});

test('ready: ready from the start', async () => {
  const { api } = setup('ready');
  assert.equal((await api.listProjects())[0].state, 'ready');
  assert.equal(await state(api), 'ready');
});

test('stopping: stopping for 4 s, then stopped, then startable', async () => {
  const { api, advance } = setup('stopping');
  assert.equal((await api.start('beatgame')).state, 'stopping');
  advance(4);
  assert.equal(await state(api), 'stopped');
  assert.equal((await api.start('beatgame')).state, 'starting');
});

test('ratelimit: every other status is 429', async () => {
  const { api } = setup('ratelimit');
  await api.start('beatgame');
  const kinds = [];
  for (let i = 0; i < 4; i++) kinds.push(await kindOf(api.getStatus('beatgame')));
  assert.deepEqual(kinds, ['ok', 'rate-limited', 'ok', 'rate-limited']);
});

test('flaky: first 2 status calls fail with server', async () => {
  const { api } = setup('flaky');
  await api.start('beatgame');
  const kinds = [];
  for (let i = 0; i < 3; i++) kinds.push(await kindOf(api.getStatus('beatgame')));
  assert.deepEqual(kinds, ['server', 'server', 'ok']);
});

test('down: every call fails with network', async () => {
  const { api } = setup('down');
  assert.equal(await kindOf(api.listProjects()), 'network');
  assert.equal(await kindOf(api.getStatus('beatgame')), 'network');
  assert.equal(await kindOf(api.start('beatgame')), 'network');
});

test('timeout: stays booting forever', async () => {
  const { api, advance } = setup('timeout');
  await api.start('beatgame');
  advance(600);
  assert.equal(await state(api), 'booting');
});

test('unavailable: unavailable from the start, start changes nothing', async () => {
  const { api } = setup('unavailable');
  assert.equal((await api.listProjects())[0].state, 'unavailable');
  assert.equal((await api.start('beatgame')).state, 'unavailable');
});

test('unknown-state: normalized to unavailable', async () => {
  const { api } = setup('unknown-state');
  assert.equal((await api.listProjects())[0].state, 'unavailable');
});

test('unknown id → not-found', async () => {
  const { api } = setup('stopped');
  assert.equal(await kindOf(api.getStatus('nope')), 'not-found');
});

test('scenarioFromSearch reads ?mock= and defaults to stopped', () => {
  assert.equal(scenarioFromSearch('?mock=flaky&x=1'), 'flaky');
  assert.equal(scenarioFromSearch(''), 'stopped');
  assert.equal(scenarioFromSearch('?mock=bogus'), 'stopped');
});
