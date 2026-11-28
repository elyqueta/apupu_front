import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { Pagination } from '../../../core/api/api.models';
import { GuestListEntry } from '../../../core/data/guests.repository';
import { I18nService } from '../../../core/i18n/i18n.service';
import { EventPermissions, EventStats, Guest } from '../../../core/models/models';
import { ShareService } from '../../../core/services/share.service';
import { ToastService } from '../../../core/services/toast.service';
import { ICONS } from '../../../core/ui/icons';
import { ActionMenuItem } from '../../../shared/components/action-menu.component';
import { AvatarComponent } from '../../../shared/components/avatar.component';
import { ModalComponent } from '../../../shared/components/modal.component';
import { PersonCardComponent, PersonMetaItem, PersonPrimaryAction } from '../../../shared/components/person-card.component';
import { LinkCopyService } from '../../../shared/services/link-copy.service';
import { SkeletonComponent } from '../../../shared/components/skeleton.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge.component';
import { StatCardComponent } from '../../../shared/components/stat-card.component';
import { StatGridComponent } from '../../../shared/components/stat-grid.component';
import { whatsappSharedLabel } from '../../../shared/services/whatsapp-share.presenter';
import { GUEST_FILTERS, GuestFilter } from './detail.models';

/** Secção de convidados do detalhe do evento (lista paginada no servidor). */
@Component({
  selector: 'app-event-guests-section',
  imports: [
    FaIconComponent,
    AvatarComponent,
    ModalComponent,
    PersonCardComponent,
    SkeletonComponent,
    StatCardComponent,
    StatGridComponent,
    StatusBadgeComponent,
  ],
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

        <div>
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
            <ul class="mt-4 flex flex-col gap-2">
              @for (entry of entries(); track entry.guest.id) {
                <li class="min-w-0">
                  <app-person-card
                    layout="linear"
                    [clickable]="true"
                    [clickLabel]="i18n.t('common.viewDetails') + ': ' + entry.guest.name"
                    [name]="entry.guest.name"
                    [subtitle]="contactLine(entry.guest)"
                    [status]="entry.guest.status"
                    [meta]="metaFor(entry)"
                    [actions]="actionsFor(entry)"
                    [primaryAction]="null"
                    [secondaryAction]="secondaryFor(entry)"
                    [flag]="entry.guest.ageFlag ? i18n.t('block10.guest.ageFlag') : null"
                    [flagHint]="i18n.t('block10.guest.ageFlagHint')"
                    [actionsLabel]="i18n.t('eventDetail.table.actions')"
                    (actionSelected)="onAction($event, entry)"
                    (primaryTriggered)="onPrimary($event, entry)"
                    (open)="openDetails(entry)"
                  />
                </li>
              }
            </ul>

            @if (pagination(); as page) {
              <nav
                class="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4"
                [attr.aria-label]="i18n.t('guests.pagination')"
              >
                <span
                  data-testid="event-guests-range"
                  class="inline-flex items-center gap-2 rounded-full border border-line bg-surface-raised/60 px-3 py-1.5 text-[11px] font-medium text-muted"
                >
                  <fa-icon [icon]="icons['guests']" class="text-[10px] text-brand-strong" aria-hidden="true" />
                  {{ showingLabel() }}
                </span>
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

      <app-modal
        [open]="detailTarget() !== null"
        [title]="detailTarget()?.guest?.name ?? i18n.t('common.viewDetails')"
        size="lg"
        (closed)="closeDetails()"
      >
        @if (detailTarget(); as entry) {
          <div
            class="rounded-2xl border border-line bg-surface-raised/50 p-4 shadow-card"
            data-testid="guest-detail-card"
          >
            <div class="flex items-start gap-3">
              <app-avatar [name]="entry.guest.name" size="lg" class="shrink-0" />
              <div class="min-w-0 flex-1">
                <p class="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
                  {{ i18n.t('common.name') }}
                </p>
                <p class="mt-0.5 break-words text-sm font-semibold leading-5 text-ink">
                  {{ entry.guest.name }}
                </p>
              </div>
              <app-status-badge [value]="entry.guest.status" class="shrink-0" />
            </div>

            <div class="mt-4 grid gap-2">
              @if (entry.guest.email) {
                <div
                  class="flex min-w-0 items-start gap-2 rounded-xl border border-line/70 bg-surface/70 px-3 py-2"
                  data-testid="guest-detail-email"
                >
                  <fa-icon
                    [icon]="icons['envelope']"
                    class="mt-0.5 shrink-0 text-brand-strong"
                    aria-hidden="true"
                  />
                  <div class="min-w-0 flex-1">
                    <p class="text-[10px] font-semibold uppercase tracking-wider text-muted">
                      {{ i18n.t('common.email') }}
                    </p>
                    <p class="break-all text-xs leading-5 text-ink">{{ entry.guest.email }}</p>
                  </div>
                </div>
              }
              @if (entry.guest.phone) {
                <div
                  class="flex min-w-0 items-start gap-2 rounded-xl border border-line/70 bg-surface/70 px-3 py-2"
                  data-testid="guest-detail-phone"
                >
                  <fa-icon
                    [icon]="icons['phone']"
                    class="mt-0.5 shrink-0 text-brand-strong"
                    aria-hidden="true"
                  />
                  <div class="min-w-0 flex-1">
                    <p class="text-[10px] font-semibold uppercase tracking-wider text-muted">
                      {{ i18n.t('common.phone') }}
                    </p>
                    <p class="break-all text-xs leading-5 text-ink">{{ entry.guest.phone }}</p>
                  </div>
                </div>
              }
            </div>
          </div>
          <ul
            class="mt-3 divide-y divide-line/60 rounded-2xl border border-line bg-surface/40 px-3 text-xs text-muted"
            data-testid="guest-detail-meta"
          >
            @for (item of metaFor(entry); track $index) {
              <li class="flex min-w-0 items-start gap-2 py-2">
                <fa-icon [icon]="iconFor(item.icon)" class="mt-0.5 shrink-0 text-[11px] text-brand-strong" aria-hidden="true" />
                <span class="min-w-0 break-words">{{ item.label }}</span>
              </li>
            }
            @if (entry.guest.message) {
              <li class="flex min-w-0 items-start gap-2 py-2">
                <fa-icon [icon]="icons['envelopeOpen']" class="mt-0.5 shrink-0 text-[11px] text-brand-strong" aria-hidden="true" />
                <span class="min-w-0 break-words">{{ i18n.t('guests.guestMessage', { message: entry.guest.message }) }}</span>
              </li>
            }
          </ul>
        }
        @if (detailTarget(); as entry) {
          <div modal-footer class="grid w-full flex-1 grid-cols-1 gap-2 sm:grid-cols-3">
            <button
              type="button"
              class="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-line bg-surface-raised px-3 text-xs font-semibold text-ink transition hover:border-brand/40"
              (click)="copyEmailFromDetails(entry)"
            >
              <fa-icon [icon]="icons['copy']" class="text-muted" aria-hidden="true" />
              {{ i18n.t('guests.copyEmail') }}
            </button>
            @if (entry.guest.invitationUrl) {
              <button
                type="button"
                class="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-line bg-surface-raised px-3 text-xs font-semibold text-ink transition hover:border-brand/40"
                (click)="viewInvitationFromDetails(entry)"
              >
                <fa-icon [icon]="icons['link']" class="text-muted" aria-hidden="true" />
                {{ i18n.t('guests.viewInvitation') }}
              </button>
            }
            @if (permissions().canEditExistingGuests) {
              <button
                type="button"
                class="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-line bg-surface-raised px-3 text-xs font-semibold text-ink transition hover:border-brand/40"
                (click)="emitGuest(editGuest, entry)"
              >
                <fa-icon [icon]="icons['pen']" class="text-muted" aria-hidden="true" />
                {{ i18n.t('guests.editAction') }}
              </button>
              <button
                type="button"
                class="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-line bg-surface-raised px-3 text-xs font-semibold text-ink transition hover:border-brand/40"
                (click)="emitGuest(resendGuest, entry)"
              >
                <fa-icon [icon]="icons['paperPlane']" class="text-muted" aria-hidden="true" />
                {{ i18n.t('eventDetail.resend') }}
              </button>
              <button
                type="button"
                class="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-line bg-surface-raised px-3 text-xs font-semibold text-ink transition hover:border-brand/40"
                (click)="emitGuest(editGuestLink, entry)"
              >
                <fa-icon [icon]="icons['link']" class="text-muted" aria-hidden="true" />
                {{ i18n.t('eventDetail.linkValidityAction') }}
              </button>
            }
            @if (permissions().canExport) {
              <button
                type="button"
                class="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-line bg-surface-raised px-3 text-xs font-semibold text-ink transition hover:border-brand/40"
                (click)="emitGuest(ticketGuest, entry)"
              >
                <fa-icon [icon]="icons['ticket']" class="text-muted" aria-hidden="true" />
                {{ i18n.t('eventDetail.ticket') }}
              </button>
              @if (entry.guest.phone) {
                <button
                  type="button"
                  class="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand px-3 text-xs font-semibold text-on-secondary transition hover:bg-secondary-hover sm:col-span-3"
                  (click)="emitGuest(whatsappGuest, entry)"
                >
                  <fa-icon [icon]="icons['whatsapp']" aria-hidden="true" />
                  {{ i18n.t('guests.whatsapp') }}
                </button>
              }
            }
            @if (permissions().canEditExistingGuests) {
              <button
                type="button"
                class="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-coral/30 px-3 text-xs font-semibold text-coral transition hover:bg-coral/10 sm:col-span-3"
                (click)="emitGuest(removeGuest, entry)"
              >
                <fa-icon [icon]="icons['trash']" aria-hidden="true" />
                {{ i18n.t('guests.remove') }}
              </button>
            }
          </div>
        }
      </app-modal>
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
  readonly editGuestLink = output<Guest>();
  readonly removeGuest = output<Guest>();
  readonly ticketGuest = output<Guest>();
  readonly whatsappGuest = output<Guest>();

  protected readonly i18n = inject(I18nService);
  protected readonly icons = ICONS;
  protected readonly filters = GUEST_FILTERS;
  protected readonly detailTarget = signal<GuestListEntry | null>(null);
  private readonly linkCopy = inject(LinkCopyService);
  private readonly share = inject(ShareService);
  private readonly toasts = inject(ToastService);

  /** Texto da paginação derivado dos dados locais (o input rangeLabel é legado). */
  protected readonly showingLabel = computed(() => {
    const pagination = this.pagination();
    if (!pagination || pagination.total === 0) {
      return '';
    }
    const start = (pagination.page - 1) * pagination.page_size + 1;
    const end = Math.min(pagination.page * pagination.page_size, pagination.total);
    return this.i18n.t('guests.showingRange', { start, end, total: pagination.total });
  });

  protected openDetails(entry: GuestListEntry): void {
    this.detailTarget.set(entry);
  }

  protected closeDetails(): void {
    this.detailTarget.set(null);
  }

  protected async copyEmailFromDetails(entry: GuestListEntry): Promise<void> {
    const copied = await this.share.copy(entry.guest.email);
    this.toasts[copied ? 'success' : 'error'](
      this.i18n.t(copied ? 'common.copied' : 'common.copyFailed'),
    );
  }

  protected viewInvitationFromDetails(entry: GuestListEntry): void {
    if (entry.guest.invitationUrl) {
      this.share.openExternal(entry.guest.invitationUrl);
    }
  }

  protected emitGuest(target: { emit(value: Guest): void }, entry: GuestListEntry): void {
    this.closeDetails();
    target.emit(entry.guest);
  }

  protected iconFor(key: string) {
    return ICONS[key as keyof typeof ICONS] ?? ICONS['user'];
  }

  /** Email e/ou telefone (confirmações pelo link aberto podem ter só um). */
  protected contactLine(guest: Guest): string {
    return [guest.email, guest.phone].filter(Boolean).join(' · ');
  }

  /** "Copiar" ao lado do WhatsApp, sempre que há link individual. */
  protected secondaryFor(entry: GuestListEntry): PersonPrimaryAction | null {
    if (!this.permissions().canExport || !entry.guest.invitationUrl || entry.guest.source !== 'personal') {
      return null;
    }
    return this.linkCopy.action();
  }

  protected countFor(filter: GuestFilter): number {
    return this.counts()[filter];
  }

  /** Linhas curtas do cartão, alinhadas com a página global de convidados. */
  protected metaFor(entry: GuestListEntry): PersonMetaItem[] {
    const timezone = entry.event.timezone;
    const meta: PersonMetaItem[] = [
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
    const shared = whatsappSharedLabel(this.i18n, entry.guest.whatsappSharedAt);
    if (shared) {
      meta.push({ icon: 'whatsapp', label: shared });
    }
    if (entry.guest.source === 'public_link') {
      meta.push({ icon: 'globe', label: this.i18n.t('block10.guest.publicLink') });
    }
    return meta;
  }

  protected actionsFor(entry: GuestListEntry): ActionMenuItem[] {
    const items: ActionMenuItem[] = [];
    if (this.permissions().canExport && entry.guest.phone) {
      items.push({ id: 'whatsapp', label: this.i18n.t('guests.whatsapp'), icon: ICONS['whatsapp'] });
    }
    const canEdit = this.permissions().canEditExistingGuests;
    if (canEdit) {
      items.push(
        { id: 'edit', label: this.i18n.t('guests.editAction'), icon: ICONS['pen'] },
        { id: 'resend', label: this.i18n.t('eventDetail.resend'), icon: ICONS['paperPlane'] },
        {
          id: 'link',
          label: this.i18n.t('eventDetail.linkValidityAction'),
          icon: ICONS['link'],
        },
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

  protected onAction(id: string, entry: GuestListEntry): void {
    switch (id) {
      case 'whatsapp':
        this.whatsappGuest.emit(entry.guest);
        break;
      case 'edit':
        this.editGuest.emit(entry.guest);
        break;
      case 'resend':
        this.resendGuest.emit(entry.guest);
        break;
      case 'link':
        this.editGuestLink.emit(entry.guest);
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
    } else if (id === 'copy') {
      void this.linkCopy.copy(entry.guest.invitationUrl);
    }
  }
}
