import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  ApplicationRef,
  Component,
  ComponentRef,
  DestroyRef,
  ElementRef,
  EnvironmentInjector,
  HostListener,
  inject,
  input,
  output,
  PLATFORM_ID,
  signal,
  TemplateRef,
  viewChild,
  ViewContainerRef,
  createComponent,
} from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { I18nService } from '../../core/i18n/i18n.service';
import { ICONS } from '../../core/ui/icons';

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

/** Ancoragem do menu no `body`, fora de qualquer `overflow` de card/lista. */
@Component({
  selector: 'app-action-menu-portal',
  template: '<ng-container #outlet />',
})
class ActionMenuPortalComponent {
  readonly outlet = viewChild('outlet', { read: ViewContainerRef });
}

/** Só um menu de ações pode estar aberto de cada vez. */
const activeMenu = signal<ActionMenuComponent | null>(null);

/**
 * Menu "⋯" com ações secundárias, sempre ancorado ao botão (mobile incluído).
 *
 * O painel vive num portal no `body` com `position: fixed`, para não ser cortado
 * por `overflow` de cards/listas. Fecha ao escolher item, Escape, clique fora,
 * scroll e redimensionamento; as setas ↑/↓ e Home/End navegam pelos itens.
 */
@Component({
  selector: 'app-action-menu',
  imports: [FaIconComponent],
  template: `
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
    </div>

    <ng-template #panel>
      <div
        data-testid="action-menu-panel"
        role="menu"
        tabindex="-1"
        [attr.aria-label]="triggerLabel() || i18n.t('common.moreActions')"
        class="fixed z-[90] max-h-[min(24rem,70dvh)] w-64 max-w-[calc(100vw-16px)] overflow-y-auto overscroll-contain rounded-2xl border border-line bg-surface-solid/95 p-1.5 shadow-card backdrop-blur-2xl animate-rise"
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
    </ng-template>
  `,
})
export class ActionMenuComponent {
  protected readonly i18n = inject(I18nService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);
  private readonly document = inject(DOCUMENT);
  private readonly appRef = inject(ApplicationRef);
  private readonly injector = inject(EnvironmentInjector);
  private readonly host = inject(ElementRef<HTMLElement>);

  readonly items = input.required<ActionMenuItem[]>();
  /** Rótulo acessível do trigger; por omissão "Mais ações". */
  readonly triggerLabel = input<string>('');
  /** Explicação mostrada como tooltip quando um item está desativado. */
  readonly disabledHint = input<string>('');

  readonly selected = output<string>();

  protected readonly open = signal(false);
  protected readonly icons = ICONS;

  private readonly trigger = viewChild<ElementRef<HTMLButtonElement>>('trigger');
  private readonly panelTemplate = viewChild<TemplateRef<unknown>>('panel');
  private portal: ComponentRef<ActionMenuPortalComponent> | null = null;
  private activeIndex = 0;

  constructor() {
    this.destroyRef.onDestroy(() => this.close(false));
  }

  protected toggle(): void {
    if (this.open()) {
      this.close();
      return;
    }
    activeMenu()?.close(false);
    activeMenu.set(this);
    this.open.set(true);
    this.activeIndex = this.firstEnabledIndex(0, 1);
    this.attachPortal();
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
    if (activeMenu() === this) {
      activeMenu.set(null);
    }
    if (this.portal) {
      this.appRef.detachView(this.portal.hostView);
      this.portal.destroy();
      this.portal = null;
    }
    if (restoreFocus && isPlatformBrowser(this.platformId)) {
      queueMicrotask(() => this.trigger()?.nativeElement.focus());
    }
  }

  protected itemClass(item: ActionMenuItem): string {
    const base = 'flex min-h-11 w-full items-center gap-2.5 rounded-xl px-2.5 text-xs font-medium transition';
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
    if (this.open()) {
      this.close();
    }
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    if (!this.open()) {
      return;
    }
    const target = event.target;
    if (
      target instanceof Node &&
      (this.host.nativeElement.contains(target) || this.panelElement()?.contains(target))
    ) {
      return;
    }
    this.close(false);
  }

  @HostListener('document:scroll')
  @HostListener('window:resize')
  protected onViewportChange(): void {
    if (this.open()) {
      this.close(false);
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

  private panelElement(): HTMLElement | null {
    return this.document.querySelector<HTMLElement>('[data-testid="action-menu-panel"]');
  }

  private focusActiveItem(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    const buttons = Array.from(
      this.panelElement()?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? [],
    );
    const target = buttons[this.activeIndex];
    if (target && !target.disabled) {
      target.focus();
    }
  }

  private attachPortal(): void {
    // O menu só abre por interação do utilizador; mesmo em testes com
    // PLATFORM_ID 'server' existe um DOCUMENT onde o portal pode viver.
    if (this.portal) {
      return;
    }
    const template = this.panelTemplate();
    if (!template) {
      return;
    }
    const portal = createComponent(ActionMenuPortalComponent, {
      environmentInjector: this.injector,
    });
    this.appRef.attachView(portal.hostView);
    this.document.body.appendChild(portal.location.nativeElement);
    portal.hostView.detectChanges();
    portal.instance.outlet()?.createEmbeddedView(template);
    // A view incorporada precisa de deteção de alterações própria para os itens
    // aparecerem no mesmo tick em que o menu é aberto.
    portal.hostView.detectChanges();
    this.portal = portal;
    queueMicrotask(() => {
      this.positionPanel();
      this.focusActiveItem();
    });
  }

  /** Prefere baixo/à direita; sobe e alinha à esquerda quando não cabe. */
  private positionPanel(): void {
    const button = this.trigger()?.nativeElement;
    const panel = this.panelElement();
    if (!button || !panel || typeof window === 'undefined') {
      return;
    }
    const margin = 8;
    const buttonRect = button.getBoundingClientRect();
    const width = Math.min(256, window.innerWidth - margin * 2);
    const height = panel.offsetHeight || panel.getBoundingClientRect().height;
    panel.style.width = `${width}px`;

    let left = buttonRect.right - width;
    if (left < margin) {
      left = buttonRect.left;
    }
    left = Math.max(margin, Math.min(left, window.innerWidth - width - margin));

    const spaceBelow = window.innerHeight - buttonRect.bottom - margin;
    let top = buttonRect.bottom + margin;
    if (height > spaceBelow) {
      const spaceAbove = buttonRect.top - margin;
      top = height <= spaceAbove ? buttonRect.top - height - margin : margin;
    }
    top = Math.max(margin, Math.min(top, window.innerHeight - height - margin));

    panel.style.left = `${Math.round(left)}px`;
    panel.style.top = `${Math.round(top)}px`;
  }
}
