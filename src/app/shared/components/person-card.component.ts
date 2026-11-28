import { Component, input, output } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { ICONS } from '../../core/ui/icons';
import { ActionMenuComponent, ActionMenuItem } from './action-menu.component';
import { AvatarComponent } from './avatar.component';
import { StatusBadgeComponent } from './status-badge.component';

/** Linha curta de contexto do cartão (evento, data, mesa, …). */
export interface PersonMetaItem {
  /** Chave em `ICONS`. */
  icon: string;
  label: string;
}

/** Ação principal visível na base do cartão (ex.: abrir WhatsApp). */
export interface PersonPrimaryAction {
  id: string;
  label: string;
  icon?: IconDefinition;
  disabled?: boolean;
  hint?: string;
}

/**
 * Cartão de pessoa único para listas de convidados, gestores e convites.
 *
 * Substitui os antigos cards mobile + tabelas de 7 colunas: o mesmo desenho
 * é usado na página de convidados e no detalhe do evento, pelo que o utilizador
 * reconhece o cartão em ambos os sítios.
 */
@Component({
  selector: 'app-person-card',
  imports: [FaIconComponent, ActionMenuComponent, AvatarComponent, StatusBadgeComponent],
  template: `
    @if (layout() === 'linear') {
      <article [class]="linearClasses()">
        <div
          [class]="linearBodyClasses()"
          [class.cursor-pointer]="clickable()"
          [attr.role]="clickable() ? 'button' : null"
          [attr.tabindex]="clickable() ? 0 : null"
          [attr.aria-label]="clickable() ? clickLabel() || name() : null"
          data-testid="person-card-open"
          (click)="onClick()"
          (keydown.enter)="onKeydown($event)"
          (keydown.space)="onKeydown($event)"
        >
          <app-avatar
            class="shrink-0"
            [name]="name()"
            [imageUrl]="avatarUrl()"
            [size]="prominent() ? 'lg' : 'md'"
          />
          <div class="min-w-0 flex-1">
            <div class="flex min-w-0 items-center gap-2">
              <p
                [class]="prominent() ? 'min-w-0 flex-1 truncate text-base font-semibold leading-6 text-ink' : 'min-w-0 flex-1 truncate text-sm font-semibold leading-5 text-ink'"
                [title]="name()"
              >{{ name() }}</p>
              @if (flag(); as alert) {
                <span
                  class="hidden shrink-0 items-center gap-1 rounded-full border border-coral/30 bg-coral/10 px-2 py-0.5 text-[10px] font-semibold text-coral sm:inline-flex"
                  [attr.title]="flagHint() || null"
                  data-testid="person-card-flag"
                >
                  <fa-icon [icon]="icons['warning']" class="text-[10px]" aria-hidden="true" />
                  {{ alert }}
                </span>
              }
            </div>
            @if (subtitle()) {
              <p
                [class]="prominent() ? 'mt-0.5 truncate text-xs text-muted' : 'hidden truncate text-xs text-muted sm:block'"
                [title]="subtitle()"
              >{{ subtitle() }}</p>
            }
            @if (meta().length > 0) {
              <p
                [class]="prominent() ? 'mt-2 inline-flex max-w-full items-center gap-1.5 rounded-lg bg-surface-raised px-2 py-1 text-[11px] text-muted' : 'hidden min-w-0 items-center gap-1.5 truncate text-[11px] text-muted sm:flex'"
              >
                <fa-icon
                  [icon]="iconFor(meta()[0].icon)"
                  [class]="prominent() ? 'shrink-0 text-[10px] text-brand-strong' : 'shrink-0 text-[10px]'"
                  aria-hidden="true"
                />
                <span class="min-w-0 truncate">{{ meta()[0].label }}</span>
              </p>
            }
          </div>
          @if (status(); as value) {
            <app-status-badge [class]="prominent() ? 'shrink-0' : 'hidden shrink-0 sm:inline-flex'" [value]="value" />
          }
        </div>
        @if (primaryAction() || secondaryAction() || actions().length > 0) {
          <div
            [class]="prominent() ? 'flex w-full shrink-0 items-center gap-2 border-t border-line/70 pt-3' : 'flex shrink-0 items-center gap-1 sm:border-l sm:border-line/70 sm:pl-1.5'"
          >
            @if (primaryAction(); as primary) {
              <button
                type="button"
                [class]="prominent() ? 'inline-flex h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-xl bg-brand px-3 text-xs font-semibold text-on-secondary transition hover:bg-secondary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 disabled:cursor-not-allowed disabled:opacity-50' : 'hidden h-9 shrink-0 items-center gap-1.5 rounded-xl bg-brand px-2.5 text-[11px] font-semibold text-on-secondary transition hover:bg-secondary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 disabled:cursor-not-allowed disabled:opacity-50 sm:inline-flex'"
                [disabled]="primary.disabled"
                [attr.title]="primary.hint || null"
                [attr.aria-label]="primary.hint || primary.label"
                (click)="triggerPrimary($event, primary)"
              >
                @if (primary.icon) { <fa-icon [icon]="primary.icon" class="text-xs" aria-hidden="true" /> }
                <span class="truncate">{{ primary.label }}</span>
              </button>
            }
            @if (secondaryAction(); as secondary) {
              <button
                type="button"
                [class]="prominent() ? 'grid size-11 shrink-0 place-items-center rounded-xl border border-line text-muted transition hover:border-brand/40 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 disabled:cursor-not-allowed disabled:opacity-50' : 'hidden size-9 shrink-0 place-items-center rounded-xl border border-line text-muted transition hover:border-brand/40 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 disabled:cursor-not-allowed disabled:opacity-50 sm:grid'"
                [attr.aria-label]="secondary.hint || secondary.label"
                [attr.title]="secondary.hint || secondary.label"
                [attr.data-testid]="'person-card-' + secondary.id"
                [disabled]="secondary.disabled"
                (click)="triggerPrimary($event, secondary)"
              >
                @if (secondary.icon) { <fa-icon [icon]="secondary.icon" aria-hidden="true" /> }
              </button>
            }
            @if (actions().length > 0) {
              <app-action-menu
                [class.ml-auto]="prominent()"
                [items]="actions()"
                [triggerLabel]="actionsLabel()"
                (selected)="actionSelected.emit($event)"
              />
            }
          </div>
        }
      </article>
    } @else {
    <article
      [class]="classes()"
      [attr.role]="clickable() ? 'button' : null"
      [attr.tabindex]="clickable() ? 0 : null"
      [attr.aria-label]="clickable() ? clickLabel() || name() : null"
      (click)="onClick()"
      (keydown.enter)="onKeydown($event)"
      (keydown.space)="onKeydown($event)"
    >
      @if (variant() === 'rich' && !compact()) {
        <div class="h-2 shrink-0 bg-gradient-to-r from-brand/70 via-aqua/45 to-secondary/60"></div>
      }
      <div [class]="variant() === 'rich' && !compact() ? 'flex min-w-0 flex-1 flex-col gap-3 p-4' : 'contents'">
        <div class="flex min-w-0 items-start gap-3">
          <app-avatar [name]="name()" [imageUrl]="avatarUrl()" [size]="variant() === 'rich' && !compact() ? 'lg' : compact() ? 'sm' : 'md'" />
          <div class="min-w-0 flex-1">
            <div class="flex min-w-0 flex-wrap items-start justify-between gap-2">
              <p class="min-w-0 flex-1 basis-24 text-sm font-semibold leading-5 text-ink line-clamp-2" [title]="name()">
                {{ name() }}
              </p>
              @if (status(); as value) {
                <app-status-badge class="shrink-0" [value]="value" />
              }
            </div>
            @if (subtitle() && !compact()) {
              <p class="mt-0.5 truncate text-xs text-muted" [title]="subtitle()">{{ subtitle() }}</p>
            }
            @if (flag(); as alert) {
              <span
                class="mt-1.5 inline-flex min-h-6 items-center gap-1.5 rounded-full border border-coral/30 bg-coral/10 px-2 text-xs font-semibold text-coral"
                [attr.title]="flagHint() || null"
                data-testid="person-card-flag"
              >
                <fa-icon [icon]="icons['warning']" class="text-[10px]" aria-hidden="true" />
                {{ alert }}
              </span>
            }
          </div>
        </div>

        @if (!compact() && meta().length > 0) {
          <ul class="flex-1 space-y-1.5 border-t border-line/70 pt-3">
            @for (item of meta(); track $index) {
              <li class="flex min-w-0 items-center gap-2 text-xs text-muted">
                <fa-icon [icon]="iconFor(item.icon)" class="w-3 shrink-0 text-xs" aria-hidden="true" />
                <span class="min-w-0 truncate">{{ item.label }}</span>
              </li>
            }
          </ul>
        }

        @if ((actions().length > 0 || primaryAction() || secondaryAction()) && !compact()) {
          <div class="mt-auto flex items-center justify-between gap-2 border-t border-line/70 pt-3">
            <div class="flex min-w-0 items-center gap-2">
            @if (primaryAction(); as primary) {
              <button
                type="button"
                class="inline-flex h-11 min-w-0 items-center gap-2 rounded-xl bg-brand px-3 text-xs font-semibold text-on-secondary transition hover:bg-secondary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 disabled:cursor-not-allowed disabled:opacity-50"
                [disabled]="primary.disabled"
                [attr.title]="primary.disabled ? primary.hint || null : primary.hint || null"
                (click)="triggerPrimary($event, primary)"
              >
                @if (primary.icon) {
                  @if (primary.icon) { <fa-icon [icon]="primary.icon" class="text-[11px]" aria-hidden="true" /> }
                }
                <span class="min-w-0 truncate">{{ primary.label }}</span>
              </button>
            }
            @if (secondaryAction(); as secondary) {
              <button
                type="button"
                class="ui-icon-button"
                [attr.aria-label]="secondary.hint || secondary.label"
                [attr.title]="secondary.hint || secondary.label"
                [attr.data-testid]="'person-card-' + secondary.id"
                [disabled]="secondary.disabled"
                (click)="triggerPrimary($event, secondary)"
              >
                @if (secondary.icon) {
                  @if (secondary.icon) { <fa-icon [icon]="secondary.icon" aria-hidden="true" /> }
                }
              </button>
            }
            </div>
            @if (actions().length > 0) {
              <app-action-menu
                [items]="actions()"
                [triggerLabel]="actionsLabel()"
                (selected)="actionSelected.emit($event)"
              />
            }
          </div>
        } @else if (actions().length > 0 && compact()) {
          <div class="mt-auto flex justify-end">
            <app-action-menu
              [items]="actions()"
              [triggerLabel]="actionsLabel()"
              (selected)="actionSelected.emit($event)"
            />
          </div>
        }
      </div>
    </article>
    }
  `,
})
export class PersonCardComponent {
  readonly name = input.required<string>();
  readonly avatarUrl = input<string | null>(null);
  readonly subtitle = input<string>('');
  readonly status = input<string | null>(null);
  readonly meta = input<PersonMetaItem[]>([]);
  readonly actions = input<ActionMenuItem[]>([]);
  readonly primaryAction = input<PersonPrimaryAction | null>(null);
  /** Ação secundária só com ícone ao lado da principal (ex.: copiar link). */
  readonly secondaryAction = input<PersonPrimaryAction | null>(null);
  /** Selo de alerta curto (ex.: "Idade alterada"). */
  readonly flag = input<string | null>(null);
  readonly flagHint = input<string>('');
  readonly highlight = input(false);
  readonly compact = input(false);
  readonly clickable = input(false);
  readonly clickLabel = input<string>('');
  readonly actionsLabel = input<string>('');
  readonly variant = input<'default' | 'rich'>('default');
  /** `linear` é a linha compacta usada em listas; `card` mantém o cartão em grelha. */
  readonly layout = input<'card' | 'linear'>('card');
  /** Versão mais legível da linha: mostra detalhes e ações também em ecrãs pequenos. */
  readonly prominent = input(false);

