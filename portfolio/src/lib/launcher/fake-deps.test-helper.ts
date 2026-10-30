// Test doubles for LaunchController: a manual clock with timers and a
// scripted LauncherApi. Not a test file itself (no *.test.ts suffix).
import { ApiError, type ApiErrorKind, type LauncherApi, type Project } from './types.ts';
import type { ControllerDeps } from './controller.ts';

export const T0 = Date.parse('2026-10-30T12:00:00Z');

export function project(overrides: Partial<Project> = {}): Project {
  return {
    id: 'beatgame',
    name: 'BeatGame',
    appUrl: 'https://beatgame.app',
    state: 'stopped',
    startedAt: null,
    expectedBootSeconds: 60,
    idleStopMinutes: 30,
    ...overrides,
  };
}

export const flush = async () => {
  for (let i = 0; i < 10; i++) await Promise.resolve();
};

interface Timer {
  id: number;
  at: number;
  fn: () => void;
}

export class FakeClock {
  now = T0;
  private timers: Timer[] = [];
  private nextId = 1;

  setTimer = (fn: () => void, ms: number) => {
    const id = this.nextId++;
    this.timers.push({ id, at: this.now + ms, fn });
    return id;
  };

  clearTimer = (id: unknown) => {
    this.timers = this.timers.filter((t) => t.id !== id);
  };

  get pending() {
    return this.timers.length;
  }

  /** Moves time forward, firing due timers in order and letting promises settle. */
  async advance(ms: number) {
    const target = this.now + ms;
    await flush();
    for (;;) {
      this.timers.sort((a, b) => a.at - b.at);
      const next = this.timers[0];
      if (!next || next.at > target) break;
      this.timers.shift();
      this.now = next.at;
      next.fn();
      await flush();
    }
    this.now = target;
    await flush();
  }
}

type Reply = Project | ApiErrorKind;

/** Scripted API. Each method replays its queue; the last reply repeats. */
export class FakeApi implements LauncherApi {
  calls: { method: 'list' | 'status' | 'start'; at: number }[] = [];
  statusReplies: Reply[] = [];
  startReplies: Reply[] = [];
  listReplies: (Project[] | ApiErrorKind)[] = [];

  private readonly clock: FakeClock;

  constructor(clock: FakeClock) {
    this.clock = clock;
  }

  count(method: 'list' | 'status' | 'start') {
    return this.calls.filter((c) => c.method === method).length;
  }

  private take<T>(queue: T[]): T {
    if (queue.length === 0) throw new Error('FakeApi: no scripted reply');
    return queue.length > 1 ? queue.shift()! : queue[0];
  }

  private async resolve<T>(reply: T | ApiErrorKind): Promise<T> {
    if (typeof reply === 'string') throw new ApiError(reply);
    return reply;
  }

  listProjects() {
    this.calls.push({ method: 'list', at: this.clock.now });
    return this.resolve(this.take(this.listReplies));
  }

  getStatus() {
    this.calls.push({ method: 'status', at: this.clock.now });
    return this.resolve(this.take(this.statusReplies));
  }

  start() {
    this.calls.push({ method: 'start', at: this.clock.now });
    return this.resolve(this.take(this.startReplies));
  }
}

export function makeDeps(overrides: Partial<ControllerDeps> = {}) {
  const clock = new FakeClock();
  const api = new FakeApi(clock);
  const deps: ControllerDeps = {
    api,
    now: () => clock.now,
    setTimer: clock.setTimer,
    clearTimer: clock.clearTimer,
    ...overrides,
  };
  return { clock, api, deps };
}

export const iso = (ms: number) => new Date(ms).toISOString();
