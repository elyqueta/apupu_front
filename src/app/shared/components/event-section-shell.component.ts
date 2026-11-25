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
 * No desktop, o cabeçalho mostra voltar, contexto, título, estado e uma
 * ação principal; as restantes vivem no rail, colapsável. No mobile o
 * cabeçalho é omitido (a barra superior da app tem voltar e menu do
 * evento) e "Mais ações" abre como bottom sheet, como no convite.
 */
@Component({
  selector: 'app-event-section-shell',
  imports: [RouterLink, FaIconComponent, ModalComponent],
  template: `
    <!-- Cabeçalho da secção oculto em todos os tamanhos (navegação na barra superior/rail). -->
    <header class="hidden">
      <div
        class="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:gap-5"
      >
        <div class="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <a
            [routerLink]="backLink()"
            [attr.aria-label]="backLabel()"
            class="inline-flex min-h-11 shrink-0 items-center gap-2 text-xs font-semibold text-muted transition hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
          >
            <fa-icon [icon]="icons['chevronLeft']" aria-hidden="true" />
            <span class="sm:hidden">
              {{ backLabelShort() || i18n.t('block9.event.backShort') }}
            </span>
            <span class="hidden sm:inline">{{ backLabel() }}</span>
          </a>

          <div class="min-w-0 flex-1">
            <div class="flex min-w-0 flex-wrap items-center gap-2">
              <h1
                [title]="title()"
                class="min-w-0 truncate font-display text-xl font-semibold tracking-tight text-ink sm:text-2xl"
              >
                {{ title() }}
              </h1>
              @for (badge of badges(); track badge) {
                <span
                  class="shrink-0 rounded-full border border-brand/30 bg-brand/10 px-2 py-0.5 text-xs font-semibold text-brand"
                >
                  {{ badge }}
                </span>
              }
            </div>
            <div class="mt-1 flex min-w-0 flex-wrap items-center gap-2 text-xs text-muted">
              <span class="font-semibold uppercase tracking-wider text-brand">
                {{ contextLabel() }}
              </span>
              @if (location()) {
                <span aria-hidden="true">·</span>
                <span class="min-w-0 truncate">{{ location() }}</span>
              }
            </div>
          </div>
        </div>

        <div class="flex shrink-0 items-center gap-2">
          @if (primaryAction(); as primary) {
            <button
              type="button"
              data-testid="event-section-primary-action"
              class="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand px-3.5 text-xs font-semibold text-on-secondary transition hover:bg-secondary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 disabled:cursor-not-allowed disabled:opacity-50"
              [disabled]="primary.disabled"
              (click)="selectAction(primary)"
            >
              <fa-icon [icon]="primary.icon" class="text-[11px]" aria-hidden="true" />
              <span class="truncate">{{ primary.label }}</span>
            </button>
          }

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
      </div>
    </header>

    <div
      class="mx-auto grid w-full max-w-7xl gap-6 px-4 pb-10 pt-2 transition-[grid-template-columns] duration-200 motion-reduce:transition-none sm:px-6"
      [class]="
        railCollapsed()
          ? 'lg:grid-cols-[minmax(0,1fr)_4.5rem]'
          : 'lg:grid-cols-[minmax(0,1fr)_16rem]'
      "
    >
      <main class="min-w-0">
        <ng-content />
      </main>

      <aside class="hidden min-w-0 lg:block" [attr.aria-label]="menuLabel()">
        <div class="sticky top-24 flex flex-col gap-3">
          <button
            type="button"
            data-testid="event-rail-toggle"
            class="grid size-11 shrink-0 place-items-center self-end rounded-xl border border-line bg-surface-raised/70 text-muted transition hover:border-brand/40 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
            [attr.aria-label]="
              railCollapsed()
                ? i18n.t('block9.event.railExpand')
                : i18n.t('block9.event.railCollapse')
            "
            [attr.title]="
              railCollapsed()
                ? i18n.t('block9.event.railExpand')
                : i18n.t('block9.event.railCollapse')
            "
            [attr.aria-expanded]="!railCollapsed()"
            (click)="railCollapsed.set(!railCollapsed())"
          >
            <fa-icon
              [icon]="railCollapsed() ? icons['chevronLeft'] : icons['chevronRight']"
              aria-hidden="true"
            />
          </button>

          <nav role="tablist" [attr.aria-label]="menuLabel()" class="flex flex-col gap-1">
            @for (section of sections(); track section.id) {
              <button
                type="button"
                role="tab"
                [attr.title]="railCollapsed() ? section.label : null"
                class="flex min-h-11 items-center gap-2.5 rounded-xl border px-3 text-left text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
                [class.justify-center]="railCollapsed()"
                [class]="activeSection() === section.id ? 'border-brand/30 bg-brand/15 text-ink' : 'border-line text-muted hover:bg-surface-raised/60 hover:text-ink'"
                [attr.aria-selected]="activeSection() === section.id"
                (click)="selectSection(section.id)"
              >
                <fa-icon [icon]="section.icon" class="w-4 shrink-0" aria-hidden="true" />
                @if (!railCollapsed()) {
                  <span class="min-w-0 flex-1 truncate">{{ section.label }}</span>
                  @if (section.count !== null && section.count !== undefined) {
                    <span class="rounded-full bg-surface-raised px-2 text-xs text-muted">
                      {{ section.count }}
                    </span>
                  }
                }
              </button>
            }
          </nav>

          @if (actions().length > 0) {
            <div class="rounded-2xl border border-line bg-surface-solid/70 p-2">
              @if (!railCollapsed()) {
                <p class="px-1.5 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                  {{ i18n.t('common.moreActions') }}
                </p>
              }
              <div class="flex flex-col gap-0.5">
                @for (action of actions(); track action.id) {
                  <button
                    type="button"
                    class="flex min-h-11 items-center gap-2.5 rounded-xl px-2.5 text-left text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 disabled:cursor-not-allowed disabled:opacity-50"
                    [class.justify-center]="railCollapsed()"
                    [class]="action.tone === 'danger' ? 'text-coral hover:bg-coral/10' : 'text-ink hover:bg-surface-raised'"
                    [disabled]="action.disabled"
                    [attr.aria-disabled]="action.disabled ? 'true' : null"
                    [attr.title]="action.disabled ? disabledHint() || null : railCollapsed() ? action.label : null"
                    (click)="selectAction(action)"
                  >
                    <fa-icon [icon]="action.icon" class="w-4 shrink-0" aria-hidden="true" />
                    @if (!railCollapsed()) {
                      <span class="min-w-0 flex-1 truncate">{{ action.label }}</span>
                    }
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
        presentation="sheet"
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
                <span class="rounded-full bg-surface-raised px-2 text-xs text-muted">
                  {{ section.count }}
                </span>
              }
            </button>
          }
        </nav>

        @if (actions().length > 0) {
          <div class="mt-4 border-t border-line pt-3">
            <p class="px-1 pb-1 text-xs font-semibold uppercase tracking-[0.16em] text-muted">
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
  readonly backLabelShort = input<string>('');
  readonly contextLabel = input.required<string>();
  readonly title = input.required<string>();
  readonly location = input<string>('');
  readonly badges = input<string[]>([]);
  readonly sections = input.required<EventSectionItem[]>();
  readonly activeSection = input.required<string>();
  readonly actions = input<ActionMenuItem[]>([]);
  readonly primaryAction = input<ActionMenuItem | null>(null);
  readonly disabledHint = input<string>('');
  readonly menuLabel = input<string>('');

  readonly sectionChange = output<string>();
  readonly action = output<string>();

  protected readonly menuOpen = signal(false);
  protected readonly railCollapsed = signal(false);

  /** Abre o menu de secções a pedido da barra superior do evento. */
  openMenu(): void {
    this.menuOpen.set(true);
  }

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
