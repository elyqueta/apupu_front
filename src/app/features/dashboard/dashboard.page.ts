import { Component, computed, ElementRef, inject, signal, viewChild } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { guestPlural } from '../../core/i18n/block15-keys';
import { I18nService } from '../../core/i18n/i18n.service';
import { toApiError } from '../../core/api/api-error';
import { TranslationKey } from '../../core/i18n/translations';
import { EventActivity, Guest, HostEvent, RsvpStatus } from '../../core/models/models';
import { ShareService } from '../../core/services/share.service';
import { ToastService } from '../../core/services/toast.service';
import { WorkspaceStore } from '../../core/services/workspace.store';
import { EVENT_TYPE_ICONS, ICONS } from '../../core/ui/icons';
import { ActivityPresenter } from '../../shared/services/activity.presenter';
import { whatsappSharedLabel } from '../../shared/services/whatsapp-share.presenter';
import { ActionMenuItem } from '../../shared/components/action-menu.component';
import { AvatarComponent } from '../../shared/components/avatar.component';
import { EventCardComponent } from '../../shared/components/event-card.component';
import {
  PersonCardComponent,
  PersonMetaItem,
  PersonPrimaryAction,
} from '../../shared/components/person-card.component';
import { StatCardComponent } from '../../shared/components/stat-card.component';
import { SkeletonComponent } from '../../shared/components/skeleton.component';
import { StatGridComponent } from '../../shared/components/stat-grid.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';
import { TemplateArtworkComponent } from '../../shared/components/template-artwork.component';

interface ChartDay {
  label: string;
  value: number;
  /** Altura proporcional ao máximo da semana, em unidades do viewBox. */
  height: number;
  ariaLabel: string;
}

interface GuestEntry {
  guest: Guest;
  event: HostEvent;
}

@Component({
  selector: 'app-dashboard-page',
  imports: [
    RouterLink,
    FaIconComponent,
    AvatarComponent,
    EventCardComponent,
    PersonCardComponent,
    StatCardComponent,
    StatGridComponent,
    SkeletonComponent,
    StatusBadgeComponent,
    TemplateArtworkComponent,
  ],
  templateUrl: './dashboard.page.html',
})
export class DashboardPage {
  protected readonly store = inject(WorkspaceStore);
  protected readonly i18n = inject(I18nService);
  protected readonly icons = ICONS;
  protected readonly Math = Math;
  private readonly toasts = inject(ToastService);
  private readonly share = inject(ShareService);
  private readonly router = inject(Router);
  private readonly activityPresenter = inject(ActivityPresenter);

  constructor() {
    // O painel agrega praticamente todos os domínios.
    this.store.load({
      dashboard: true,
      events: true,
      tasks: true,
      guests: true,
      activity: true,
    });
  }

  protected readonly stats = this.store.globalStats;
  protected readonly nextEvent = this.store.nextEvent;
  protected readonly taskProgress = this.store.taskProgress;
  protected readonly recentEvents = computed(() => this.store.recentEvents().slice(0, 4));
  protected readonly tasks = computed(() => this.store.tasks().slice(0, 4));
  protected readonly activity = computed(() => this.store.activityFeed().slice(0, 5));
  protected readonly guestStatusFilter = signal<RsvpStatus>('pending');
  protected readonly carouselIndex = signal(1);
  /** Cada painel agrupa até três convidados; a grelha adapta-se a 1/2/3 colunas. */
  private readonly carouselPageSize = 3;
  protected readonly activeDay = signal<number | null>(null);
  private readonly guestCarousel = viewChild<ElementRef<HTMLUListElement>>('guestCarousel');

  protected readonly filters: { id: RsvpStatus; labelKey: TranslationKey }[] = [
    { id: 'confirmed', labelKey: 'dashboard.statusConfirmed' },
    { id: 'declined', labelKey: 'dashboard.statusDeclined' },
    { id: 'pending', labelKey: 'dashboard.statusNoResponse' },
  ];

  /** Convites do próximo evento (ou todos, quando não há próximo). */
  private readonly scopedEntries = computed<GuestEntry[]>(() => {
    const event = this.nextEvent();
    return this.store
      .guestsWithEvent()
      .filter((entry) => !event || entry.event.id === event.id);
  });

  protected readonly statusCounts = computed<Record<RsvpStatus, number>>(() => {
    const entries = this.scopedEntries();
    return {
      confirmed: entries.filter((entry) => entry.guest.status === 'confirmed').length,
      declined: entries.filter((entry) => entry.guest.status === 'declined').length,
      pending: entries.filter((entry) => entry.guest.status === 'pending').length,
    };
  });

  protected readonly filteredGuests = computed(() =>
    this.scopedEntries()
      .filter((entry) => entry.guest.status === this.guestStatusFilter())
      .slice(0, 6),
  );

  /** Agrupa os convidados em painéis de até três cartões lineares. */
  protected readonly guestPages = computed<GuestEntry[][]>(() => {
    const entries = this.filteredGuests();
    const pages: GuestEntry[][] = [];
    for (let index = 0; index < entries.length; index += this.carouselPageSize) {
      pages.push(entries.slice(index, index + this.carouselPageSize));
    }
    return pages;
  });

