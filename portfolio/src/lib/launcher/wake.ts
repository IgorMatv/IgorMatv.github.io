// Helpers for the ?wake=<id>&next=<path> entry (docs/launcher-hub-spec.md §4.3):
// open-redirect-safe `next` and URL clean-up.

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
