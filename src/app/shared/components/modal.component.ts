import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  Component,
  DestroyRef,
  effect,
  ElementRef,
  HostListener,
  inject,
  input,
  output,
  PLATFORM_ID,
  viewChild,
} from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { I18nService } from '../../core/i18n/i18n.service';
import { ICONS } from '../../core/ui/icons';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Pilha de modais abertos: só o último reage a Escape/Tab e o scroll é bloqueado uma vez. */
const openModals: ModalComponent[] = [];
let previousBodyOverflow = '';
let titleCounter = 0;

@Component({
  selector: 'app-modal',
  imports: [FaIconComponent],
  template: `
    @if (open()) {
      <div
        class="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4"
        data-testid="app-modal"
      >
        <button
          type="button"
          class="absolute inset-0 cursor-default bg-canvas/70 backdrop-blur-md"
          [attr.aria-label]="i18n.t('common.close')"
          (click)="requestClose()"
        ></button>

        <div
          #panel
          role="dialog"
          aria-modal="true"
          [attr.aria-labelledby]="title() ? titleId : null"
          [attr.aria-label]="title() ?? i18n.t('common.close')"
          tabindex="-1"
          [class]="panelClass()"
          (keydown)="onKeydown($event)"
        >
          <div aria-hidden="true" class="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-line sm:hidden"></div>

          @if (title()) {
            <header class="flex shrink-0 items-center justify-between gap-4 px-5 pt-3 pb-2 sm:px-6 sm:pt-5">
              <h2 [id]="titleId" class="font-display text-lg font-semibold text-ink sm:text-xl">
                {{ title() }}
              </h2>
              <button
                type="button"
                class="grid size-11 shrink-0 place-items-center rounded-xl text-muted transition hover:bg-surface-raised hover:text-ink"
                [attr.aria-label]="i18n.t('common.close')"
                (click)="requestClose()"
              >
                <fa-icon [icon]="icons['close']" aria-hidden="true" />
              </button>
            </header>
          }

          <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 sm:px-6">
            <ng-content />
          </div>

          <div
            class="flex shrink-0 flex-col-reverse gap-2 border-t border-line px-5 py-4 empty:hidden sm:flex-row sm:justify-end sm:px-6"
            style="padding-bottom: max(1rem, env(safe-area-inset-bottom))"
          >
            <ng-content select="[modal-footer]" />
          </div>
        </div>
      </div>
    }
  `,
})
export class ModalComponent {
  readonly open = input.required<boolean>();
  readonly title = input<string>();
  readonly size = input<'sm' | 'md' | 'lg'>('md');
  readonly dismissible = input(true);

  readonly closed = output<void>();

  protected readonly i18n = inject(I18nService);
  protected readonly icons = ICONS;
  protected readonly titleId = `app-modal-title-${++titleCounter}`;

  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);
  private readonly panel = viewChild<ElementRef<HTMLElement>>('panel');

  private registered = false;
  private restoreFocus: HTMLElement | null = null;

  constructor() {
    effect(() => {
      if (this.open()) {
        this.activate();
      } else {
        this.deactivate();
      }
    });
    this.destroyRef.onDestroy(() => this.deactivate(false));
  }

  protected panelClass(): string {
    const width =
      this.size() === 'sm'
        ? 'sm:max-w-[24rem]'
        : this.size() === 'lg'
          ? 'sm:max-w-[44rem]'
          : 'sm:max-w-[32rem]';
    return `relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-4xl border border-line bg-surface-solid/95 shadow-card backdrop-blur-2xl motion-safe:animate-sheet sm:rounded-4xl sm:motion-safe:animate-rise ${width}`;
  }

  protected requestClose(): void {
    if (this.dismissible()) {
      this.closed.emit();
    }
  }

  @HostListener('document:keydown', ['$event'])
  protected onDocumentKeydown(event: KeyboardEvent): void {
    if (!this.open() || openModals.at(-1) !== this) {
      return;
    }
    if (event.key === 'Escape') {
      if (this.dismissible()) {
        event.preventDefault();
        this.closed.emit();
      }
      return;
    }
    if (event.key === 'Tab') {
      this.trapTab(event);
    }
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Tab' && openModals.at(-1) === this) {
      this.trapTab(event);
    }
  }

  private activate(): void {
    if (this.registered || !isPlatformBrowser(this.platformId)) {
      return;
    }
    this.registered = true;
    this.restoreFocus = this.document.activeElement instanceof HTMLElement ? this.document.activeElement : null;
    if (openModals.length === 0) {
      previousBodyOverflow = this.document.body.style.overflow;
      this.document.body.style.overflow = 'hidden';
    }
    openModals.push(this);
    this.scheduleFocus(() => this.focusFirst());
  }

  private deactivate(restore = true): void {
    if (!this.registered) {
      return;
    }
    this.registered = false;
    const index = openModals.lastIndexOf(this);
    if (index >= 0) {
      openModals.splice(index, 1);
    }
    if (openModals.length === 0 && isPlatformBrowser(this.platformId)) {
      this.document.body.style.overflow = previousBodyOverflow;
    }
    if (restore && this.restoreFocus) {
      const target = this.restoreFocus;
      this.scheduleFocus(() => {
        if (target.isConnected) {
          target.focus();
        }
      });
    }
    this.restoreFocus = null;
  }

  private scheduleFocus(callback: () => void): void {
    queueMicrotask(callback);
  }

  private focusableElements(): HTMLElement[] {
    const panel = this.panel()?.nativeElement;
    return panel ? Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)) : [];
  }

  private focusFirst(): void {
    const elements = this.focusableElements();
    (elements[0] ?? this.panel()?.nativeElement)?.focus();
  }

  private trapTab(event: KeyboardEvent): void {
    const elements = this.focusableElements();
    const panel = this.panel()?.nativeElement;
    if (!panel) {
      return;
    }
    if (elements.length === 0) {
      event.preventDefault();
      panel.focus();
      return;
    }
    const first = elements[0];
    const last = elements[elements.length - 1];
    const active = this.document.activeElement;
    if (!panel.contains(active)) {
      event.preventDefault();
      first.focus();
      return;
    }
    if (event.shiftKey && (active === first || active === panel)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }
}
