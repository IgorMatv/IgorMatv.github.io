// Renders one card's control strip from a LaunchView. The strip's skeleton is
// built once; later calls only update text, the progress bar, and — when it
// actually changes — the action element.
import type { LaunchView, Phase } from './controller.ts';

type Dot = 'idle' | 'wait' | 'on' | 'error' | 'unknown';

interface Copy {
  dot: Dot;
  title: string;
  sub: string;
}

const minutes = (seconds: number) => Math.max(1, Math.round(seconds / 60));

function progressLine(view: LaunchView): string {
  const elapsed = Math.round(view.elapsedSeconds ?? 0);
  return `${elapsed} s of ~${view.expectedBootSeconds} s`;
}

/** State title and subtitle for a view (shared by the card strip and the wake modal). */
export function describe(view: LaunchView): Copy {
  const following = 'Press Start to follow its progress';
  const titles: Record<Phase, Copy> = {
    stopped: { dot: 'idle', title: 'Asleep', sub: `Starts in ~${minutes(view.expectedBootSeconds)} min` },
    starting: {
      dot: 'wait',
      title: 'Starting the server…',
      sub: view.running ? progressLine(view) : following,
    },
    booting: { dot: 'wait', title: 'Starting the app…', sub: view.running ? progressLine(view) : following },
    stopping: {
      dot: 'wait',
      title: 'Going to sleep…',
      sub: view.running ? 'It will start again automatically in a few seconds' : following,
    },
    ready: { dot: 'on', title: 'Running', sub: `Sleeps after ${view.idleStopMinutes} min with no players` },
    failed: { dot: 'error', title: "Couldn't start", sub: 'Please try again in a moment' },
    unavailable: { dot: 'error', title: 'Unavailable', sub: 'This demo is temporarily offline' },
    unknown: { dot: 'unknown', title: 'Status unknown', sub: 'It may still be running' },
  };
  return titles[view.phase];
}

type ActionKind = 'start' | 'busy-starting' | 'busy-waiting' | 'open' | 'retry' | 'try-open' | 'none';

function actionFor(view: LaunchView): ActionKind {
  switch (view.phase) {
    case 'stopped':
      return 'start';
    case 'starting':
    case 'booting':
      return view.running ? 'busy-starting' : 'start';
    case 'stopping':
      return view.running ? 'busy-waiting' : 'start';
    case 'ready':
      return 'open';
    case 'failed':
      return 'retry';
    case 'unknown':
      return 'try-open';
    case 'unavailable':
      return 'none';
  }
}

function newTabNote(): HTMLElement {
  const note = document.createElement('span');
  note.className = 'visually-hidden';
  note.textContent = ' (opens in new tab)';
  return note;
}

function buildAction(kind: ActionKind, view: LaunchView, onStart: () => void): HTMLElement | null {
  const button = (label: string, variant: string, disabled = false) => {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = `btn btn--sm ${variant}`;
    el.textContent = label;
    el.disabled = disabled;
    if (!disabled) el.addEventListener('click', onStart);
    return el;
  };
  const link = (label: string, className: string) => {
    const el = document.createElement('a');
    el.className = className;
    el.href = view.appUrl;
    el.target = '_blank';
    el.rel = 'noopener noreferrer';
    el.textContent = label;
    el.append(newTabNote());
    return el;
  };

  switch (kind) {
    case 'start':
      return button('Start demo', 'btn--deep');
    case 'busy-starting':
      return button('Starting…', 'btn--deep', true);
    case 'busy-waiting':
      return button('Waiting…', 'btn--deep', true);
    case 'retry':
      return button('Try again', 'btn--outline');
    case 'open':
      return link(`Open ${view.name} ↗`, 'btn btn--sm btn--primary');
    case 'try-open':
      return link('Try opening ↗', 'demo-control__link');
    case 'none':
      return null;
  }
}

interface Parts {
  dot: HTMLElement;
  title: HTMLElement;
  sub: HTMLElement;
  action: HTMLElement;
  bar: HTMLElement;
  fill: HTMLElement;
  actionKey: string;
}

const parts = new WeakMap<HTMLElement, Parts>();

function skeleton(el: HTMLElement): Parts {
  el.replaceChildren();
  const row = document.createElement('div');
  row.className = 'demo-control__row';

  const text = document.createElement('div');
  text.className = 'demo-control__text';
  const title = document.createElement('p');
  title.className = 'demo-control__title';
  const dot = document.createElement('span');
  dot.setAttribute('aria-hidden', 'true');
  const titleText = document.createElement('span');
  // Only the state name is announced; the per-second counter is not.
  titleText.setAttribute('aria-live', 'polite');
  title.append(dot, titleText);
  const sub = document.createElement('p');
  sub.className = 'demo-control__sub';
  text.append(title, sub);

  const action = document.createElement('div');
  action.className = 'demo-control__action';
  row.append(text, action);

  const bar = document.createElement('div');
  bar.className = 'progress-bar';
  bar.setAttribute('role', 'progressbar');
  bar.setAttribute('aria-valuemin', '0');
  bar.setAttribute('aria-valuemax', '100');
  bar.setAttribute('aria-label', 'Start-up progress');
  const fill = document.createElement('span');
  fill.className = 'progress-bar__fill';
  bar.append(fill);

  el.append(row, bar);
  const p: Parts = { dot, title: titleText, sub, action, bar, fill, actionKey: '' };
  parts.set(el, p);
  return p;
}

export function renderControl(el: HTMLElement, view: LaunchView, onStart: () => void): void {
  const p = parts.get(el) ?? skeleton(el);
  const copy = describe(view);

  p.dot.className = `demo-dot demo-dot--${copy.dot}`;
  if (p.title.textContent !== copy.title) p.title.textContent = copy.title;
  p.sub.textContent = copy.sub;

  const showBar = view.running && view.progress !== null;
  p.bar.hidden = !showBar;
  if (showBar) {
    const value = Math.round(view.progress ?? 0);
    p.fill.style.width = `${value}%`;
    p.bar.setAttribute('aria-valuenow', String(value));
  }

  const kind = actionFor(view);
  const key = `${kind}|${view.appUrl}|${view.name}`;
  if (key !== p.actionKey) {
    p.actionKey = key;
    const action = buildAction(kind, view, onStart);
    p.action.replaceChildren(...(action ? [action] : []));
  }

  el.hidden = false;
}