  readonly actionSelected = output<string>();
  readonly primaryTriggered = output<string>();
  readonly cardClicked = output<void>();
  /** Abre os detalhes da pessoa (alias semântico de `cardClicked`). */
  readonly open = output<void>();

  protected readonly icons = ICONS;

  /** Cartão de linha: mesmo vocabulário visual, muito menos altura. */
  protected readonly linearClasses = (): string => {
    if (this.prominent()) {
      const base = 'relative flex min-w-0 flex-col gap-4 rounded-2xl border bg-surface p-4 shadow-card transition hover:border-brand/40';
      return this.highlight() ? `${base} border-brand/50` : `${base} border-line`;
    }
    const base = 'relative flex min-w-0 items-center rounded-2xl border shadow-card transition gap-1 p-1.5';
    return this.highlight()
      ? `${base} border-brand/50 bg-brand/5`
      : `${base} border-line bg-surface hover:border-brand/40`;
  };

  /** Área clicável; na versão proeminente ganha ar e mantém o foco visível. */
  protected readonly linearBodyClasses = (): string =>
    this.prominent()
      ? 'flex w-full min-w-0 items-start gap-3 overflow-hidden rounded-xl px-0.5 outline-none transition focus-visible:ring-2 focus-visible:ring-brand/60'
      : 'flex min-w-0 flex-1 items-center gap-2 overflow-hidden rounded-xl px-2 py-1.5 outline-none transition focus-visible:ring-2 focus-visible:ring-brand/60';

  protected readonly classes = (): string => {
    // Todos os cartões de pessoa ocupam a altura da célula da grelha
    // (`auto-rows-fr`) e encostam as ações em baixo: tamanho uniforme.
    const rich = this.variant() === 'rich' && !this.compact();
    const base =
      'flex h-full min-w-0 flex-col rounded-2xl border shadow-card transition ' +
      (rich ? 'overflow-hidden' : this.compact() ? 'gap-3 p-3' : 'gap-3 p-3.5');
    return this.highlight()
      ? `${base} border-brand/50 bg-brand/5`
      : `${base} border-line bg-surface hover:border-brand/40`;
  };

  protected iconFor(key: string) {
    return this.icons[key as keyof typeof ICONS] ?? ICONS['user'];
  }

  protected onClick(): void {
    if (this.clickable()) {
      this.open.emit();
      this.cardClicked.emit();
    }
  }

  protected onKeydown(event: Event): void {
    if (!this.clickable()) {
      return;
    }
    event.preventDefault();
    this.open.emit();
    this.cardClicked.emit();
  }

  protected triggerPrimary(event: Event, action: PersonPrimaryAction): void {
    event.stopPropagation();
    if (!action.disabled) {
      this.primaryTriggered.emit(action.id);
    }
  }
}
