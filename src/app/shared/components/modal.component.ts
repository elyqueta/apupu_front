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
        [class]="containerClass()"
        data-testid="app-modal"
        [attr.data-presentation]="presentation()"
      >
        <button
          type="button"
          [class]="
            invitation()
              ? 'absolute inset-0 cursor-default inv-modal-backdrop'
              : 'absolute inset-0 cursor-default bg-canvas/70 backdrop-blur-md'
          "
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
          (focusin)="onFocusIn($event)"
        >
          @if (presentation() === 'sheet') {
            <div
              aria-hidden="true"
              [class]="
                invitation()
                  ? 'mx-auto mt-2 h-1 w-10 shrink-0 rounded-full inv-modal-handle sm:hidden'
                  : 'mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-line sm:hidden'
              "
            ></div>
          }

          @if (title()) {
            <header class="flex shrink-0 items-center justify-between gap-4 px-5 pt-3 pb-2 sm:px-6 sm:pt-5">
              <h2
                [id]="titleId"
                [class]="
                  invitation()
                    ? 'font-display text-lg font-semibold inv-ink sm:text-xl'
                    : 'font-display text-lg font-semibold text-ink sm:text-xl'
                "
              >
                {{ title() }}
              </h2>
              <button
                type="button"
                [class]="
                  invitation()
                    ? 'grid size-11 shrink-0 place-items-center rounded-xl inv-muted transition hover:brightness-110'
                    : 'grid size-11 shrink-0 place-items-center rounded-xl text-muted transition hover:bg-surface-raised hover:text-ink'
                "
                [attr.aria-label]="i18n.t('common.close')"
                (click)="requestClose()"
              >
                <fa-icon [icon]="icons['close']" aria-hidden="true" />
              </button>
            </header>
          }

          <div
            #body
            data-testid="app-modal-body"
            [class]="bodyClass()"
            style="scrollbar-gutter: stable"
          >
            <ng-content />
          </div>

          <div
            #footer
            data-testid="app-modal-footer"
            [class]="footerClass()"
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
  readonly size = input<'sm' | 'md' | 'lg' | 'full'>('md');
  /** `dialog` centra o painel e faz scroll do painel inteiro; `sheet` mantém o bottom sheet de leitura. */
  readonly presentation = input<'dialog' | 'sheet'>('dialog');
  readonly dismissible = input(true);
  /** No convite, o painel usa as variáveis `--inv-*` em vez da paleta da plataforma. */
  readonly invitation = input(false);

  readonly closed = output<void>();

  protected readonly i18n = inject(I18nService);
  protected readonly icons = ICONS;
  protected readonly titleId = `app-modal-title-${++titleCounter}`;

  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);
  private readonly panel = viewChild<ElementRef<HTMLElement>>('panel');
  private readonly footer = viewChild<ElementRef<HTMLElement>>('footer');

  private registered = false;
  private restoreFocus: HTMLElement | null = null;
  private viewportResize: (() => void) | null = null;

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

  protected containerClass(): string {
    return this.presentation() === 'sheet'
      ? 'fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4'
      : 'fixed inset-0 z-[100] flex items-center justify-center px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]';
  }

  protected panelClass(): string {
    const size = this.size();
    const desktopWidth =
      size === 'sm'
        ? 'sm:max-w-[24rem]'
        : size === 'lg'
          ? 'sm:max-w-[44rem]'
          : size === 'full'
            ? 'sm:max-w-none sm:h-full'
            : 'sm:max-w-[32rem]';
    const width =
      this.presentation() === 'sheet'
        ? desktopWidth
        : size === 'sm'
          ? 'max-w-[24rem]'
          : size === 'lg'
            ? 'max-w-[44rem]'
            : size === 'full'
              ? 'max-w-none h-[calc(100dvh-2rem)]'
              : 'max-w-[32rem]';
    const skin = this.invitation()
      ? 'inv-line inv-modal-panel'
      : 'border-line bg-surface-solid/95 backdrop-blur-2xl';
    if (this.presentation() === 'sheet') {
      return `relative flex max-h-[calc(100dvh-0.5rem)] w-full flex-col overflow-hidden rounded-t-4xl border shadow-pop ${skin} motion-safe:animate-sheet ${size === 'full' ? 'sm:h-[min(92dvh,52rem)] sm:max-h-[min(92dvh,52rem)]' : 'sm:max-h-[min(92dvh,52rem)]'} sm:rounded-4xl sm:motion-safe:animate-rise ${desktopWidth}`;
    }
    if (size === 'full') {
      return `relative flex h-[calc(100dvh-2rem)] w-full max-w-none flex-col overflow-hidden rounded-4xl border shadow-pop ${skin} motion-safe:animate-rise`;
    }
    return `relative flex max-h-[calc(100dvh-2rem)] w-full flex-col overflow-y-auto overscroll-contain rounded-4xl border border-line bg-surface-solid/95 shadow-pop backdrop-blur-2xl motion-safe:animate-rise ${width}`;
  }

  protected bodyClass(): string {
    if (this.size() === 'full') {
      return 'min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 sm:px-6';
    }
    return this.presentation() === 'sheet'
      ? 'min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 sm:px-6'
      : 'shrink-0 px-5 pt-4 pb-6 sm:px-6';
  }

  /**
   * Os botões de ação vivem no fim do painel, dentro do mesmo scroll do
   * formulário: nunca fixos, flutuantes ou sobrepostos aos campos.
   */
  protected footerClass(): string {
    return this.presentation() === 'sheet'
      ? `flex shrink-0 flex-col-reverse gap-2 border-t ${this.invitation() ? 'inv-line' : 'border-line'} px-5 py-4 empty:hidden sm:flex-row sm:justify-end sm:px-6`
      : 'flex shrink-0 flex-col-reverse gap-2 px-5 pt-2 pb-4 empty:hidden sm:flex-row sm:justify-end sm:px-6';
  }

  /** Com teclado aberto, centra o campo activo no scroll do painel. */
  protected onFocusIn(event: FocusEvent): void {
    if (!isPlatformBrowser(this.platformId) || openModals.at(-1) !== this) {
      return;
    }
    const target = event.target;
    if (
      target instanceof HTMLElement &&
      target.matches('input, select, textarea, [contenteditable="true"]') &&
      typeof target.scrollIntoView === 'function'
    ) {
      try {
        target.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      } catch {
        // Browsers antigos ou elementos desligados não devem bloquear o modal.
      }
    }
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
    if (this.presentation() === 'dialog' && isPlatformBrowser(this.platformId) && window.visualViewport) {
      this.viewportResize = () => this.syncViewportHeight();
      window.visualViewport.addEventListener('resize', this.viewportResize);
      this.syncViewportHeight();
    }
    this.scheduleFocus(() => this.focusFirst());
  }

  /** Ajusta a altura quando o teclado virtual reduz o `visualViewport`. */
  private syncViewportHeight(): void {
    const panel = this.panel()?.nativeElement;
    const viewport = window.visualViewport;
    if (!panel || !viewport) {
      return;
    }
    // 48 px cobre a margem superior com safe-area, a inferior e respiro extra.
    const reserved = 48 + Math.max(0, viewport.offsetTop);
    panel.style.maxHeight = `${Math.max(240, Math.floor(viewport.height - reserved))}px`;

    // Com o teclado aberto, espaço extra no fim do painel (depois dos
    // botões) para que o último campo e as ações possam subir acima dele.
    const keyboardHeight = Math.max(0, window.innerHeight - viewport.height);
    const footer = this.footer()?.nativeElement;
    if (footer) {
      footer.style.paddingBottom =
        keyboardHeight > 0
          ? `${16 + keyboardHeight}px`
          : 'max(1rem, env(safe-area-inset-bottom))';
    }
  }

  private deactivate(restore = true): void {
    if (!this.registered) {
      return;
    }
    this.registered = false;
    if (this.viewportResize) {
      window.visualViewport?.removeEventListener('resize', this.viewportResize);
      this.viewportResize = null;
      this.panel()?.nativeElement.style.removeProperty('max-height');
      this.footer()?.nativeElement.style.removeProperty('padding-bottom');
    }
    const index = openModals.lastIndexOf(this);
    if (index >= 0) {
      openModals.splice(index, 1);
    }
    if (openModals.length === 0 && isPlatformBrowser(this.platformId)) {
      this.document.body.style.overflow = previousBodyOverflow;
    }
    const target = this.restoreFocus;
    this.restoreFocus = null;
    if (restore && target) {
      this.scheduleFocus(() => {
        try {
          if (target.isConnected) {
            target.focus({ preventScroll: true });
          }
        } catch {
          // O elemento pode ter sido removido entre o fecho e o restauro.
        }
      });
    }
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
