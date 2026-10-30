// In-browser stand-in for the launcher API, used in `astro dev` (the real API
// only allows CORS from the production origin). Pick a scenario with ?mock=…
import { normalizeProject } from './api.ts';
import { ApiError, type LauncherApi, type Project } from './types.ts';

export type MockScenario =
  | 'stopped'
  | 'ready'
  | 'stopping'
  | 'ratelimit'
  | 'flaky'
  | 'down'
  | 'timeout'
  | 'unavailable'
  | 'unknown-state';

const SCENARIOS: readonly MockScenario[] = [
  'stopped',
  'ready',
  'stopping',
  'ratelimit',
  'flaky',
  'down',
  'timeout',
  'unavailable',
  'unknown-state',
];

const STOPPING_SECONDS = 4;

export function scenarioFromSearch(search: string): MockScenario {
  const value = new URLSearchParams(search).get('mock');
  return SCENARIOS.includes(value as MockScenario) ? (value as MockScenario) : 'stopped';
}

export function createMockApi(o: {
  scenario: MockScenario;
  bootSeconds?: number;
  /** Simulated network delay per call. */
  latencyMs?: number;
  now?: () => number;
}): LauncherApi {
  const scenario = o.scenario;
  const bootMs = (o.bootSeconds ?? 12) * 1000;
  const latencyMs = o.latencyMs ?? 250;
  const now = o.now ?? (() => Date.now());

  const createdAt = now();
  let startedAt: number | null = scenario === 'ready' ? createdAt - 10 * 60_000 : null;
  let statusCalls = 0;

  function rawState(): string {
    if (scenario === 'unavailable') return 'unavailable';
    if (scenario === 'unknown-state') return 'exploded';
    if (scenario === 'stopping' && startedAt === null && now() - createdAt < STOPPING_SECONDS * 1000) {
      return 'stopping';
    }
    if (startedAt === null) return 'stopped';
    const elapsed = now() - startedAt;
    if (scenario === 'timeout') return elapsed < bootMs / 2 ? 'starting' : 'booting';
    if (elapsed < bootMs / 2) return 'starting';
    if (elapsed < bootMs) return 'booting';
    return 'ready';
  }

  function snapshot(includeStartedAt = true): Project {
    const state = rawState();
    const running = state === 'starting' || state === 'booting' || state === 'ready';
    return normalizeProject({
      id: 'beatgame',
      name: 'BeatGame',
      appUrl: 'https://play.beatgame.app',
      state,
      startedAt: includeStartedAt && running && startedAt !== null ? new Date(startedAt).toISOString() : null,
      expectedBootSeconds: bootMs / 1000,
      idleStopMinutes: 30,
    })!;
  }

  async function respond<T>(fn: () => T): Promise<T> {
    if (latencyMs > 0) await new Promise((resolve) => setTimeout(resolve, latencyMs));
    if (scenario === 'down') throw new ApiError('network', 'mock: down');
    return fn();
  }

  function requireKnown(id: string) {
    if (id !== 'beatgame') throw new ApiError('not-found');
  }

  return {
    listProjects: () => respond(() => [snapshot()]),

    getStatus: (id) =>
      respond(() => {
        requireKnown(id);
        statusCalls += 1;
        if (scenario === 'ratelimit' && statusCalls % 2 === 0) throw new ApiError('rate-limited');
        if (scenario === 'flaky' && statusCalls <= 2) throw new ApiError('server', 'mock: flaky');
        return snapshot();
      }),

    start: (id) =>
      respond(() => {
        requireKnown(id);
        if (rawState() === 'stopped') {
          startedAt = now();
          // Like the real API, the POST response has no startedAt yet.
          return snapshot(false);
        }
        return snapshot();
      }),
  };
}
