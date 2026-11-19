import { Component, HostListener, inject, input, output, signal } from '@angular/core';
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

/**
 * Menu "⋯" com ações secundárias.
 *
 * Cada instância gere o seu próprio estado de abertura, pelo que pode ser
 * repetido numa lista sem coordenação do componente pai. O trigger tem
 * 44px de alvo (toque) e o painel fecha ao escolher um item, ao clicar
 * fora ou com `Esc`.
 */
@Component({
  selector: 'app-action-menu',
  imports: [FaIconComponent],
  template: `
    <div class="relative">
      <button
        type="button"
        class="grid size-11 shrink-0 place-items-center rounded-xl border border-line bg-surface text-muted transition hover:border-brand/40 hover:text-ink"
        [attr.aria-label]="triggerLabel() || i18n.t('common.moreActions')"
        [attr.title]="triggerLabel() || i18n.t('common.moreActions')"
        aria-haspopup="menu"
        [attr.aria-expanded]="open()"
        (click)="open.set(!open())"
      >
        <fa-icon [icon]="icons['ellipsis']" class="text-sm" aria-hidden="true" />
      </button>

      @if (open()) {
        <button
          type="button"
          class="fixed inset-0 z-40 cursor-default"
          [attr.aria-label]="i18n.t('common.close')"
          (click)="open.set(false)"
        ></button>
        <div
          role="menu"
          class="absolute right-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-2xl border border-line bg-surface-solid/95 p-1.5 shadow-card backdrop-blur-2xl animate-rise"
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

  readonly items = input.required<ActionMenuItem[]>();
  /** Rótulo acessível do trigger; por omissão "Mais ações". */
  readonly triggerLabel = input<string>('');
  /** Explicação mostrada como tooltip quando um item está desativado. */
  readonly disabledHint = input<string>('');

  readonly selected = output<string>();

  protected readonly open = signal(false);
  protected readonly icons = ICONS;

  protected select(item: ActionMenuItem): void {
    if (item.disabled) {
      return;
    }
    this.open.set(false);
    this.selected.emit(item.id);
  }

  protected itemClass(item: ActionMenuItem): string {
    const base =
      'flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-medium transition';
    if (item.disabled) {
      return `${base} cursor-not-allowed text-muted/50`;
    }
    if (item.tone === 'danger') {
      return `${base} text-coral hover:bg-coral/10`;
    }
    return `${base} text-ink hover:bg-surface-raised`;
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.open()) {
      this.open.set(false);
    }
  }
}
