// The ?wake=<id>&next=<path> entry: a visitor opened a sleeping demo and was
// redirected here. Start it, show the wake modal, and send them back when it
// is ready (docs/launcher-hub-spec.md §4.3, design §4.4).
import { demos } from '../../data/demos.ts';
import type { LaunchView } from './controller.ts';
import { initDemosPage, type DemosPage } from './page.ts';
import { WakeModal } from './wake-modal.ts';
import { buildTarget, cleanWakeParams, createAttemptCounter, decideRedirect, parseWake } from './wake.ts';

type Wake = { id: string; next: string };

function sessionStore(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

const counter = createAttemptCounter(sessionStore(), () => Date.now());

/** Entry point for /demos/: read and clear ?wake=, load the cards, then run the wake flow. */
export async function bootDemosPage(): Promise<void> {
  const wake = parseWake(location.search);
  // Clear first, so a reload never starts the project a second time.
  if (wake) history.replaceState(history.state, '', cleanWakeParams(location.href));
  const page = await initDemosPage();
  if (wake) runWakeFlow(wake, page);
}

export function runWakeFlow(wake: Wake, page: DemosPage): void {
  const modal = WakeModal.find();
  if (!modal) return;

  if (page.apiDown) {
    const demo = demos.find((d) => d.id === wake.id && d.appUrl);
    if (!demo?.appUrl) return;
    modal.set({
      kicker: 'Waking up',
      title: "Can't reach the launcher right now",
      text: `${demo.name} is probably asleep, and the service that wakes it up isn't responding.`,
      actions: [
        {
          label: 'Try again',
          variant: 'deep',
          onClick: async () => {
            modal.close();
            runWakeFlow(wake, await initDemosPage());
          },
        },
        {
          label: `Try opening ${demo.name} ↗`,
          variant: 'outline',
          href: buildTarget(demo.appUrl, wake.next),
        },
      ],
    });
    modal.open();
    return;
  }

  const controller = page.controllers.get(wake.id);
  if (!controller) return;

  const name = controller.view.name;
  const target = buildTarget(controller.view.appUrl, wake.next);
  const wasReadyOnArrival = controller.view.phase === 'ready';
  const attempt = counter.record(wake.id);

  let cancelled = false;
  let redirectTimer: ReturnType<typeof setTimeout> | null = null;

  const showProgress = () =>
    modal.set({
      kicker: 'Waking up',
      title: `${name} is starting`,
      text: "The server sleeps when nobody is playing. This takes about a minute, then you'll be taken back automatically.",
      actions: [{ label: 'Stay on this page', variant: 'outline', onClick: () => modal.close() }],
    });

  const showManual = () =>
    modal.set({
      kicker: 'Ready',
      title: `Ready — open ${name}`,
      text: `${name} is running. Open it to continue where you left off.`,
      actions: [
        { label: `Open ${name}`, variant: 'primary', href: target, onClick: () => counter.reset(wake.id) },
      ],
    });

  const showFailed = () =>
    modal.set({
      kicker: 'Waking up',
      title: `Couldn't start ${name}`,
      text: 'Please try again in a moment.',
      actions: [
        {
          label: 'Try again',
          variant: 'deep',
          onClick: () => {
            showProgress();
            controller.start();
          },
        },
        { label: 'Stay on this page', variant: 'outline', onClick: () => modal.close() },
      ],
    });

  const onReady = () => {
    const decision = decideRedirect({ attempt, wasReadyOnArrival, storageAvailable: counter.available });
    if (decision.action === 'manual') {
      showManual();
      return;
    }
    modal.set({
      kicker: 'Ready',
      title: `${name} is ready`,
      text: decision.delayMs > 0 ? 'Taking you back in a few seconds…' : 'Taking you back…',
      actions: [{ label: 'Stay on this page', variant: 'outline', onClick: () => modal.close() }],
    });
    redirectTimer = setTimeout(() => {
      if (!cancelled) location.replace(target);
    }, decision.delayMs);
  };

  const onView = (view: LaunchView) => {
    if (cancelled) return;
    if (view.phase === 'ready') {
      unsubscribe();
      onReady();
    } else if (view.phase === 'failed' || view.phase === 'unavailable') {
      showFailed();
    } else {
      modal.progress(view);
    }
  };

  // The card re-renders every second while running; mirror that in the modal.
  const tick = setInterval(() => {
    if (cancelled || !modal.isOpen) return clearInterval(tick);
    const view = controller.view;
    if (view.running) modal.progress(view);
  }, 1000);

  const unsubscribe = controller.subscribe(onView);
  modal.onClose(() => {
    // "Stay on this page" or Esc: no auto-redirect; the card keeps going.
    cancelled = true;
    unsubscribe();
    clearInterval(tick);
    if (redirectTimer !== null) clearTimeout(redirectTimer);
  });

  showProgress();
  modal.progress(controller.view);
  modal.open();
  controller.start();
}
