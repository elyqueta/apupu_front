import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { Pagination } from '../../core/api/api.models';
import { toApiError } from '../../core/api/api-error';
import { GuestListEntry, GuestsQuery } from '../../core/data/guests.repository';
import { ReportsRepository } from '../../core/data/reports.repository';
import { Guest, RsvpStatus } from '../../core/models/models';
import { I18nService } from '../../core/i18n/i18n.service';
import { DownloadService } from '../../core/services/download.service';
import { ShareService } from '../../core/services/share.service';
import { ToastService } from '../../core/services/toast.service';
import { WorkspaceStore } from '../../core/services/workspace.store';
import { ICONS } from '../../core/ui/icons';
import { ActionMenuItem } from '../../shared/components/action-menu.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog.component';
import { GuestDialogComponent } from '../../shared/components/guest-dialog.component';
import { MobileFabComponent } from '../../shared/components/mobile-fab.component';
import { PageHeaderComponent } from '../../shared/components/page-header.component';
import { PersonCardComponent, PersonMetaItem, PersonPrimaryAction } from '../../shared/components/person-card.component';
import { SkeletonComponent } from '../../shared/components/skeleton.component';
import { StatCardComponent } from '../../shared/components/stat-card.component';
import { StatGridComponent } from '../../shared/components/stat-grid.component';
import { whatsappSharedLabel } from '../../shared/services/whatsapp-share.presenter';

type StatusFilter = 'all' | RsvpStatus;

const PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 300;

/**
 * Lista global de convidados.
 *
 * A pesquisa, o filtro de estado, o filtro de evento e a paginação são feitos
 * no servidor (`GET /host/guests`), para que a página nunca mostre apenas os
 * 10 registos já carregados. Pedidos antigos são ignorados por número de
 * sequência quando o utilizador escreve rapidamente.
 */
@Component({
  selector: 'app-guests-page',
  imports: [
    FaIconComponent,
    ConfirmDialogComponent,
    GuestDialogComponent,
    MobileFabComponent,
    PageHeaderComponent,
    PersonCardComponent,
    SkeletonComponent,
    StatCardComponent,
    StatGridComponent,
  ],
  templateUrl: './guests.page.html',
})
export class GuestsPage {
  protected readonly store = inject(WorkspaceStore);
  protected readonly i18n = inject(I18nService);
  protected readonly icons = ICONS;
  private readonly toasts = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly share = inject(ShareService);
  private readonly reports = inject(ReportsRepository);
  private readonly downloads = inject(DownloadService);

  protected readonly search = signal('');
  protected readonly eventFilter = signal('all');
  protected readonly statusFilter = signal<StatusFilter>('all');
  protected readonly page = signal(1);
  protected readonly items = signal<GuestListEntry[]>([]);
  protected readonly pagination = signal<Pagination | null>(null);
  protected readonly listLoading = signal(true);
  protected readonly listError = signal('');
  protected readonly dialogOpen = signal(false);
  protected readonly editTarget = signal<Guest | null>(null);
  protected readonly removeTarget = signal<Guest | null>(null);
  protected readonly exporting = signal(false);
  /** Em mobile os filtros começam recolhidos; em `md+` estão sempre visíveis. */
  protected readonly filtersOpen = signal(false);

  protected readonly stats = this.store.globalStats;

  private requestSeq = 0;
  private debounce: ReturnType<typeof setTimeout> | null = null;

  /** Quantos filtros (evento/estado) estão ativos, para o badge do botão mobile. */
  protected readonly activeFilterCount = computed(
    () => (this.eventFilter() !== 'all' ? 1 : 0) + (this.statusFilter() !== 'all' ? 1 : 0),
  );

  protected readonly hasFilters = computed(
    () =>
      this.search().trim() !== '' ||
      this.eventFilter() !== 'all' ||
      this.statusFilter() !== 'all',
  );

  protected readonly rangeLabel = computed(() => {
    const pagination = this.pagination();
    if (!pagination || pagination.total === 0) {
      return '';
    }
    const start = (pagination.page - 1) * pagination.page_size + 1;
    const end = Math.min(pagination.page * pagination.page_size, pagination.total);
    return `${start}–${end} / ${pagination.total}`;
  });

