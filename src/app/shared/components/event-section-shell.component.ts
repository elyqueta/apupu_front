import { Component, inject, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { I18nService } from '../../core/i18n/i18n.service';
import { ICONS } from '../../core/ui/icons';
import { ActionMenuItem } from './action-menu.component';
import { ModalComponent } from './modal.component';

/** Secção navegável no rail do evento. */
export interface EventSectionItem {
  id: string;
  label: string;
  icon: IconDefinition;
  count?: number | null;
}

/**
 * Layout das páginas de evento: conteúdo ao centro e rail direito com a
 * navegação das secções e as ações disponíveis. Em ecrãs pequenos o rail
 * passa a drawer ("Menu do evento"), aberta a partir do cabeçalho.
 *
 * O cabeçalho fica apenas com voltar, contexto e título — ações e separadores
 * vivem no rail, para não competirem com a navegação principal da aplicação.
 */
@Component({
  selector: 'app-event-section-shell',
  imports: [RouterLink, FaIconComponent, ModalComponent],
  template: `
    <header class="sticky top-0 z-30 border-b border-line bg-surface/85 backdrop-blur-xl">
      <div class="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
        <a
          [routerLink]="backLink()"
          class="inline-flex min-h-11 items-center gap-2 text-xs font-semibold text-muted transition hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
        >
          <fa-icon [icon]="icons['chevronLeft']" aria-hidden="true" />
          {{ backLabel() }}
        </a>

        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2 text-xs text-muted">
            <span class="font-semibold uppercase tracking-wider text-brand">{{ contextLabel() }}</span>
            @if (location()) {
              <span aria-hidden="true">·</span>
              <span>{{ location() }}</span>
            }
            @for (badge of badges(); track badge) {
              <span class="rounded-full border border-brand/30 bg-brand/10 px-2 py-0.5 text-xs font-semibold text-brand">
                {{ badge }}
              </span>
            }
          </div>
          <h1 class="truncate font-display text-xl font-semibold tracking-tight text-ink sm:text-2xl">
            {{ title() }}
          </h1>
        </div>

        <button
          type="button"
          data-testid="event-section-menu-trigger"
          class="ui-icon-button lg:hidden"
          [attr.aria-label]="menuLabel()"
          [attr.title]="menuLabel()"
          aria-haspopup="dialog"
          [attr.aria-expanded]="menuOpen()"
          (click)="menuOpen.set(true)"
        >
          <fa-icon [icon]="icons['checklist']" aria-hidden="true" />
        </button>
      </div>
    </header>

    <div class="mx-auto grid w-full max-w-7xl gap-6 px-4 pb-10 pt-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_16rem]">
      <main class="min-w-0">
        <ng-content />
      </main>

      <aside class="hidden lg:block" [attr.aria-label]="menuLabel()">
        <div class="sticky top-24 flex flex-col gap-4">
          <nav role="tablist" [attr.aria-label]="menuLabel()" class="flex flex-col gap-1">
            @for (section of sections(); track section.id) {
              <button
                type="button"
                role="tab"
                class="flex min-h-11 items-center gap-2.5 rounded-xl border px-3 text-left text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
                [class]="activeSection() === section.id ? 'border-brand/30 bg-brand/15 text-ink' : 'border-line text-muted hover:bg-surface-raised/60 hover:text-ink'"
                [attr.aria-selected]="activeSection() === section.id"
                (click)="selectSection(section.id)"
              >
                <fa-icon [icon]="section.icon" class="w-4 shrink-0" aria-hidden="true" />
                <span class="min-w-0 flex-1 truncate">{{ section.label }}</span>
                @if (section.count !== null && section.count !== undefined) {
                  <span class="rounded-full bg-surface-raised px-2 text-xs text-muted">{{ section.count }}</span>
                }
              </button>
            }
          </nav>

          @if (actions().length > 0) {
            <div class="rounded-2xl border border-line bg-surface-solid/70 p-2">
              <p class="px-1.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
                {{ i18n.t('common.moreActions') }}
              </p>
              <div class="flex flex-col gap-0.5">
                @for (action of actions(); track action.id) {
                  <button
                    type="button"
                    class="flex min-h-11 items-center gap-2.5 rounded-xl px-2.5 text-left text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 disabled:cursor-not-allowed disabled:opacity-50"
                    [class]="action.tone === 'danger' ? 'text-coral hover:bg-coral/10' : 'text-ink hover:bg-surface-raised'"
                    [disabled]="action.disabled"
                    [attr.aria-disabled]="action.disabled ? 'true' : null"
                    [attr.title]="action.disabled ? disabledHint() || null : null"
                    (click)="selectAction(action)"
                  >
                    <fa-icon [icon]="action.icon" class="w-4 shrink-0" aria-hidden="true" />
                    <span class="min-w-0 flex-1 truncate">{{ action.label }}</span>
                  </button>
                }
              </div>
            </div>
          }
        </div>
      </aside>
    </div>

    @if (menuOpen()) {
      <app-modal
        [open]="true"
        [title]="menuLabel()"
        size="sm"
        (closed)="menuOpen.set(false)"
      >
        <nav role="tablist" [attr.aria-label]="menuLabel()" class="flex flex-col gap-1">
          @for (section of sections(); track section.id) {
            <button
              type="button"
              role="tab"
              class="flex min-h-11 items-center gap-2.5 rounded-xl border px-3 text-left text-xs font-semibold transition"
              [class]="activeSection() === section.id ? 'border-brand/30 bg-brand/15 text-ink' : 'border-line text-muted'"
              [attr.aria-selected]="activeSection() === section.id"
              (click)="selectSection(section.id)"
            >
              <fa-icon [icon]="section.icon" class="w-4 shrink-0" aria-hidden="true" />
              <span class="min-w-0 flex-1 truncate">{{ section.label }}</span>
              @if (section.count !== null && section.count !== undefined) {
                <span class="rounded-full bg-surface-raised px-2 text-xs text-muted">{{ section.count }}</span>
              }
            </button>
          }
        </nav>

        @if (actions().length > 0) {
          <div class="mt-4 border-t border-line pt-3">
            <p class="px-1 pb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
              {{ i18n.t('common.moreActions') }}
            </p>
            <div class="flex flex-col gap-0.5">
              @for (action of actions(); track action.id) {
                <button
                  type="button"
                  class="flex min-h-11 items-center gap-2.5 rounded-xl px-2.5 text-left text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
                  [class]="action.tone === 'danger' ? 'text-coral hover:bg-coral/10' : 'text-ink hover:bg-surface-raised'"
                  [disabled]="action.disabled"
                  (click)="selectAction(action)"
                >
                  <fa-icon [icon]="action.icon" class="w-4 shrink-0" aria-hidden="true" />
                  <span class="min-w-0 flex-1 truncate">{{ action.label }}</span>
                </button>
              }
            </div>
          </div>
        }
      </app-modal>
    }
  `,
})
export class EventSectionShellComponent {
  protected readonly i18n = inject(I18nService);
  protected readonly icons = ICONS;

  readonly backLink = input.required<string>();
  readonly backLabel = input.required<string>();
  readonly contextLabel = input.required<string>();
  readonly title = input.required<string>();
  readonly location = input<string>('');
  readonly badges = input<string[]>([]);
  readonly sections = input.required<EventSectionItem[]>();
  readonly activeSection = input.required<string>();
  readonly actions = input<ActionMenuItem[]>([]);
  readonly disabledHint = input<string>('');
  readonly menuLabel = input<string>('');

  readonly sectionChange = output<string>();
  readonly action = output<string>();

  protected readonly menuOpen = signal(false);

  protected selectSection(id: string): void {
    this.menuOpen.set(false);
    if (id !== this.activeSection()) {
      this.sectionChange.emit(id);
    }
  }

  protected selectAction(item: ActionMenuItem): void {
    if (item.disabled) return;
    this.menuOpen.set(false);
    this.action.emit(item.id);
  }
}
