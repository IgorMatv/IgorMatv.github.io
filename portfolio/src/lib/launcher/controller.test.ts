import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LaunchController, type LaunchView } from './controller.ts';
import { progressPercent } from './progress.ts';
import { T0, iso, makeDeps, project } from './fake-deps.test-helper.ts';

function setup(initial = project()) {
  const ctx = makeDeps();
  const views: LaunchView[] = [];
  const controller = new LaunchController(initial, ctx.deps, (v) => views.push(v));
  return { ...ctx, controller, views };
}

// ---- progress ----

test('progressPercent: from startedAt, capped at 95', () => {
  const base = {
    state: 'booting' as const,
    startedAt: iso(T0),
    clickedAt: T0 - 5000,
    expectedBootSeconds: 60,
  };
  assert.equal(progressPercent({ ...base, now: T0 + 30_000 }), 50);
  assert.equal(progressPercent({ ...base, now: T0 + 120_000 }), 95);
});

test('progressPercent: uses clickedAt while startedAt is null', () => {
  const p = progressPercent({
    state: 'starting',
    startedAt: null,
    clickedAt: T0,
    expectedBootSeconds: 60,
    now: T0 + 6000,
  });
  assert.equal(p, 10);
});

test('progressPercent: ready → 100', () => {
  assert.equal(
    progressPercent({ state: 'ready', startedAt: null, clickedAt: null, expectedBootSeconds: 60, now: T0 }),
    100,
  );
});

test('progressPercent: stopped without a click → null', () => {
  assert.equal(
    progressPercent({ state: 'stopped', startedAt: null, clickedAt: null, expectedBootSeconds: 60, now: T0 }),
    null,
  );
});

// ---- controller core ----

test('initial view mirrors project state and makes no request', async () => {
  const { controller, api, clock } = setup(project({ state: 'ready' }));
  await clock.advance(60_000);
  assert.equal(controller.view.phase, 'ready');
  assert.equal(controller.view.running, false);
  assert.equal(api.calls.length, 0);
  assert.equal(clock.pending, 0);
});

test('start: POST once, then status every 4000 ms', async () => {
  const { controller, api, clock } = setup();
  api.startReplies = [project({ state: 'starting' })];
  api.statusReplies = [project({ state: 'starting', startedAt: iso(T0) })];
  controller.start();
  await clock.advance(12_000);
  assert.equal(api.count('start'), 1);
  assert.deepEqual(
    api.calls.filter((c) => c.method === 'status').map((c) => c.at - T0),
    [4000, 8000, 12_000],
  );
  assert.equal(controller.view.phase, 'starting');
  assert.equal(controller.view.running, true);
});

test('double start() while running → one POST, one poll loop', async () => {
  const { controller, api, clock } = setup();
  api.startReplies = [project({ state: 'starting' })];
  api.statusReplies = [project({ state: 'starting' })];
  controller.start();
  controller.start();
  await clock.advance(1000);
  controller.start();
  await clock.advance(7000);
  assert.equal(api.count('start'), 1);
  assert.equal(api.count('status'), 2);
});

test('ready stops polling and progress becomes 100', async () => {
  const { controller, api, clock, views } = setup();
  api.startReplies = [project({ state: 'starting' })];
  api.statusReplies = [
    project({ state: 'booting', startedAt: iso(T0) }),
    project({ state: 'ready', startedAt: iso(T0) }),
  ];
  controller.start();
  await clock.advance(8000);
  assert.equal(controller.view.phase, 'ready');
  assert.equal(controller.view.progress, 100);
  assert.equal(controller.view.running, false);
  assert.equal(views.at(-1)?.phase, 'ready');
  const before = api.calls.length;
  await clock.advance(60_000);
  assert.equal(api.calls.length, before);
  assert.equal(clock.pending, 0);
});

test('unavailable from status stops polling', async () => {
  const { controller, api, clock } = setup();
  api.startReplies = [project({ state: 'starting' })];
  api.statusReplies = [project({ state: 'unavailable' })];
  controller.start();
  await clock.advance(20_000);
  assert.equal(controller.view.phase, 'unavailable');
  assert.equal(api.count('status'), 1);
});

test('no ready after 180000 ms → phase failed, polling stopped', async () => {
  const { controller, api, clock } = setup();
  api.startReplies = [project({ state: 'starting' })];
  api.statusReplies = [project({ state: 'booting', startedAt: iso(T0) })];
  controller.start();
  await clock.advance(176_000);
  assert.equal(controller.view.phase, 'booting');
  await clock.advance(4000);
  assert.equal(controller.view.phase, 'failed');
  const before = api.calls.length;
  await clock.advance(60_000);
  assert.equal(api.calls.length, before);
});

test('start() from failed retries (new POST, timeout restarts)', async () => {
  const { controller, api, clock } = setup();
  api.startReplies = [project({ state: 'starting' })];
  api.statusReplies = [project({ state: 'booting' })];
  controller.start();
  await clock.advance(180_000);
  assert.equal(controller.view.phase, 'failed');
  controller.start();
  await clock.advance(100_000);
  assert.equal(api.count('start'), 2);
  assert.equal(controller.view.phase, 'booting');
});

test('loaded mid-boot: shows the state but does not poll until start()', async () => {
  const { controller, api, clock } = setup(project({ state: 'booting', startedAt: iso(T0 - 20_000) }));
  await clock.advance(30_000);
  assert.equal(controller.view.phase, 'booting');
  assert.equal(controller.view.running, false);
  assert.equal(api.calls.length, 0);
});

test('dispose clears pending timers', async () => {
  const { controller, api, clock } = setup();
  api.startReplies = [project({ state: 'starting' })];
  api.statusReplies = [project({ state: 'starting' })];
  controller.start();
  await clock.advance(1000);
  controller.dispose();
  assert.equal(clock.pending, 0);
  await clock.advance(20_000);
  assert.equal(api.count('status'), 0);
});
