// The ?wake=<id>&next=<path> entry: a visitor opened a sleeping demo and was
// redirected here. Offer to start it (only on an explicit click), then send
// them back when it is ready (docs/launcher-hub-spec.md §4.3, design §4.4).
import { demos } from '../../data/demos.ts';
import type { LaunchView } from './controller.ts';
import { initDemosPage, type DemosPage } from './page.ts';
import { WakeModal } from './wake-modal.ts';
import { buildTarget, cleanWakeParams, parseWake } from './wake.ts';

type Wake = { id: string; next: string };

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

  // Already running (the browser hit the sleep redirect on the old host just
  // before DNS flipped back): nothing to start, go straight to the game.
  // appUrl never points at the sleep redirect, so this cannot loop.
  if (controller.view.phase === 'ready') {
    modal.set({ kicker: 'Ready', title: `${name} is running`, text: 'Taking you there…', actions: [] });
    modal.open();
    location.replace(target);
    return;
  }

  let cancelled = false;
  let redirectTimer: ReturnType<typeof setTimeout> | null = null;
  let tick: ReturnType<typeof setInterval> | null = null;
  let unsubscribe: () => void = () => {};

  const stay = { label: 'Stay on this page', variant: 'outline' as const, onClick: () => modal.close() };

  const showProgress = () =>
    modal.set({
      kicker: 'Waking up',
      title: `${name} is starting`,
      text: "This takes about a minute, then you'll be taken back automatically.",
      actions: [stay],
    });

  const showFailed = () =>
    modal.set({
      kicker: 'Waking up',
      title: `Couldn't start ${name}`,
      text: 'Please try again in a moment.',
      actions: [{ label: 'Try again', variant: 'deep', onClick: () => start() }, stay],
    });

  const stopTicking = () => {
    if (tick !== null) clearInterval(tick);
    tick = null;
  };

  const onView = (view: LaunchView) => {
    if (cancelled) return;
    if (view.phase === 'ready') {
      unsubscribe();
      stopTicking();
      modal.set({ kicker: 'Ready', title: `${name} is ready`, text: 'Taking you back…', actions: [stay] });
      redirectTimer = setTimeout(() => {
        if (!cancelled) location.replace(target);
      }, 0);
    } else if (view.phase === 'failed' || view.phase === 'unavailable') {
      stopTicking();
      showFailed();
    } else {
      modal.progress(view);
    }
  };

  const start = () => {
    showProgress();
    unsubscribe();
    unsubscribe = controller.subscribe(onView);
    controller.start();
    modal.progress(controller.view);
    // The card re-renders every second while running; mirror that in the modal.
    stopTicking();
    tick = setInterval(() => {
      const view = controller.view;
      if (view.running) modal.progress(view);
    }, 1000);
  };

  modal.onClose(() => {
    // "Stay on this page" or Esc: no auto-redirect; a started launch keeps going in the card.
    cancelled = true;
    unsubscribe();
    stopTicking();
    if (redirectTimer !== null) clearTimeout(redirectTimer);
  });

  // Nothing is started without an explicit click (bots and link previews must not wake EC2).
  modal.set({
    kicker: 'Asleep',
    title: `${name} is asleep`,
    text: "It sleeps when nobody is playing. Starting it takes about a minute, then you'll be taken back automatically.",
    actions: [{ label: `Start ${name}`, variant: 'deep', onClick: () => start() }, stay],
  });
  modal.open();
}
