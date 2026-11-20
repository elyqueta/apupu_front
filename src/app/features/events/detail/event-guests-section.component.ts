import { Component, inject, input, output } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { Pagination } from '../../../core/api/api.models';
import { GuestListEntry } from '../../../core/data/guests.repository';
import { I18nService } from '../../../core/i18n/i18n.service';
import { EventPermissions, EventStats, Guest } from '../../../core/models/models';
import { ICONS } from '../../../core/ui/icons';
import { ActionMenuItem } from '../../../shared/components/action-menu.component';
import { PersonCardComponent, PersonMetaItem, PersonPrimaryAction } from '../../../shared/components/person-card.component';
import { SkeletonComponent } from '../../../shared/components/skeleton.component';
import { StatCardComponent } from '../../../shared/components/stat-card.component';
import { StatGridComponent } from '../../../shared/components/stat-grid.component';
import { GUEST_FILTERS, GuestFilter } from './detail.models';

/** Secção de convidados do detalhe do evento (lista paginada no servidor). */
@Component({
  selector: 'app-event-guests-section',
  imports: [FaIconComponent, PersonCardComponent, SkeletonComponent, StatCardComponent, StatGridComponent],
  template: `
    <section class="flex flex-col gap-4">
      <app-stat-grid>
        <app-stat-card [label]="i18n.t('eventDetail.stats.guests')" [value]="i18n.number(stats().total)" [icon]="icons['guests']" tone="brand" />
        <app-stat-card [label]="i18n.t('eventDetail.stats.confirmed')" [value]="i18n.number(stats().confirmed)" [icon]="icons['userCheck']" tone="mint" />
        <app-stat-card [label]="i18n.t('eventDetail.stats.pending')" [value]="i18n.number(stats().pending)" [icon]="icons['hourglass']" tone="amber" />
        <app-stat-card [label]="i18n.t('eventDetail.stats.declined')" [value]="i18n.number(stats().declined)" [icon]="icons['error']" tone="coral" />
      </app-stat-grid>

      <article class="rounded-4xl border border-line bg-surface p-5 shadow-card backdrop-blur-2xl">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.2em] text-brand-strong">
              {{ i18n.t('eventDetail.guestList') }}
            </p>
            <p class="mt-1 text-xs text-muted">{{ i18n.t('eventDetail.guestListHint') }}</p>
          </div>
          @if (permissions().canManageGuests) {
            <button
              type="button"
              class="inline-flex h-11 items-center gap-2 rounded-xl bg-brand px-4 text-xs font-semibold text-on-secondary transition hover:bg-secondary-hover"
              (click)="addGuest.emit()"
            >
              <fa-icon [icon]="icons['userPlus']" class="text-xs" aria-hidden="true" />
              {{ i18n.t('eventDetail.addGuest') }}
            </button>
          }
        </div>

        <div class="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div
            class="flex flex-wrap items-center gap-1.5"
            role="group"
            [attr.aria-label]="i18n.t('eventDetail.filterStatus')"
          >
            @for (item of filters; track item.id) {
              <button
                type="button"
                class="inline-flex h-11 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold transition"
                [class]="
                  filter() === item.id
                    ? 'border border-brand/30 bg-brand/15 text-ink'
                    : 'border border-line text-muted hover:bg-surface-raised/60 hover:text-ink'
                "
                [attr.aria-pressed]="filter() === item.id"
                (click)="filterChange.emit(item.id)"
              >
                {{ i18n.t(item.labelKey) }}
                <span class="text-xs text-muted">{{ countFor(item.id) }}</span>
              </button>
            }
          </div>

          <label class="relative flex items-center sm:w-72">
            <fa-icon
              [icon]="icons['search']"
              class="pointer-events-none absolute left-3 text-xs text-muted"
              aria-hidden="true"
            />
            <input
              type="search"
              [value]="search()"
              (input)="searchChange.emit($any($event.target).value)"
              class="h-11 w-full rounded-xl border border-line bg-surface-raised/70 pl-9 pr-3 text-xs text-ink outline-none transition placeholder:text-muted/60 focus:border-brand/50"
              [placeholder]="i18n.t('eventDetail.searchGuests')"
              [attr.aria-label]="i18n.t('eventDetail.searchGuests')"
            />
          </label>
        </div>

        <div id="event-guests-list" class="scroll-mt-24">
          @if (loading() || !loaded()) {
            <app-skeleton variant="cards" />
          } @else if (entries().length === 0) {
            <div
              class="mt-6 flex flex-col items-center rounded-3xl border border-dashed border-line p-6 text-center sm:p-10"
            >
              <span
                class="grid size-12 place-items-center rounded-2xl border border-brand/25 bg-brand/15 text-brand-strong"
              >
                <fa-icon
                  [icon]="search() || filter() !== 'all' ? icons['search'] : icons['userPlus']"
                  class="text-lg"
                  aria-hidden="true"
                />
              </span>
              @if (search() || filter() !== 'all') {
                <p class="mt-3 text-sm font-semibold text-ink">
                  {{ i18n.t('guests.searchEmpty', { term: search() }) }}
                </p>
                <p class="mt-1 text-xs text-muted">{{ i18n.t('eventDetail.noResults') }}</p>
              } @else {
                <p class="mt-3 text-sm font-semibold text-ink">
                  {{ i18n.t('eventDetail.noGuests') }}
                </p>
                <p class="mt-1 text-xs text-muted">{{ i18n.t('eventDetail.noGuestsHint') }}</p>
                @if (permissions().canManageGuests) {
                  <button
                    type="button"
                    class="mt-4 inline-flex h-11 items-center gap-2 rounded-xl bg-brand px-4 text-xs font-semibold text-on-secondary transition hover:bg-secondary-hover"
                    (click)="addGuest.emit()"
                  >
                    <fa-icon [icon]="icons['userPlus']" class="text-xs" aria-hidden="true" />
                    {{ i18n.t('eventDetail.addGuest') }}
                  </button>
                }
              }
            </div>
          } @else {
            <ul class="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              @for (entry of entries(); track entry.guest.id) {
                <li class="min-w-0">
                  <app-person-card
                    [name]="entry.guest.name"
                    [subtitle]="entry.guest.email + (entry.guest.phone ? ' · ' + entry.guest.phone : '')"
                    [status]="entry.guest.status"
                    [meta]="metaFor(entry)"
                    [actions]="actionsFor(entry)"
                    [primaryAction]="primaryFor(entry)"
                    [actionsLabel]="i18n.t('eventDetail.table.actions')"
                    (actionSelected)="onAction($event, entry)"
                    (primaryTriggered)="onPrimary($event, entry)"
                  />
                </li>
              }
            </ul>

            @if (pagination(); as page) {
              <nav
                class="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4"
                [attr.aria-label]="i18n.t('guests.pagination')"
              >
                <span class="text-xs text-muted">{{ rangeLabel() }}</span>
                <div class="flex items-center gap-2">
                  <button
                    type="button"
                    class="inline-flex h-11 items-center gap-1.5 rounded-xl border border-line bg-surface px-3 text-xs font-semibold text-ink transition hover:border-brand/40 disabled:opacity-40"
                    [disabled]="page.page <= 1 || loading()"
                    (click)="pageChange.emit(page.page - 1)"
                  >
                    <fa-icon [icon]="icons['chevronLeft']" class="text-xs" aria-hidden="true" />
                    {{ i18n.t('guests.previous') }}
                  </button>
                  <span class="text-xs text-muted">
                    {{ i18n.t('guests.page', { page: page.page, total: page.total_pages }) }}
                  </span>
                  <button
                    type="button"
                    class="inline-flex h-11 items-center gap-1.5 rounded-xl border border-line bg-surface px-3 text-xs font-semibold text-ink transition hover:border-brand/40 disabled:opacity-40"
                    [disabled]="page.page >= page.total_pages || loading()"
                    (click)="pageChange.emit(page.page + 1)"
                  >
                    {{ i18n.t('guests.next') }}
                    <fa-icon [icon]="icons['chevronRight']" class="text-xs" aria-hidden="true" />
                  </button>
                </div>
              </nav>
            }
          }
        </div>
      </article>
    </section>
  `,
})
export class EventGuestsSectionComponent {
  readonly entries = input.required<GuestListEntry[]>();
  readonly pagination = input<Pagination | null>(null);
  readonly stats = input.required<EventStats>();
  readonly counts = input.required<{ all: number; confirmed: number; pending: number; declined: number }>();
  readonly loading = input(false);
  readonly loaded = input(false);
  readonly search = input('');
  readonly filter = input<GuestFilter>('all');
  readonly rangeLabel = input('');
  readonly permissions = input.required<EventPermissions>();

