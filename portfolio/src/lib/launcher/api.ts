import { DEFAULT_BOOT_SECONDS, DEFAULT_IDLE_STOP_MINUTES } from './config.ts';
import { ApiError, type LauncherApi, type Project, type ProjectState } from './types.ts';

const KNOWN_STATES: readonly ProjectState[] = [
  'stopped',
  'starting',
  'booting',
  'ready',
  'stopping',
  'unavailable',
];

const positiveNumber = (value: unknown, fallback: number) =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback;

/**
 * Coerces one API project object into a Project, or null if it cannot be
 * used (no id or appUrl). Any unknown state is treated as 'unavailable'.
 */
export function normalizeProject(raw: unknown): Project | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== 'string' || !r.id) return null;
  if (typeof r.appUrl !== 'string' || !r.appUrl) return null;

  const state = KNOWN_STATES.includes(r.state as ProjectState) ? (r.state as ProjectState) : 'unavailable';

  return {
    id: r.id,
    name: typeof r.name === 'string' && r.name ? r.name : r.id,
    appUrl: r.appUrl.replace(/\/+$/, ''),
    state,
    startedAt: typeof r.startedAt === 'string' ? r.startedAt : null,
    expectedBootSeconds: positiveNumber(r.expectedBootSeconds, DEFAULT_BOOT_SECONDS),
    idleStopMinutes: positiveNumber(r.idleStopMinutes, DEFAULT_IDLE_STOP_MINUTES),
  };
}

export function createHttpApi(
  baseUrl: string,
  fetchFn: typeof fetch = (...args) => fetch(...args),
): LauncherApi {
  const base = baseUrl.replace(/\/+$/, '');

  async function request(path: string, method: 'GET' | 'POST' = 'GET'): Promise<unknown> {
    let response: Response;
    try {
      response = await fetchFn(`${base}${path}`, { method, cache: 'no-store' });
    } catch (err) {
      throw new ApiError('network', err instanceof Error ? err.message : undefined);
    }
    if (response.status === 429) throw new ApiError('rate-limited');
    if (response.status === 404) throw new ApiError('not-found');
    if (!response.ok) throw new ApiError('server', `HTTP ${response.status}`);
    try {
      return await response.json();
    } catch {
      throw new ApiError('server', 'Invalid JSON');
    }
  }

  async function project(path: string, method: 'GET' | 'POST' = 'GET'): Promise<Project> {
    const result = normalizeProject(await request(path, method));
    if (!result) throw new ApiError('server', 'Malformed project');
    return result;
  }

  return {
    async listProjects() {
      const body = (await request('/projects')) as { projects?: unknown } | null;
      const list = Array.isArray(body?.projects) ? body.projects : [];
      return list.map(normalizeProject).filter((p): p is Project => p !== null);
    },
    getStatus: (id) => project(`/projects/${encodeURIComponent(id)}/status`),
    start: (id) => project(`/projects/${encodeURIComponent(id)}/start`, 'POST'),
  };
}
