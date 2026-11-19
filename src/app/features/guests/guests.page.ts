import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { I18nService } from '../../core/i18n/i18n.service';
import { toApiError } from '../../core/api/api-error';
import { ReportsRepository } from '../../core/data/reports.repository';
import { Guest, HostEvent, RsvpStatus } from '../../core/models/models';
import { DownloadService } from '../../core/services/download.service';
import { ShareService } from '../../core/services/share.service';
import { ToastService } from '../../core/services/toast.service';
import { WorkspaceStore } from '../../core/services/workspace.store';
import { ICONS } from '../../core/ui/icons';
import { ActionMenuComponent, ActionMenuItem } from '../../shared/components/action-menu.component';
import { AvatarComponent } from '../../shared/components/avatar.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog.component';
import { GuestDialogComponent } from '../../shared/components/guest-dialog.component';
import { StatCardComponent } from '../../shared/components/stat-card.component';
import { StatGridComponent } from '../../shared/components/stat-grid.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';

type StatusFilter = 'all' | RsvpStatus;
type GuestEntry = { guest: Guest; event: HostEvent };

@Component({
  selector: 'app-guests-page',
  imports: [
    RouterLink,
    FaIconComponent,
    ActionMenuComponent,
    AvatarComponent,
    ConfirmDialogComponent,
    GuestDialogComponent,
    StatCardComponent,
    StatGridComponent,
    StatusBadgeComponent,
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
  protected readonly dialogOpen = signal(false);
  protected readonly editTarget = signal<Guest | null>(null);
  protected readonly removeTarget = signal<Guest | null>(null);
  protected readonly exporting = signal(false);
  /** Em mobile os filtros começam recolhidos; em `md+` estão sempre visíveis. */
  protected readonly filtersOpen = signal(false);

  protected readonly stats = this.store.globalStats;
  protected readonly entries = this.store.guestsWithEvent;

  /** Quantos filtros (evento/estado) estão ativos, para o badge do botão mobile. */
  protected readonly activeFilterCount = computed(
    () => (this.eventFilter() !== 'all' ? 1 : 0) + (this.statusFilter() !== 'all' ? 1 : 0),
  );

  protected readonly filtered = computed(() => {
    const term = this.search().trim().toLocaleLowerCase(this.i18n.locale());
    const eventId = this.eventFilter();
    const status = this.statusFilter();
    return this.entries()
      .filter((entry) => eventId === 'all' || entry.event.id === eventId)
      .filter((entry) => status === 'all' || entry.guest.status === status)
      .filter((entry) => {
        if (!term) {
          return true;
        }
        return `${entry.guest.name} ${entry.guest.email} ${entry.event.title}`
          .toLocaleLowerCase(this.i18n.locale())
          .includes(term);
      })
      .sort(
        (a, b) => new Date(b.guest.invitedAt).getTime() - new Date(a.guest.invitedAt).getTime(),
      );
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
      const term = params.get('q');
      if (term) {
        this.search.set(term);
      }
    });
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

  /**
   * Ações secundárias do menu "⋯" no cartão mobile. `Editar` e `Remover` só
   * existem para o anfitrião; `Ver evento` está sempre disponível.
   */
  protected menuItems(entry: GuestEntry): ActionMenuItem[] {
    const items: ActionMenuItem[] = [
      { id: 'view', label: this.i18n.t('guests.viewEvent'), icon: ICONS['arrowUpRight'] },
    ];
    if (this.isHostFor(entry.event.id)) {
      items.push(
        { id: 'edit', label: this.i18n.t('guests.editAction'), icon: ICONS['pen'] },
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

  protected onMenuAction(action: string, entry: GuestEntry): void {
    switch (action) {
      case 'view':
        void this.router.navigate(['/eventos', entry.event.id]);
        break;
      case 'edit':
        this.openEdit(entry.guest);
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
    } catch (error: unknown) {
      this.toasts.error(toApiError(error).message);
    }
  }
}
