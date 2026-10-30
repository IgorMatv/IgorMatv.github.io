import type { ProjectState } from './types.ts';

/** Seconds since the boot began: EC2 startedAt when known, else the Start click. */
export function elapsedSeconds(o: {
  startedAt: string | null;
  clickedAt: number | null;
  now: number;
}): number | null {
  const started = o.startedAt ? Date.parse(o.startedAt) : NaN;
  const from = Number.isFinite(started) ? started : o.clickedAt;
  if (from === null) return null;
  return Math.max(0, (o.now - from) / 1000);
}

/**
 * Boot progress per docs/launcher-hub-spec.md §3: min(95, elapsed / expected * 100),
 * and 100 only once ready. Null when there is nothing to show.
 */
export function progressPercent(o: {
  state: ProjectState;
  startedAt: string | null;
  clickedAt: number | null;
  expectedBootSeconds: number;
  now: number;
}): number | null {
  if (o.state === 'ready') return 100;
  const inFlight =
    o.state === 'starting' || o.state === 'booting' || (o.state === 'stopping' && o.clickedAt !== null);
  if (!inFlight) return null;
  // While stopping, startedAt belongs to the old run; count from the click.
  const elapsed = elapsedSeconds({
    startedAt: o.state === 'stopping' ? null : o.startedAt,
    clickedAt: o.clickedAt,
    now: o.now,
  });
  if (elapsed === null) return null;
  return Math.min(95, (elapsed / o.expectedBootSeconds) * 100);
}
