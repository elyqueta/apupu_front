import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslationKey } from '../../core/i18n/translations';
import { EventStatus } from '../../core/models/models';
import { WorkspaceStore } from '../../core/services/workspace.store';
import { ICONS } from '../../core/ui/icons';
import { EventCardComponent } from '../../shared/components/event-card.component';
import { PageHeaderComponent } from '../../shared/components/page-header.component';
import { StatCardComponent } from '../../shared/components/stat-card.component';
import { StatGridComponent } from '../../shared/components/stat-grid.component';
import { EventDraft, EventDraftsRepository } from '../../core/data/event-drafts.repository';
import { ModalComponent } from '../../shared/components/modal.component';
import { ToastService } from '../../core/services/toast.service';

type EventFilter = 'all' | 'published' | 'draft' | 'completed' | 'drafts';

@Component({
  selector: 'app-events-page',
  imports: [
    RouterLink,
    FaIconComponent,
    EventCardComponent,
    PageHeaderComponent,
    StatCardComponent,
    StatGridComponent,
    ModalComponent,
  ],
  templateUrl: './events.page.html',
})
export class EventsPage {
  protected readonly store = inject(WorkspaceStore);
  protected readonly i18n = inject(I18nService);
  protected readonly icons = ICONS;
  private readonly draftsRepo = inject(EventDraftsRepository);
  private readonly router = inject(Router);
  private readonly toasts = inject(ToastService);

  protected readonly filter = signal<EventFilter>('all');
  protected readonly search = signal('');
  protected readonly drafts = signal<EventDraft[]>([]);
  protected readonly draftsLoading = signal(false);
  protected readonly draftToDelete = signal<EventDraft | null>(null);
  protected readonly deleteBusy = signal(false);

  protected readonly filters: { id: EventFilter; labelKey: TranslationKey }[] = [
    { id: 'all', labelKey: 'events.filter.all' },
    { id: 'published', labelKey: 'events.filter.published' },
    { id: 'draft', labelKey: 'events.filter.draft' },
    { id: 'completed', labelKey: 'events.filter.completed' },
    { id: 'drafts', labelKey: 'block14.drafts.tab' },
  ];

  protected readonly filtered = computed(() => {
    const filter = this.filter();
    if (filter === 'drafts') return [];
    const term = this.search().trim().toLowerCase();
    const events = this.store.events();
    const base = filter === 'all' ? events : events.filter((event) => this.matchesFilter(event.status, filter));
    if (!term) return base;
    return base.filter((event) =>
      [event.title, event.venue, event.city, event.hostName].some((value) =>
        value.toLowerCase().includes(term),
      ),
    );
  });

  protected readonly stats = computed(() => {
    const events = this.store.events();
    const total = events.reduce((sum, event) => sum + (event.stats?.total ?? 0), 0);
    const responded = events.reduce(
      (sum, event) => sum + (event.stats?.confirmed ?? 0) + (event.stats?.declined ?? 0),
      0,
    );
    return {
      events: events.filter((event) => ['published', 'scheduled'].includes(event.status)).length,
      guests: total,
      confirmed: events.reduce((sum, event) => sum + (event.stats?.confirmed ?? 0), 0),
      rate: total === 0 ? 0 : Math.round((responded / total) * 100),
    };
  });

  constructor() {
    void this.loadDrafts();
  }

  protected async loadDrafts(): Promise<void> {
    this.draftsLoading.set(true);
    try {
      this.drafts.set(await this.draftsRepo.list());
    } catch {
      // silencioso
    } finally {
      this.draftsLoading.set(false);
    }
  }

  protected resumeDraft(draft: EventDraft): void {
    void this.router.navigate(['/criar-evento'], { queryParams: { draft: draft.id } });
  }

  protected confirmDeleteDraft(draft: EventDraft): void {
    this.draftToDelete.set(draft);
  }

  protected closeDeleteDraft(): void {
    if (!this.deleteBusy()) this.draftToDelete.set(null);
  }

  protected async deleteDraft(): Promise<void> {
    const draft = this.draftToDelete();
    if (!draft || this.deleteBusy()) return;
    this.deleteBusy.set(true);
    try {
      await this.draftsRepo.remove(draft.id);
      this.drafts.update((list) => list.filter((d) => d.id !== draft.id));
      this.draftToDelete.set(null);
      this.toasts.success(this.i18n.t('block14.drafts.deleted'));
    } catch {
      this.toasts.error(this.i18n.t('common.error'));
    } finally {
      this.deleteBusy.set(false);
    }
  }

  protected draftTitle(draft: EventDraft): string {
    return draft.title?.trim() || this.i18n.t('block14.drafts.untitled');
  }

  private matchesFilter(status: EventStatus, filter: EventFilter): boolean {
    if (filter === 'published') {
      return status === 'published' || status === 'scheduled';
    }
    return status === filter;
  }
}
