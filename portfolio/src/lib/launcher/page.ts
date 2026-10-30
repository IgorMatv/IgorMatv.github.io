// Wires launch controllers to the /demos/ cards. Requests happen only here.
import { API_BASE } from './config.ts';
import { createHttpApi } from './api.ts';
import { LaunchController, unknownView, type LaunchView } from './controller.ts';
import { renderControl } from './render.ts';
import type { LauncherApi, Project } from './types.ts';
import { demos } from '../../data/demos.ts';

const MOCK_ENABLED = import.meta.env.DEV || import.meta.env.PUBLIC_LAUNCHER_MOCK === '1';

interface PageConfig {
  api: LauncherApi;
  timeoutMs?: number;
}

/** The real API, or in dev the in-browser mock (?mock=<scenario>, ?mock=real to opt out). */
export async function getApi(): Promise<PageConfig> {
  const params = new URLSearchParams(location.search);
  if (MOCK_ENABLED && params.get('mock') !== 'real') {
    const { createMockApi, scenarioFromSearch } = await import('./mock-api.ts');
    const mockTimeout = Number(params.get('mockTimeout'));
    return {
      api: createMockApi({ scenario: scenarioFromSearch(location.search) }),
      timeoutMs: mockTimeout > 0 ? mockTimeout * 1000 : undefined,
    };
  }
  return { api: createHttpApi(API_BASE) };
}

export interface DemosPage {
  controllers: Map<string, LaunchController>;
  apiDown: boolean;
}

function controlFor(id: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(`[data-demo-id="${CSS.escape(id)}"] [data-demo-control]`);
}

/** Card for a project the API knows about but the site has no content for. */
function appendMinimalCard(project: Project): void {
  const list = document.querySelector('[data-demo-list]');
  if (!list) return;
  const card = document.createElement('article');
  card.className = 'featured-card demo-card';
  card.dataset.demoId = project.id;
  const heading = document.createElement('h3');
  heading.textContent = project.name;
  const control = document.createElement('div');
  control.className = 'demo-control';
  control.dataset.demoControl = '';
  control.hidden = true;
  card.append(heading, control);
  list.append(card);
}

const ticking = new Map<LaunchController, () => void>();
let tickTimer: ReturnType<typeof setInterval> | null = null;

/** Re-render running cards once a second so the counter and bar move between polls. */
function track(controller: LaunchController, rerender: () => void): void {
  ticking.set(controller, rerender);
  if (tickTimer !== null) return;
  tickTimer = setInterval(() => {
    for (const [c, redraw] of ticking) {
      if (c.view.running) redraw();
      else ticking.delete(c);
    }
    if (ticking.size === 0 && tickTimer !== null) {
      clearInterval(tickTimer);
      tickTimer = null;
    }
  }, 1000);
}

let page: DemosPage | null = null;

export async function initDemosPage(): Promise<DemosPage> {
  if (page) return page;
  const { api, timeoutMs } = await getApi();
  const controllers = new Map<string, LaunchController>();

  let projects: Project[];
  try {
    projects = await api.listProjects();
  } catch {
    for (const demo of demos) {
      const el = controlFor(demo.id);
      if (el && demo.appUrl) renderControl(el, unknownView(demo.name, demo.appUrl), () => {});
    }
    page = { controllers, apiDown: true };
    return page;
  }

  const deps = {
    api,
    now: () => Date.now(),
    setTimer: (fn: () => void, ms: number) => setTimeout(fn, ms),
    clearTimer: (id: unknown) => clearTimeout(id as ReturnType<typeof setTimeout>),
    timeoutMs,
  };

  for (const project of projects) {
    const demo = demos.find((d) => d.id === project.id);
    if (!demo) appendMinimalCard(project);
    const el = controlFor(project.id);
    if (!el) continue;

    // Show the site's own spelling of the name on the card.
    const initial = demo ? { ...project, name: demo.name } : project;
    let controller: LaunchController;
    const render = (view: LaunchView) => renderControl(el, view, () => controller.start());
    controller = new LaunchController(initial, deps, (view) => {
      render(view);
      if (view.running) track(controller, () => render(controller.view));
    });
    render(controller.view);
    controllers.set(project.id, controller);
  }

  document.addEventListener('visibilitychange', () => {
    for (const c of controllers.values()) c.setHidden(document.hidden);
  });

  page = { controllers, apiDown: false };
  return page;
}
