import {
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  inject,
  input,
  output,
  PLATFORM_ID,
  signal,
  viewChild,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { I18nService } from '../../core/i18n/i18n.service';
import { ICONS } from '../../core/ui/icons';
import { ModalComponent } from './modal.component';

/** Item de um menu de ações por contexto. */
export interface ActionMenuItem {
  /** Identificador devolvido em `selected`. */
  id: string;
  label: string;
  icon: IconDefinition;
  /** `danger` destaca a ação como destrutiva (ex.: remover). */
  tone?: 'default' | 'danger';
  disabled?: boolean;
}

/**
 * Menu "⋯" com ações secundárias.
 *
 * Cada instância gere o seu próprio estado de abertura, pelo que pode ser
 * repetido numa lista sem coordenação do componente pai. Fecha ao escolher um
 * item, ao clicar fora e com `Esc`; as setas ↑/↓ navegam pelos itens. Em ecrãs
 * pequenos o painel abre como bottom sheet (usa `app-modal`), para os alvos de
 * toque serem confortáveis.
 */
@Component({
  selector: 'app-action-menu',
  imports: [FaIconComponent, ModalComponent],
  template: `
    @if (open() && isMobile()) {
      <app-modal
        [open]="true"
        [title]="triggerLabel() || i18n.t('common.moreActions')"
        size="sm"
        (closed)="close()"
      >
        <div
          role="menu"
          tabindex="-1"
          [attr.aria-label]="triggerLabel() || i18n.t('common.moreActions')"
          (keydown)="onMenuKeydown($event)"
        >
          @for (item of items(); track item.id) {
            <button
              type="button"
              role="menuitem"
              [disabled]="item.disabled"
              [attr.aria-disabled]="item.disabled ? 'true' : null"
              [class]="itemClass(item)"
              (click)="select(item)"
            >
              <fa-icon [icon]="item.icon" class="w-4 shrink-0 text-xs" aria-hidden="true" />
              <span class="min-w-0 flex-1 truncate text-left">{{ item.label }}</span>
            </button>
          }
        </div>
      </app-modal>
    }

    <div class="relative">
      <button
        #trigger
        type="button"
        class="grid size-11 shrink-0 place-items-center rounded-xl border border-line bg-surface text-muted transition hover:border-brand/40 hover:text-ink"
        [attr.aria-label]="triggerLabel() || i18n.t('common.moreActions')"
        [attr.title]="triggerLabel() || i18n.t('common.moreActions')"
        aria-haspopup="menu"
        [attr.aria-expanded]="open()"
        (click)="toggle()"
        (keydown)="onTriggerKeydown($event)"
      >
        <fa-icon [icon]="icons['ellipsis']" class="text-sm" aria-hidden="true" />
      </button>

      @if (open() && !isMobile()) {
        <button
          type="button"
          class="fixed inset-0 z-40 cursor-default"
          [attr.aria-label]="i18n.t('common.close')"
          (click)="close()"
        ></button>
        <div
          #menu
          role="menu"
          tabindex="-1"
          class="absolute right-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-2xl border border-line bg-surface-solid/95 p-1.5 shadow-card backdrop-blur-2xl animate-rise"
          (keydown)="onMenuKeydown($event)"
        >
          @for (item of items(); track item.id) {
            <button
              type="button"
              role="menuitem"
              [disabled]="item.disabled"
              [attr.aria-disabled]="item.disabled ? 'true' : null"
              [attr.title]="item.disabled ? disabledHint() || null : null"
              [class]="itemClass(item)"
              (click)="select(item)"
            >
              <fa-icon [icon]="item.icon" class="w-4 shrink-0 text-xs" aria-hidden="true" />
              <span class="min-w-0 flex-1 truncate text-left">{{ item.label }}</span>
            </button>
          }
        </div>
      }
    </div>
  `,
})
export class ActionMenuComponent {
  protected readonly i18n = inject(I18nService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);
  private readonly host = inject(ElementRef<HTMLElement>);

  readonly items = input.required<ActionMenuItem[]>();
  /** Rótulo acessível do trigger; por omissão "Mais ações". */
  readonly triggerLabel = input<string>('');
  /** Explicação mostrada como tooltip quando um item está desativado. */
  readonly disabledHint = input<string>('');

  readonly selected = output<string>();

  protected readonly open = signal(false);
  protected readonly isMobile = signal(false);
  protected readonly icons = ICONS;

  private readonly trigger = viewChild<ElementRef<HTMLButtonElement>>('trigger');
  private readonly menu = viewChild<ElementRef<HTMLElement>>('menu');
  private activeIndex = 0;

  constructor() {
    if (isPlatformBrowser(this.platformId) && typeof window.matchMedia === 'function') {
      const query = window.matchMedia('(max-width: 767px)');
      this.isMobile.set(query.matches);
      const listener = (event: MediaQueryListEvent) => {
        this.isMobile.set(event.matches);
        if (!event.matches && this.open()) {
          queueMicrotask(() => this.focusActiveItem());
        }
      };
      query.addEventListener?.('change', listener);
      this.destroyRef.onDestroy(() => query.removeEventListener?.('change', listener));
    }
  }

  protected toggle(): void {
    if (this.open()) {
      this.close();
      return;
    }
    this.open.set(true);
    this.activeIndex = this.firstEnabledIndex(0, 1);
    if (!this.isMobile()) {
      queueMicrotask(() => this.focusActiveItem());
    }
  }

  protected select(item: ActionMenuItem): void {
    if (item.disabled) {
      return;
    }
    this.close();
    this.selected.emit(item.id);
  }

  protected close(restoreFocus = true): void {
    if (!this.open()) {
      return;
    }
    this.open.set(false);
    if (restoreFocus && isPlatformBrowser(this.platformId)) {
      queueMicrotask(() => this.trigger()?.nativeElement.focus());
    }
  }

  protected itemClass(item: ActionMenuItem): string {
    const base =
      'flex w-full items-center gap-2.5 rounded-xl px-2.5 py-3 text-xs font-medium transition sm:py-2';
    if (item.disabled) {
      return `${base} cursor-not-allowed text-muted/50`;
    }
    if (item.tone === 'danger') {
      return `${base} text-coral hover:bg-coral/10`;
    }
    return `${base} text-ink hover:bg-surface-raised`;
  }

  protected onTriggerKeydown(event: KeyboardEvent): void {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') {
      return;
    }
    event.preventDefault();
    if (!this.open()) {
      this.toggle();
      return;
    }
    this.move(event.key === 'ArrowDown' ? 1 : -1);
  }

  protected onMenuKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.move(1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.move(-1);
        break;
      case 'Home':
        event.preventDefault();
        this.setActiveIndex(this.firstEnabledIndex(0, 1));
        break;
      case 'End':
        event.preventDefault();
        this.setActiveIndex(this.firstEnabledIndex(this.items().length - 1, -1));
        break;
      case 'Escape':
        event.preventDefault();
        this.close();
        break;
      case 'Tab':
        this.close(false);
        break;
    }
  }

  @HostListener('document:keydown.escape')
  protected onDocumentEscape(): void {
    if (this.open() && !this.isMobile()) {
      this.close();
    }
  }

  private move(step: number): void {
    this.setActiveIndex(this.firstEnabledIndex(this.activeIndex + step, step));
  }

  private setActiveIndex(index: number): void {
    this.activeIndex = index;
    this.focusActiveItem();
  }

  private firstEnabledIndex(start: number, step: number): number {
    const items = this.items();
    if (items.length === 0) {
      return 0;
    }
    let index = ((start % items.length) + items.length) % items.length;
    let remaining = items.length;
    while (remaining-- > 0) {
      if (!items[index].disabled) {
        return index;
      }
      index = (((index + step) % items.length) + items.length) % items.length;
    }
    return index;
  }

  private focusActiveItem(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    const root = this.host.nativeElement as HTMLElement;
    const buttons = root.querySelectorAll<HTMLButtonElement>('[role="menuitem"]');
    const target = buttons[this.activeIndex];
    if (target && !target.disabled) {
      target.focus();
    }
  }
}
