// Thin view over the <dialog data-wake-modal> from WakeModal.astro.
import type { LaunchView } from './controller.ts';
import { describe } from './render.ts';

export interface ModalAction {
  label: string;
  variant: 'primary' | 'deep' | 'outline';
  /** Link target; otherwise a button. */
  href?: string;
  newTab?: boolean;
  onClick?: () => void;
}

export class WakeModal {
  private readonly dialog: HTMLDialogElement;
  private readonly kicker: HTMLElement;
  private readonly title: HTMLElement;
  private readonly text: HTMLElement;
  private readonly bar: HTMLElement;
  private readonly fill: HTMLElement;
  private readonly status: HTMLElement;
  private readonly actions: HTMLElement;

  constructor(dialog: HTMLDialogElement) {
    this.dialog = dialog;
    const q = (sel: string) => dialog.querySelector<HTMLElement>(sel)!;
    this.kicker = q('[data-wake-kicker]');
    this.title = q('[data-wake-title]');
    this.text = q('[data-wake-text]');
    this.bar = q('[data-wake-bar]');
    this.fill = q('.progress-bar__fill');
    this.status = q('[data-wake-status]');
    this.actions = q('[data-wake-actions]');
  }

  static find(): WakeModal | null {
    const dialog = document.querySelector<HTMLDialogElement>('[data-wake-modal]');
    return dialog ? new WakeModal(dialog) : null;
  }

  get isOpen(): boolean {
    return this.dialog.open;
  }

  open(): void {
    if (!this.dialog.open) this.dialog.showModal();
  }

  close(): void {
    if (this.dialog.open) this.dialog.close();
  }

  /** Fires on every close: Esc, "Stay on this page", or close(). */
  onClose(listener: () => void): void {
    this.dialog.addEventListener('close', listener);
  }

  set(content: { kicker: string; title: string; text: string; actions: ModalAction[] }): void {
    this.kicker.textContent = content.kicker;
    this.title.textContent = content.title;
    this.text.textContent = content.text;
    this.status.textContent = '';
    this.bar.hidden = true;
    this.actions.replaceChildren(...content.actions.map((a) => this.buildAction(a)));
  }

  /** Updates only the progress bar and status line. */
  progress(view: LaunchView, statusOverride?: string): void {
    const value = view.progress;
    this.bar.hidden = value === null;
    if (value !== null) {
      const rounded = Math.round(value);
      this.fill.style.width = `${rounded}%`;
      this.bar.setAttribute('aria-valuenow', String(rounded));
    }
    const copy = describe(view);
    this.status.textContent = statusOverride ?? `${copy.title} ${view.running ? copy.sub : ''}`.trim();
  }

  private buildAction(action: ModalAction): HTMLElement {
    const className = `btn btn--sm btn--${action.variant}`;
    if (action.href) {
      const link = document.createElement('a');
      link.className = className;
      link.href = action.href;
      link.textContent = action.label;
      if (action.newTab) {
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        const note = document.createElement('span');
        note.className = 'visually-hidden';
        note.textContent = ' (opens in new tab)';
        link.append(note);
      }
      if (action.onClick) link.addEventListener('click', action.onClick);
      return link;
    }
    const button = document.createElement('button');
    button.type = 'button';
    button.className = className;
    button.textContent = action.label;
    if (action.onClick) button.addEventListener('click', action.onClick);
    return button;
  }
}
