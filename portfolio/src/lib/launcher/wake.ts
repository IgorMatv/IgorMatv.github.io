// Helpers for the ?wake=<id>&next=<path> entry (docs/launcher-hub-spec.md §4.3):
// open-redirect-safe `next`, and the loop guard kept in sessionStorage.
import { WAKE_COUNTER_TTL_MS, WAKE_MAX_ATTEMPTS, WAKE_REPEAT_DELAY_MS } from './config.ts';

/** Only a same-origin absolute path is allowed: starts with '/', not '//', no '\'. */
export function sanitizeNext(raw: string | null): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.includes('\\')) return '/';
  return raw;
}

export function parseWake(search: string): { id: string; next: string } | null {
  const params = new URLSearchParams(search);
  const id = params.get('wake');
  if (!id) return null;
  return { id, next: sanitizeNext(params.get('next')) };
}

export function buildTarget(appUrl: string, next: string): string {
  return appUrl.replace(/\/+$/, '') + next;
}

/** Path + query + hash of `url` with wake/next removed. */
export function cleanWakeParams(url: string): string {
  const u = new URL(url);
  u.searchParams.delete('wake');
  u.searchParams.delete('next');
  const query = u.searchParams.toString();
  return u.pathname + (query ? `?${query}` : '') + u.hash;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const keyFor = (id: string) => `launcher:wake:${id}`;

export function createAttemptCounter(storage: StorageLike | null, now: () => number) {
  let available = false;
  if (storage) {
    try {
      storage.setItem('launcher:probe', '1');
      storage.removeItem('launcher:probe');
      available = true;
    } catch {
      available = false;
    }
  }

  return {
    get available() {
      return available;
    },

    /** Records one attempt and returns how many there have been (this one included). */
    record(id: string): number {
      if (!available || !storage) return 1;
      try {
        const saved = JSON.parse(storage.getItem(keyFor(id)) ?? 'null') as {
          count?: number;
          firstAt?: number;
        } | null;
        const fresh =
          saved && typeof saved.count === 'number' && typeof saved.firstAt === 'number'
            ? now() - saved.firstAt <= WAKE_COUNTER_TTL_MS
            : false;
        const next = fresh
          ? { count: saved!.count! + 1, firstAt: saved!.firstAt! }
          : { count: 1, firstAt: now() };
        storage.setItem(keyFor(id), JSON.stringify(next));
        return next.count;
      } catch {
        return 1;
      }
    },

    reset(id: string): void {
      try {
        storage?.removeItem(keyFor(id));
      } catch {
        /* storage unavailable — nothing to reset */
      }
    },
  };
}

export type WakeDecision = { action: 'redirect'; delayMs: number } | { action: 'manual' };

export function decideRedirect(o: {
  attempt: number;
  wasReadyOnArrival: boolean;
  storageAvailable: boolean;
}): WakeDecision {
  if (o.attempt > WAKE_MAX_ATTEMPTS) return { action: 'manual' };
  // Already ready on arrival is the loop signature (stale DNS). Without a
  // counter we can't bound it, so let the visitor click instead.
  if (o.wasReadyOnArrival && !o.storageAvailable) return { action: 'manual' };
  if (o.wasReadyOnArrival && o.attempt > 1) return { action: 'redirect', delayMs: WAKE_REPEAT_DELAY_MS };
  return { action: 'redirect', delayMs: 0 };
}
