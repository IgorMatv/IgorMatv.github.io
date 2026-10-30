import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHttpApi } from './api.ts';
import { ApiError } from './types.ts';

const BASE = 'https://api.example';

const beatgameStopped = {
  id: 'beatgame',
  name: 'BeatGame',
  appUrl: 'https://play.beatgame.app',
  state: 'stopped',
  startedAt: null,
  expectedBootSeconds: 60,
  idleStopMinutes: 30,
};

interface Call {
  url: string;
  method: string;
  body: unknown;
}

function fakeFetch(respond: (call: Call) => Response | Promise<Response>) {
  const calls: Call[] = [];
  const fn = (async (input: string | URL | Request, init?: RequestInit) => {
    const call = { url: String(input), method: init?.method ?? 'GET', body: init?.body };
    calls.push(call);
    return respond(call);
  }) as typeof fetch;
  return { fn, calls };
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

async function rejectsWithKind(promise: Promise<unknown>, kind: string) {
  await assert.rejects(promise, (err: unknown) => err instanceof ApiError && err.kind === kind);
}

test('listProjects returns normalized projects', async () => {
  const { fn, calls } = fakeFetch(() => json(200, { projects: [beatgameStopped] }));
  const projects = await createHttpApi(BASE, fn).listProjects();
  assert.deepEqual(projects, [beatgameStopped]);
  assert.equal(calls[0].url, `${BASE}/projects`);
});

test('unknown state becomes unavailable', async () => {
  const { fn } = fakeFetch(() => json(200, { projects: [{ ...beatgameStopped, state: 'exploded' }] }));
  const [project] = await createHttpApi(BASE, fn).listProjects();
  assert.equal(project.state, 'unavailable');
});

test('missing numbers fall back to 60 / 30', async () => {
  const { expectedBootSeconds: _e, idleStopMinutes: _i, ...rest } = beatgameStopped;
  const { fn } = fakeFetch(() => json(200, { projects: [rest] }));
  const [project] = await createHttpApi(BASE, fn).listProjects();
  assert.equal(project.expectedBootSeconds, 60);
  assert.equal(project.idleStopMinutes, 30);
});

test('entries without id or appUrl are dropped', async () => {
  const { fn } = fakeFetch(() =>
    json(200, {
      projects: [
        { ...beatgameStopped, id: undefined },
        { ...beatgameStopped, appUrl: '' },
        beatgameStopped,
        'junk',
      ],
    }),
  );
  const projects = await createHttpApi(BASE, fn).listProjects();
  assert.deepEqual(
    projects.map((p) => p.id),
    ['beatgame'],
  );
});

test('appUrl trailing slash is stripped', async () => {
  const { fn } = fakeFetch(() =>
    json(200, { projects: [{ ...beatgameStopped, appUrl: 'https://play.beatgame.app/' }] }),
  );
  const [project] = await createHttpApi(BASE, fn).listProjects();
  assert.equal(project.appUrl, 'https://play.beatgame.app');
});

test('429 → ApiError rate-limited', async () => {
  const { fn } = fakeFetch(() => json(429, { message: 'Too Many Requests' }));
  await rejectsWithKind(createHttpApi(BASE, fn).getStatus('beatgame'), 'rate-limited');
});

test('404 → ApiError not-found', async () => {
  const { fn } = fakeFetch(() => json(404, { error: 'unknown_project' }));
  await rejectsWithKind(createHttpApi(BASE, fn).getStatus('nope'), 'not-found');
});

test('503 → ApiError server', async () => {
  const { fn } = fakeFetch(() => json(503, {}));
  await rejectsWithKind(createHttpApi(BASE, fn).listProjects(), 'server');
});

test('fetch rejects → ApiError network', async () => {
  const fn = (async () => {
    throw new TypeError('Failed to fetch');
  }) as typeof fetch;
  await rejectsWithKind(createHttpApi(BASE, fn).listProjects(), 'network');
});

test('non-JSON 200 body → ApiError server', async () => {
  const { fn } = fakeFetch(() => new Response('<html>oops</html>', { status: 200 }));
  await rejectsWithKind(createHttpApi(BASE, fn).listProjects(), 'server');
});

test('status with unusable project → ApiError server', async () => {
  const { fn } = fakeFetch(() => json(200, { nope: true }));
  await rejectsWithKind(createHttpApi(BASE, fn).getStatus('beatgame'), 'server');
});

test('getStatus requests /projects/{id}/status', async () => {
  const { fn, calls } = fakeFetch(() => json(200, beatgameStopped));
  const project = await createHttpApi(BASE, fn).getStatus('beatgame');
  assert.equal(calls[0].url, `${BASE}/projects/beatgame/status`);
  assert.equal(calls[0].method, 'GET');
  assert.equal(project.id, 'beatgame');
});

test('start sends POST with no body to /projects/{id}/start', async () => {
  const { fn, calls } = fakeFetch(() => json(202, { ...beatgameStopped, state: 'starting' }));
  const project = await createHttpApi(BASE, fn).start('beatgame');
  assert.equal(calls[0].url, `${BASE}/projects/beatgame/start`);
  assert.equal(calls[0].method, 'POST');
  assert.equal(calls[0].body, undefined);
  assert.equal(project.state, 'starting');
});

test('baseUrl trailing slash is tolerated', async () => {
  const { fn, calls } = fakeFetch(() => json(200, { projects: [] }));
  await createHttpApi(`${BASE}/`, fn).listProjects();
  assert.equal(calls[0].url, `${BASE}/projects`);
});

test('a hung request is aborted → ApiError network', async () => {
  const fn = ((_input: string | URL | Request, init?: RequestInit) =>
    new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'TimeoutError')));
    })) as typeof fetch;
  await rejectsWithKind(createHttpApi(BASE, fn, 20).getStatus('beatgame'), 'network');
});

test('appUrl must be https', async () => {
  const { fn } = fakeFetch(() =>
    json(200, {
      projects: [
        { ...beatgameStopped, id: 'a', appUrl: 'javascript:alert(1)' },
        { ...beatgameStopped, id: 'b', appUrl: 'http://play.beatgame.app' },
        { ...beatgameStopped, id: 'c', appUrl: 'not a url' },
        beatgameStopped,
      ],
    }),
  );
  const projects = await createHttpApi(BASE, fn).listProjects();
  assert.deepEqual(
    projects.map((p) => p.id),
    ['beatgame'],
  );
});
