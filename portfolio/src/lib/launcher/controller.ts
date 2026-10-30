// Drives one project's launch: POST /start, poll /status until ready, and
// apply the timing rules from docs/launcher-hub-spec.md §4. DOM-free — the
// clock, timers and API are injected so the rules can be unit-tested.
import { MAX_RETRIES, POLL_MS, RATE_LIMIT_MS, RETRY_MS, TIMEOUT_MS } from './config.ts';
import { elapsedSeconds, progressPercent } from './progress.ts';
import { ApiError, type LauncherApi, type Project, type ProjectState } from './types.ts';

export type Phase =
  'stopped' | 'starting' | 'booting' | 'ready' | 'stopping' | 'failed' | 'unavailable' | 'unknown';

export interface LaunchView {
  phase: Phase;
  /** True while a launch is in flight (requests are being made). */
  running: boolean;
  name: string;
  appUrl: string;
  progress: number | null;
  elapsedSeconds: number | null;
  expectedBootSeconds: number;
  idleStopMinutes: number;
}

export interface ControllerDeps {
  api: LauncherApi;
  now(): number;
  setTimer(fn: () => void, ms: number): unknown;
  clearTimer(id: unknown): void;
  /** Defaults to TIMEOUT_MS. */
  timeoutMs?: number;
}

/** View for a card whose status could not be loaded (API down). */
export function unknownView(name: string, appUrl: string): LaunchView {
  return {
    phase: 'unknown',
    running: false,
    name,
    appUrl,
    progress: null,
    elapsedSeconds: null,
    expectedBootSeconds: 60,
    idleStopMinutes: 30,
  };
}

export class LaunchController {
  private project: Project;
  private failed = false;
  private running = false;
  private clickedAt: number | null = null;
  private runStartedAt = 0;
  private timer: unknown = null;
  private disposed = false;
  /** Consecutive network/5xx failures in the current launch. */
  private failures = 0;
  /** ТЗ §4.4: after a stopping → stopped transition, POST /start once more. */
  private sawStopping = false;
  private reposted = false;
  private hidden = false;
  /** The request behind the active timer. */
  private scheduled: (() => void) | null = null;
  /** The next request, held back while the tab is hidden. */
  private pending: (() => void) | null = null;
  private readonly deps: ControllerDeps;
  private readonly onChange: (view: LaunchView) => void;

  constructor(initial: Project, deps: ControllerDeps, onChange: (view: LaunchView) => void) {
    this.project = initial;
    this.deps = deps;
    this.onChange = onChange;
  }

  get view(): LaunchView {
    const now = this.deps.now();
    const p = this.project;
    let phase: Phase = p.state;
    if (this.failed) phase = 'failed';
    // Mid-launch, a bare 'stopped' (before the re-POST lands) still means "on its way up".
    else if (this.running && p.state === 'stopped') phase = 'starting';
    const showsProgress = this.running || p.state === 'ready';
    return {
      phase,
      running: this.running,
      name: p.name,
      appUrl: p.appUrl,
      progress: showsProgress
        ? progressPercent({
            state: phase === 'starting' ? 'starting' : p.state,
            startedAt: p.startedAt,
            clickedAt: this.clickedAt,
            expectedBootSeconds: p.expectedBootSeconds,
            now,
          })
        : null,
      elapsedSeconds: this.running
        ? elapsedSeconds({
            startedAt: p.state === 'stopping' ? null : p.startedAt,
            clickedAt: this.clickedAt,
            now,
          })
        : null,
      expectedBootSeconds: p.expectedBootSeconds,
      idleStopMinutes: p.idleStopMinutes,
    };
  }

  /** Start (or retry) a launch. No-op while one is already in flight. */
  start(): void {
    if (this.running || this.disposed) return;
    this.running = true;
    this.failed = false;
    this.failures = 0;
    this.sawStopping = false;
    this.reposted = false;
    this.pending = null;
    this.clickedAt = this.deps.now();
    this.runStartedAt = this.clickedAt;
    // Optimistic: the button press is acknowledged before the POST returns.
    if (this.project.state === 'stopped' || this.project.state === 'unavailable') {
      this.project = { ...this.project, state: 'starting', startedAt: null };
    }
    this.emit();
    void this.post();
  }

  /** Pause requests while the tab is hidden; resume immediately when shown. */
  setHidden(hidden: boolean): void {
    if (this.disposed || hidden === this.hidden) return;
    this.hidden = hidden;
    if (hidden) {
      if (this.timer !== null && this.scheduled) {
        this.pending = this.scheduled;
        this.clearTimer();
      }
      return;
    }
    const action = this.pending;
    this.pending = null;
    if (action && this.running) action();
  }

  dispose(): void {
    this.disposed = true;
    this.running = false;
    this.pending = null;
    this.clearTimer();
  }

  private async post(): Promise<void> {
    try {
      const result = await this.deps.api.start(this.project.id);
      if (!this.live()) return;
      this.failures = 0;
      this.apply(result);
    } catch (err) {
      if (!this.live()) return;
      this.handleError(err, () => void this.post());
    }
  }

  private async poll(): Promise<void> {
    try {
      const result = await this.deps.api.getStatus(this.project.id);
      if (!this.live()) return;
      this.failures = 0;
      this.apply(result);
    } catch (err) {
      if (!this.live()) return;
      this.handleError(err, () => void this.poll());
    }
  }

  private apply(result: Project): void {
    // POST /start usually returns startedAt: null; keep the last known value.
    this.project = { ...result, startedAt: result.startedAt ?? this.project.startedAt };
    const state: ProjectState = result.state;
    if (state === 'ready' || state === 'unavailable') {
      this.finish();
      return;
    }
    if (this.timedOut()) {
      this.giveUp();
      return;
    }
    if (state === 'stopping') this.sawStopping = true;
    if (state === 'stopped' && this.sawStopping && !this.reposted) {
      this.reposted = true;
      this.emit();
      this.schedule(() => void this.post(), 0);
      return;
    }
    this.emit();
    this.schedule(() => void this.poll(), POLL_MS);
  }

  private handleError(err: unknown, retry: () => void): void {
    const kind = err instanceof ApiError ? err.kind : 'network';
    if (kind === 'not-found') {
      this.project = { ...this.project, state: 'unavailable' };
      this.finish();
      return;
    }
    if (this.timedOut()) {
      this.giveUp();
      return;
    }
    if (kind === 'rate-limited') {
      this.schedule(retry, RATE_LIMIT_MS);
      return;
    }
    this.failures += 1;
    if (this.failures > MAX_RETRIES) {
      this.giveUp();
      return;
    }
    this.schedule(retry, RETRY_MS);
  }

  private timedOut(): boolean {
    return this.deps.now() - this.runStartedAt >= (this.deps.timeoutMs ?? TIMEOUT_MS);
  }

  private finish(): void {
    this.running = false;
    this.pending = null;
    this.clearTimer();
    this.emit();
  }

  private giveUp(): void {
    this.failed = true;
    this.finish();
  }

  private schedule(action: () => void, ms: number): void {
    this.clearTimer();
    if (this.hidden) {
      this.pending = action;
      return;
    }
    this.scheduled = action;
    this.timer = this.deps.setTimer(() => {
      this.timer = null;
      this.scheduled = null;
      action();
    }, ms);
  }

  private clearTimer(): void {
    if (this.timer !== null) {
      this.deps.clearTimer(this.timer);
      this.timer = null;
    }
    this.scheduled = null;
  }

  private live(): boolean {
    return this.running && !this.disposed;
  }

  private emit(): void {
    if (!this.disposed) this.onChange(this.view);
  }
}
