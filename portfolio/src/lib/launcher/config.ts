// Launcher timings and endpoint. Values are fixed by docs/launcher-hub-spec.md §4.

export const API_BASE: string =
  import.meta.env?.PUBLIC_LAUNCHER_API ?? 'https://iy9imezsie.execute-api.us-east-1.amazonaws.com';

/** A request that has not answered by then counts as a network error. */
export const REQUEST_TIMEOUT_MS = 15_000;
/** Status polling interval after Start / during a wake. */
export const POLL_MS = 4000;
/** Delay before the next request after a 429. */
export const RATE_LIMIT_MS = 8000;
/** Pause between retries after a network error or 5xx. */
export const RETRY_MS = 4000;
/** Consecutive network/5xx failures tolerated before giving up. */
export const MAX_RETRIES = 3;
/** Give up if the project is not ready this long after Start. */
export const TIMEOUT_MS = 180_000;

/** Wait before redirecting when a repeat wake finds the project already ready (DNS cache). */
export const WAKE_REPEAT_DELAY_MS = 15_000;
/** After this many wake attempts, stop redirecting and show a manual link. */
export const WAKE_MAX_ATTEMPTS = 3;
/** The wake attempt counter resets after this long. */
export const WAKE_COUNTER_TTL_MS = 600_000;

export const DEFAULT_BOOT_SECONDS = 60;
export const DEFAULT_IDLE_STOP_MINUTES = 30;