  protected readonly carouselPages = computed(() => Math.max(1, this.guestPages().length));

  protected readonly firstName = computed(() => this.store.profile().name.split(' ')[0]);
  protected readonly greeting = computed(() => {
    const hour = new Date().getHours();
    const key =
      hour >= 5 && hour < 12
        ? 'block15.greeting.morning'
        : hour >= 12 && hour < 19
          ? 'block15.greeting.afternoon'
          : 'block15.greeting.evening';
    return this.i18n.t(key as TranslationKey, { name: this.firstName() });
  });
  protected readonly guestNames = computed(() =>
    this.store
      .guests()
      .filter((guest) => guest.status === 'confirmed')
      .slice(0, 4)
      .map((guest) => guest.name),
  );

  protected readonly countdown = computed(() => {
    const event = this.nextEvent();
    if (!event) {
      return { days: 0, hours: 0, minutes: 0 };
    }
    const distance = Math.max(0, new Date(event.startsAt).getTime() - Date.now());
    return {
      days: Math.floor(distance / 86_400_000),
      hours: Math.floor((distance % 86_400_000) / 3_600_000),
      minutes: Math.floor((distance % 3_600_000) / 60_000),
    };
  });

  protected readonly nextEventStats = computed(() => {
    const event = this.nextEvent();
    return event ? this.store.eventStats(event.id) : null;
  });

  protected readonly pendingCount = computed(() => {
    const event = this.nextEvent();
    if (event && this.nextEventStats()) {
      return this.nextEventStats()!.pending;
    }
    return this.stats().pending;
  });

  protected readonly week = computed<ChartDay[]>(() => {
    const today = new Date();
    const days = Array.from({ length: 7 }, (_, index) => {
      const day = new Date(today);
      day.setHours(0, 0, 0, 0);
      day.setDate(day.getDate() - (6 - index));
      const end = new Date(day);
      end.setDate(end.getDate() + 1);
      const value = this.store.guests().filter((guest) => {
        if (!guest.respondedAt) {
          return false;
        }
        const at = new Date(guest.respondedAt).getTime();
        return at >= day.getTime() && at < end.getTime();
      }).length;
      return { date: day, value };
    });
    const max = Math.max(...days.map((day) => day.value), 1);
    return days.map((day) => {
      const label = this.i18n.weekdayShort(day.date, 'Africa/Luanda');
      return {
        label,
        value: day.value,
        // O dia com mais respostas usa toda a altura útil; zero é só a linha de base.
        height: day.value === 0 ? 0 : Math.max(3, Math.round((day.value / max) * 34)),
        ariaLabel: this.i18n.t('block9.dashboard.chartTooltip', {
          day: label,
          date: this.i18n.shortDate(day.date, 'Africa/Luanda'),
          count: day.value,
        }),
      };
    });
  });

  protected readonly activeChartDay = computed(() => {
    const index = this.activeDay();
    return index === null ? null : (this.week()[index] ?? null);
  });

  protected setActiveDay(index: number | null): void {
    this.activeDay.set(index);
  }

  protected readonly typeIcon = computed<IconDefinition>(() => {
    const event = this.nextEvent();
    return event && event.type ? (EVENT_TYPE_ICONS[event.type] ?? ICONS['star']) : ICONS['star'];
  });

  protected readonly typeLabel = computed(() => {
    const event = this.nextEvent();
    return event ? this.i18n.t(`type.${event.type}` as TranslationKey) : '';
  });

  protected taskLabel(label: string): string {
    return label;
  }

  protected activityText(item: EventActivity, event: HostEvent): string {
    return this.activityPresenter.text(item, event.title);
  }

  protected activityIcon(kind: EventActivity['kind']): IconDefinition {
    return this.activityPresenter.icon(kind);
  }

  protected activityTone(kind: EventActivity['kind']): string {
    return this.activityPresenter.tone(kind);
  }

  protected setFilter(status: RsvpStatus): void {
    this.guestStatusFilter.set(status);
    this.carouselIndex.set(1);
    this.guestCarousel()?.nativeElement.scrollTo({ left: 0, behavior: 'smooth' });
  }

  /** Mantém a contagem "1 de N" sincronizada com o scroll por toque/rato. */
  protected onCarouselScroll(): void {
    const element = this.guestCarousel()?.nativeElement;
    if (!element) {
      return;
    }
    // Cada <li> ocupa exatamente a largura visível: um painel = clientWidth.
    const pageWidth = element.clientWidth;
    if (pageWidth > 0) {
      const page = Math.round(element.scrollLeft / pageWidth) + 1;
      this.carouselIndex.set(Math.min(this.carouselPages(), Math.max(1, page)));
    }
  }

  /** Setas do desktop e setas do teclado partilham o mesmo passo de scroll. */
  protected moveCarousel(direction: -1 | 1): void {
    const element = this.guestCarousel()?.nativeElement;
    if (!element) {
      return;
    }
    const target = Math.min(this.carouselPages(), Math.max(1, this.carouselIndex() + direction));
    this.carouselIndex.set(target);
    element.scrollTo({ left: (target - 1) * element.clientWidth, behavior: 'smooth' });
  }