  protected readonly statusOptions: Array<{
    id: StatusFilter;
    labelKey: 'guests.filterAllStatus' | 'status.confirmed' | 'status.pending' | 'status.declined';
  }> = [
    { id: 'all', labelKey: 'guests.filterAllStatus' },
    { id: 'confirmed', labelKey: 'status.confirmed' },
    { id: 'pending', labelKey: 'status.pending' },
    { id: 'declined', labelKey: 'status.declined' },
  ];

  constructor() {
    this.store.load({ guests: true, events: true, dashboard: true });
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const term = params.get('q')?.trim() ?? '';
      if (term && term !== this.search()) {
        this.search.set(term);
        this.page.set(1);
        void this.load();
      }
    });
    void this.load();
    this.destroyRef.onDestroy(() => {
      if (this.debounce) {
        clearTimeout(this.debounce);
      }
    });
  }

  protected async load(): Promise<void> {
    const seq = ++this.requestSeq;
    this.listLoading.set(true);
    this.listError.set('');
    const query: GuestsQuery = {
      event_id: this.eventFilter() === 'all' ? undefined : this.eventFilter(),
      status: this.statusFilter(),
      q: this.search().trim() || undefined,
      page: this.page(),
      page_size: PAGE_SIZE,
    };
    try {
      const result = await this.store.guestsPage(query);
      if (seq !== this.requestSeq) {
        return;
      }
      const timezoneByEvent = new Map(this.store.events().map((event) => [event.id, event.timezone]));
      this.items.set(
        result.items.map((entry) => ({
          ...entry,
          event: { ...entry.event, timezone: timezoneByEvent.get(entry.event.id) ?? 'Africa/Luanda' },
        })),
      );
      this.pagination.set(result.pagination);
    } catch (error: unknown) {
      if (seq === this.requestSeq) {
        this.items.set([]);
        this.listError.set(toApiError(error).message);
      }
    } finally {
      if (seq === this.requestSeq) {
        this.listLoading.set(false);
      }
    }
  }

  protected onSearch(value: string): void {
    this.search.set(value);
    this.page.set(1);
    if (this.debounce) {
      clearTimeout(this.debounce);
    }
    this.debounce = setTimeout(() => void this.load(), SEARCH_DEBOUNCE_MS);
  }

  protected setEventFilter(value: string): void {
    this.eventFilter.set(value);
    this.page.set(1);
    void this.load();
  }

  protected setStatusFilter(value: StatusFilter): void {
    this.statusFilter.set(value);
    this.page.set(1);
    void this.load();
  }

  protected goToPage(value: number): void {
    const pagination = this.pagination();
    if (!pagination || value < 1 || value > pagination.total_pages || value === this.page()) {
      return;
    }
    this.page.set(value);
    void this.load();
  }

  protected async resend(guest: Guest): Promise<void> {
    try {
      if (await this.store.sendReminder(guest.id)) {
        this.toasts.success(this.i18n.t('guests.resent', { name: guest.name }));
      }
    } catch (error: unknown) {
      this.toasts.error(toApiError(error).message);
    }
  }

  /** Exporta em CSV a lista do evento selecionado no filtro. */
  protected async exportGuests(): Promise<void> {
    const eventId = this.eventFilter();
    if (eventId === 'all' || this.exporting()) {
      return;
    }

    this.exporting.set(true);

    try {
      const file = await this.reports.exportEvent(eventId, 'guests', 'csv');
      this.downloads.save(file, 'conto-contigo-convidados.csv');
      this.toasts.success(this.i18n.t('guests.exported'));
    } catch (error: unknown) {
      this.toasts.error(toApiError(error).message);
    } finally {
      this.exporting.set(false);
    }
  }

  /** Ações de convite (reenviar, WhatsApp, remover) são do anfitrião. */
  protected isHostFor(eventId: string): boolean {
    return this.store.isEventHost(eventId);
  }

  protected openCreate(): void {
    this.editTarget.set(null);
    this.dialogOpen.set(true);
  }

  protected openEdit(guest: Guest): void {
    this.editTarget.set(guest);
  }

  protected closeGuestDialog(): void {
    this.dialogOpen.set(false);
    this.editTarget.set(null);
  }

  /** Linhas curtas do cartão: mensagem do convidado, evento, abertura, convite e resposta. */
  protected metaFor(entry: GuestListEntry): PersonMetaItem[] {
    const meta: PersonMetaItem[] = [
      { icon: 'calendar', label: `${entry.event.title} · ${i18nDate(this.i18n, entry.event.startsAt, entry.event.timezone)}` },
      {
        icon: 'envelopeOpen',
        label: entry.guest.openedAt
          ? `${this.i18n.t('guests.opened')} · ${this.i18n.relative(entry.guest.openedAt)}`
          : this.i18n.t('guests.notOpened'),
      },
      { icon: 'clock', label: `${this.i18n.t('guests.tableInvited')}: ${this.i18n.shortDate(entry.guest.invitedAt, entry.event.timezone)}` },
      {
        icon: 'check',
        label: entry.guest.respondedAt
          ? `${this.i18n.t('guests.responded')}: ${this.i18n.relative(entry.guest.respondedAt)}`
          : this.i18n.t('guests.notResponded'),
      },
    ];
    const shared = whatsappSharedLabel(this.i18n, entry.guest.whatsappSharedAt);
    if (shared) {
      meta.push({ icon: 'whatsapp', label: shared });
    }
    return meta;
  }

  protected actionsFor(entry: GuestListEntry): ActionMenuItem[] {
    const items: ActionMenuItem[] = [
      { id: 'view', label: this.i18n.t('guests.viewEvent'), icon: ICONS['arrowUpRight'] },
    ];
    if (this.isHostFor(entry.event.id)) {
      items.push(
        { id: 'edit', label: this.i18n.t('guests.editAction'), icon: ICONS['pen'] },
        { id: 'resend', label: this.i18n.t('eventDetail.resend'), icon: ICONS['paperPlane'] },
        {
          id: 'remove',
          label: this.i18n.t('guests.remove'),
          icon: ICONS['trash'],
          tone: 'danger',
        },
      );
    }
    return items;
  }

  protected primaryFor(entry: GuestListEntry): PersonPrimaryAction | null {
    if (!this.isHostFor(entry.event.id) || !entry.guest.phone) {
      return null;
    }
    return {
      id: 'whatsapp',
      label: this.i18n.t('guests.whatsappShort'),
      icon: ICONS['whatsapp'],
      hint: this.i18n.t('guests.whatsapp'),
    };
  }

  protected onPrimary(action: string, entry: GuestListEntry): void {
    if (action === 'whatsapp') {
      this.forwardWhatsApp(entry.guest, entry.event.title);
    }
  }

  protected onMenuAction(action: string, entry: GuestListEntry): void {
    switch (action) {
      case 'view':
        void this.router.navigate(['/eventos', entry.event.id]);
        break;
      case 'edit':
        this.openEdit(entry.guest);
        break;
      case 'resend':
        void this.resend(entry.guest);
        break;
      case 'remove':
        this.removeTarget.set(entry.guest);
        break;
      default:
        break;
    }
  }

  /**
   * Abre o WhatsApp (`wa.me`) com a mensagem de reencaminhamento do convite.
   *
   * O link individual vem de `invitation_url`; se o convite estiver
   * revogado a API devolve `null` e a mensagem segue sem link.
   */
  protected forwardWhatsApp(guest: Guest, eventTitle: string): void {
    const key = guest.invitationUrl ? 'guests.whatsappMessageWithLink' : 'guests.whatsappMessage';
    const text = this.i18n.t(key, {
      name: guest.name,
      event: eventTitle,
      url: guest.invitationUrl ?? '',
    });
    const url = this.share.whatsappUrl(guest.phone, text);
    if (url) {
      this.share.openExternal(url);
      void this.recordShare(guest);
    }
  }

  /** Actualiza a lista sem recarregar; um erro de registo não impede novo envio. */
  private async recordShare(guest: Guest): Promise<void> {
    if (!guest.invitationUrl) {
      return;
    }
    try {
      const updated = await this.store.markWhatsappShared(guest);
      this.items.update((items) =>
        items.map((entry) => (entry.guest.id === updated.id ? { ...entry, guest: updated } : entry)),
      );
    } catch {
      // A partilha no WhatsApp já foi aberta; não mostrar erro ao anfitrião.
    }
  }

  protected async confirmRemove(): Promise<void> {
    const guest = this.removeTarget();
    if (!guest) {
      return;
    }
    try {
      await this.store.removeGuest(guest.id);
      this.removeTarget.set(null);
      this.toasts.success(this.i18n.t('guests.removed'));
      await this.load();
    } catch (error: unknown) {
      this.toasts.error(toApiError(error).message);
    }
  }
}

function i18nDate(i18n: I18nService, value: string | null, timezone: string): string {
  return value ? i18n.shortDate(value, timezone) : '—';
}