  readonly searchChange = output<string>();
  readonly filterChange = output<GuestFilter>();
  readonly pageChange = output<number>();
  readonly addGuest = output<void>();
  readonly editGuest = output<Guest>();
  readonly resendGuest = output<Guest>();
  readonly removeGuest = output<Guest>();
  readonly ticketGuest = output<Guest>();
  readonly whatsappGuest = output<Guest>();

  protected readonly i18n = inject(I18nService);
  protected readonly icons = ICONS;
  protected readonly filters = GUEST_FILTERS;

  protected countFor(filter: GuestFilter): number {
    return this.counts()[filter];
  }

  /** Linhas curtas do cartão, alinhadas com a página global de convidados. */
  protected metaFor(entry: GuestListEntry): PersonMetaItem[] {
    const timezone = entry.event.timezone;
    return [
      {
        icon: 'clock',
        label: `${this.i18n.t('guests.tableInvited')}: ${this.i18n.shortDate(entry.guest.invitedAt, timezone)}`,
      },
      {
        icon: 'envelopeOpen',
        label: entry.guest.openedAt
          ? `${this.i18n.t('guests.opened')} · ${this.i18n.relative(entry.guest.openedAt)}`
          : this.i18n.t('guests.notOpened'),
      },
      {
        icon: 'location',
        label: `${this.i18n.t('eventDetail.table.table')}: ${entry.guest.tableName ?? '—'}`,
      },
    ];
  }