  protected onCarouselKeydown(event: KeyboardEvent): void {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
      return;
    }
    event.preventDefault();
    this.moveCarousel(event.key === 'ArrowRight' ? 1 : -1);
  }

  protected filterClass(status: RsvpStatus): string {
    // shrink-0 mantém os três filtros na mesma linha (o contentor faz scroll).
    const base = 'ui-chip-interactive shrink-0';
    if (this.guestStatusFilter() !== status) {
      return `${base} border-line bg-surface-raised text-muted`;
    }
    if (status === 'confirmed') {
      return `${base} border-mint/40 bg-mint/15 text-mint`;
    }
    if (status === 'declined') {
      return `${base} border-coral/40 bg-coral/15 text-coral`;
    }
    return `${base} border-amber/40 bg-amber/15 text-amber`;
  }

  protected subtitleFor(guest: Guest): string {
    return guest.email || guest.phone || '';
  }

  protected metaFor(entry: GuestEntry): PersonMetaItem[] {
    const days = Math.max(
      0,
      Math.floor((Date.now() - new Date(entry.guest.invitedAt).getTime()) / 86_400_000),
    );
    const meta: PersonMetaItem[] = [
      { icon: 'calendar', label: entry.event.title },
      { icon: 'clock', label: this.i18n.t('block9.dashboard.invitedDays', { count: days }) },
    ];
    const shared = whatsappSharedLabel(this.i18n, entry.guest.whatsappSharedAt);
    if (shared) {
      meta.push({ icon: 'whatsapp', label: shared });
    }
    return meta;
  }

  protected primaryFor(entry: GuestEntry): PersonPrimaryAction {
    const items = this.guestActions(entry);
    const preferred = entry.guest.phone
      ? items.find((item) => item.id === 'whatsapp')
      : items.find((item) => item.id === 'resend');
    const action = preferred ?? items[0];
    return {
      id: action.id,
      label: action.label,
      icon: action.icon,
      disabled: action.disabled,
    };
  }

  /** Ações do cartão: WhatsApp e reenvio visíveis, navegação sempre no menu. */
  protected guestActions(entry: GuestEntry): ActionMenuItem[] {
    const items: ActionMenuItem[] = [
      { id: 'view', label: this.i18n.t('guests.viewEvent'), icon: ICONS['arrowUpRight'] },
    ];
    if (this.store.isEventHost(entry.event.id)) {
      items.unshift({
        id: 'resend',
        label: this.i18n.t('dashboard.resendEmail'),
        icon: ICONS['envelope'],
      });
    }
    if (entry.guest.phone) {
      items.unshift({
        id: 'whatsapp',
        label: this.i18n.t('guests.whatsappShort'),
        icon: ICONS['whatsapp'],
      });
    }
    return items;
  }

  protected onGuestAction(action: string, entry: GuestEntry): void {
    if (action === 'resend') {
      void this.resendEmail(entry.guest);
    } else if (action === 'whatsapp') {
      this.sendWhatsApp(entry);
    } else if (action === 'view') {
      void this.router.navigate(['/eventos', entry.event.id]);
    }
  }

  protected sendWhatsApp(entry: GuestEntry): void {
    const plural = guestPlural(entry.guest.guestKind);
    const key = entry.guest.invitationUrl
      ? plural ? 'block15.guests.whatsappMessageWithLinkPlural' : 'guests.whatsappMessageWithLink'
      : plural ? 'block15.guests.whatsappMessagePlural' : 'guests.whatsappMessage';
    const text = this.i18n.t(key, {
      name: entry.guest.name,
      event: entry.event.title,
      url: entry.guest.invitationUrl ?? '',
    });
    const url = this.share.whatsappUrl(entry.guest.phone, text);
    if (url) {
      this.share.openExternal(url);
      this.recordShare(entry.guest);
    } else {
      this.toasts.error(this.i18n.t('guests.whatsappUnavailable'));
    }
  }

  /** Só existe convidado específico quando há link individual; falha de registo não bloqueia o envio. */
  private recordShare(guest: Guest): void {
    if (!guest.invitationUrl) {
      return;
    }
    void this.store.markWhatsappShared(guest).catch(() => undefined);
  }

  protected retry(): void {
    void this.store.retry();
  }

  protected async resendEmail(guest: Guest): Promise<void> {
    try {
      if (await this.store.sendReminder(guest.id)) {
        this.toasts.success(this.i18n.t('guests.resent', { name: guest.name }));
      }
    } catch (error: unknown) {
      this.toasts.error(toApiError(error).message);
    }
  }

  protected openManagement(eventId: string): void {
    void this.router.navigate(['/eventos', eventId]);
  }

  protected async toggleTask(taskId: string): Promise<void> {
    try {
      await this.store.toggleTask(taskId);
    } catch (error: unknown) {
      this.toasts.error(toApiError(error).message);
    }
  }
}
