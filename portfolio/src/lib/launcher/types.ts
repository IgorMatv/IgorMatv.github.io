// Shapes of the launcher API (docs/launcher-hub-spec.md §2).

export type ProjectState = 'stopped' | 'starting' | 'booting' | 'ready' | 'stopping' | 'unavailable';

export interface Project {
  id: string;
  name: string;
  /** No trailing slash. */
  appUrl: string;
  state: ProjectState;
  startedAt: string | null;
  expectedBootSeconds: number;
  idleStopMinutes: number;
}

export type ApiErrorKind = 'rate-limited' | 'not-found' | 'server' | 'network';

export class ApiError extends Error {
  readonly kind: ApiErrorKind;

  constructor(kind: ApiErrorKind, message?: string) {
    super(message ?? kind);
    this.name = 'ApiError';
    this.kind = kind;
  }
}

export interface LauncherApi {
  listProjects(): Promise<Project[]>;
  getStatus(id: string): Promise<Project>;
  start(id: string): Promise<Project>;
}