  protected actionsFor(_entry: GuestListEntry): ActionMenuItem[] {
    const items: ActionMenuItem[] = [];
    const canEdit = this.permissions().canEditExistingGuests;
    if (canEdit) {
      items.push(
        { id: 'edit', label: this.i18n.t('guests.editAction'), icon: ICONS['pen'] },
        { id: 'resend', label: this.i18n.t('eventDetail.resend'), icon: ICONS['paperPlane'] },
      );
    }
    if (this.permissions().canExport) {
      items.push({ id: 'ticket', label: this.i18n.t('eventDetail.ticket'), icon: ICONS['ticket'] });
    }
    if (canEdit) {
      items.push({
        id: 'remove',
        label: this.i18n.t('guests.remove'),
        icon: ICONS['trash'],
        tone: 'danger',
      });
    }
    return items;
  }

  /** `canExport` é uma capacidade exclusiva do anfitrião (ver `hostPermissions`). */
  protected primaryFor(entry: GuestListEntry): PersonPrimaryAction | null {
    if (!this.permissions().canExport || !entry.guest.phone) {
      return null;
    }
    return {
      id: 'whatsapp',
      label: this.i18n.t('guests.whatsappShort'),
      icon: ICONS['whatsapp'],
      hint: this.i18n.t('guests.whatsapp'),
    };
  }

  protected onAction(id: string, entry: GuestListEntry): void {
    switch (id) {
      case 'edit':
        this.editGuest.emit(entry.guest);
        break;
      case 'resend':
        this.resendGuest.emit(entry.guest);
        break;
      case 'ticket':
        this.ticketGuest.emit(entry.guest);
        break;
      case 'remove':
        this.removeGuest.emit(entry.guest);
        break;
      default:
        break;
    }
  }

  protected onPrimary(id: string, entry: GuestListEntry): void {
    if (id === 'whatsapp') {
      this.whatsappGuest.emit(entry.guest);
    }
  }
}
